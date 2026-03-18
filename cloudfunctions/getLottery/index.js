// cloudfunctions/getLottery/index.js
// 抽奖云函数：使用原子操作防止重复抽奖

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const usersCollection = db.collection('users');

/**
 * 生成VIP卡号：XJTU-XXXXXX（6位随机数字）
 */
function generateCardNumber() {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `XJTU-${num}`;
}

/**
 * 为跳过登录的用户自动创建访客记录
 */
async function createGuestUser(openid, giftType) {
  const cardNumber = generateCardNumber();
  const now = db.serverDate();
  await usersCollection.add({
    data: {
      _openid: openid,
      phoneNumber: '',
      cardNumber,
      couponAmount: 10,
      giftType: giftType || 'gift1',
      hasLottery: false,
      lotteryAmount: 0,
      lotteryTime: null,
      createTime: now,
      updateTime: now
    }
  });
  return { cardNumber, couponAmount: 10 };
}

/**
 * 随机生成抽奖金额（对应转盘6个固定扇区）
 * - 60% 概率：¥10
 * - 15% 概率：¥30
 * - 10% 概率：¥50
 * -  8% 概率：¥100
 * -  5% 概率：¥200
 * -  2% 概率：¥500
 */
function generateLotteryAmount() {
  const rand = Math.random() * 100;
  if (rand < 60) return 10;
  if (rand < 75) return 30;
  if (rand < 85) return 50;
  if (rand < 93) return 100;
  if (rand < 98) return 200;
  return 500;
}

/**
 * 主函数入口（openid由云函数自动获取）
 * @returns {Object} - { code: 0|1|-1, data: { lotteryAmount, couponAmount, cardNumber } }
 *   code: 0=成功, 1=已抽过奖, -1=错误
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: -1, message: '无法获取用户标识' };
  }

  // 先查询用户是否存在且已授权手机号
  const userQuery = await usersCollection.where({ _openid: openid }).get();
  if (!userQuery.data || userQuery.data.length === 0) {
    return { code: -1, message: '请先授权登录后参与抽奖' };
  }
  const user = userQuery.data[0];
  if (!user.phoneNumber) {
    return { code: -1, message: '请先授权手机号后参与抽奖' };
  }

  // 检查是否已抽过奖
  if (user.hasLottery) {
    return {
      code: 1,
      message: '您已参与过抽奖',
      data: {
        lotteryAmount: user.lotteryAmount,
        couponAmount: user.couponAmount,
        cardNumber: user.cardNumber
      }
    };
  }

  // 生成抽奖金额
  const lotteryAmount = generateLotteryAmount();
  const newCouponAmount = user.couponAmount + lotteryAmount;

  // 原子操作：仅当 hasLottery === false 时才更新（防并发重复抽奖）
  const updateResult = await usersCollection
    .where({
      _openid: openid,
      hasLottery: false  // 原子条件：确保只更新一次
    })
    .update({
      data: {
        hasLottery: true,
        lotteryAmount,
        couponAmount: newCouponAmount,
        lotteryTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

  // 检查是否真正更新成功（updated > 0 表示原子操作成功）
  if (updateResult.stats && updateResult.stats.updated > 0) {
    return {
      code: 0,
      message: '抽奖成功',
      data: {
        lotteryAmount,
        couponAmount: newCouponAmount,
        cardNumber: user.cardNumber
      }
    };
  } else {
    // 原子操作未更新到数据，说明并发情况下已被更新
    const updatedUser = await usersCollection.where({ _openid: openid }).get();
    const latestUser = updatedUser.data[0];
    return {
      code: 1,
      message: '您已参与过抽奖',
      data: {
        lotteryAmount: latestUser.lotteryAmount,
        couponAmount: latestUser.couponAmount,
        cardNumber: latestUser.cardNumber
      }
    };
  }
};
