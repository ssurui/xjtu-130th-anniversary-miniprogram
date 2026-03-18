// cloudfunctions/login/index.js
// 一键登录云函数：获取openid + 解密手机号 + 创建/查找用户记录

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

/**
 * 生成VIP卡号：XJTU-XXXXXX（6位随机数字）
 */
function generateCardNumber() {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `XJTU-${num}`;
}

/**
 * 生成唯一卡号（最多重试5次）
 */
async function generateUniqueCardNumber() {
  for (let i = 0; i < 5; i++) {
    const cardNumber = generateCardNumber();
    const existing = await usersCollection.where({ cardNumber }).count();
    if (existing.total === 0) {
      return cardNumber;
    }
  }
  // 极小概率情况下仍冲突，使用时间戳保证唯一性
  return `XJTU-${Date.now().toString().slice(-6)}`;
}

/**
 * 主函数入口
 * @param {Object} event - { phoneCode: String, giftType: String }
 * @returns {Object} - { code: 0, data: { cardNumber, couponAmount, hasLottery, phoneNumber, isNewUser } }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: -1, message: '无法获取用户标识' };
  }

  const { phoneCode, giftType = 'gift1' } = event;

  // 解密手机号（需要phoneCode）
  let phoneNumber = '';
  if (phoneCode) {
    console.log('收到 phoneCode，开始解密手机号');
    try {
      const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({
        code: phoneCode
      });
      console.log('getPhoneNumber 结果：', JSON.stringify(phoneResult));
      phoneNumber = phoneResult.phoneInfo && phoneResult.phoneInfo.phoneNumber || '';
      console.log('解密得到手机号：', phoneNumber ? '成功' : '为空');
    } catch (err) {
      console.error('手机号解密失败，错误码：', err.errCode, '错误信息：', err.errMsg, '完整错误：', JSON.stringify(err));
      return { code: -1, message: `手机号获取失败(${err.errCode || err.message})` };
    }
  } else {
    console.log('无 phoneCode，创建/查找访客记录');
  }

  // 查找现有用户记录
  const existingUser = await usersCollection.where({ _openid: openid }).get();

  if (existingUser.data && existingUser.data.length > 0) {
    // 去重：多条记录时保留最完整的一条（优先已抽奖、有手机号、礼券最多）
    let user = existingUser.data[0];
    if (existingUser.data.length > 1) {
      user = existingUser.data.reduce((best, cur) => {
        if (cur.hasLottery && !best.hasLottery) return cur;
        if (!cur.hasLottery && best.hasLottery) return best;
        if (cur.phoneNumber && !best.phoneNumber) return cur;
        if (cur.couponAmount > best.couponAmount) return cur;
        return best;
      });
      // 删除多余记录
      const deleteIds = existingUser.data.filter(r => r._id !== user._id).map(r => r._id);
      await Promise.all(deleteIds.map(id => usersCollection.doc(id).remove()));
    }

    // 更新手机号（如果有新的）
    if (phoneNumber && user.phoneNumber !== phoneNumber) {
      await usersCollection.doc(user._id).update({
        data: {
          phoneNumber,
          updateTime: db.serverDate()
        }
      });
    }
    return {
      code: 0,
      data: {
        cardNumber: user.cardNumber,
        couponAmount: user.couponAmount,
        hasLottery: user.hasLottery,
        phoneNumber: phoneNumber || user.phoneNumber,
        isNewUser: false
      }
    };
  }

  // 新用户，创建记录
  const cardNumber = await generateUniqueCardNumber();
  const now = db.serverDate();

  const newUser = {
    phoneNumber,
    cardNumber,
    couponAmount: 10,       // 初始礼券10元
    giftType,               // 礼品类型（来自扫码scene参数）
    hasLottery: false,      // 未抽奖
    lotteryAmount: 0,       // 抽奖金额
    lotteryTime: null,      // 抽奖时间
    createTime: now,
    updateTime: now
  };

  await usersCollection.add({ data: newUser });

  return {
    code: 0,
    data: {
      cardNumber,
      couponAmount: 10,
      hasLottery: false,
      phoneNumber,
      isNewUser: true
    }
  };
};
