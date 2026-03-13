// pages/index/index.js
// 首页逻辑：展示VIP卡、礼品信息、抽奖入口

const app = getApp();

Page({
  data: {
    // VIP卡数据
    cardNumber: 'XJTU-000000',  // 未登录显示默认值
    couponAmount: 10,             // 未登录显示初始额度
    hasLottery: false,
    isLoggedIn: false,
    // 礼品类型
    giftType: 'gift1',
    // 加载状态
    loading: false
  },

  onShow() {
    // 每次页面显示时刷新VIP卡数据（REQ-010）
    this.loadUserInfo();
    // 同步礼品类型
    this.setData({
      giftType: app.globalData.giftType || 'gift1'
    });
  },

  /**
   * 调用 getUserInfo 云函数刷新用户VIP卡数据
   */
  loadUserInfo() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {}
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        // 用户已登录，更新显示数据
        this.setData({
          cardNumber: result.data.cardNumber,
          couponAmount: result.data.couponAmount,
          hasLottery: result.data.hasLottery,
          isLoggedIn: true,
          loading: false
        });
        // 更新全局登录状态
        app.globalData.isLoggedIn = true;
        app.globalData.userInfo = result.data;
      } else {
        // 用户未登录（code === 1）
        this.setData({
          cardNumber: 'XJTU-000000',
          couponAmount: 10,
          hasLottery: false,
          isLoggedIn: false,
          loading: false
        });
        app.globalData.isLoggedIn = false;
      }
    }).catch(err => {
      console.error('获取用户信息失败：', err);
      this.setData({ loading: false });
    });
  },

  /**
   * 点击抽奖按钮（REQ-006, REQ-012）
   */
  onLotteryTap() {
    if (this.data.loading) return;

    if (!this.data.isLoggedIn) {
      // 未登录，跳转到登录页（REQ-012）
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    if (this.data.hasLottery) {
      // 已抽奖，提示
      wx.showToast({
        title: '您已参与过抽奖',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 跳转到抽奖页
    wx.navigateTo({ url: '/pages/lottery/lottery' });
  },

  /**
   * Banner点击事件（可选）
   */
  onBannerTap() {
    // 预留：可跳转到活动详情页
  }
});
