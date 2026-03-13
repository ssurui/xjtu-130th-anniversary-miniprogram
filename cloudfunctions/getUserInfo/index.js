// cloudfunctions/getUserInfo/index.js
// 获取当前用户的VIP卡信息

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

/**
 * 主函数入口（openid由云函数自动获取）
 * @returns {Object} - { code: 0|1, data: { cardNumber, couponAmount, hasLottery, lotteryAmount, giftType } }
 *   code: 0=成功, 1=用户未登录/不存在
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 1, message: '无法获取用户标识' };
  }

  // 查询用户记录
  const userQuery = await usersCollection.where({ _openid: openid }).get();

  if (!userQuery.data || userQuery.data.length === 0) {
    // 用户未登录/不存在
    return { code: 1, message: '用户未登录' };
  }

  const user = userQuery.data[0];

  return {
    code: 0,
    data: {
      cardNumber: user.cardNumber,
      couponAmount: user.couponAmount,
      hasLottery: user.hasLottery,
      lotteryAmount: user.lotteryAmount || 0,
      giftType: user.giftType || 'gift1',
      phoneNumber: user.phoneNumber
    }
  };
};
