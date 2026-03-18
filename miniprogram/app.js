// app.js - 全局初始化，解析扫码scene参数，初始化云开发
App({
  globalData: {
    giftType: 'gift1',      // 礼品类型，默认gift1，由扫码scene参数决定
    userInfo: null,          // 用户信息缓存
    isLoggedIn: false        // 登录状态
  },

  onLaunch(options) {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // 替换为您的云开发环境ID
        env: 'cloud1-4gctjk9fd709846f',
        traceUser: true
      });
    }

    // 解析扫码携带的scene参数（REQ-001, REQ-002）
    // 微信小程序码scene参数需要URL解码
    if (options && options.query && options.query.scene) {
      const scene = decodeURIComponent(options.query.scene);
      console.log('扫码scene参数：', scene);
      // scene格式：gift1 或 gift2
      if (scene === 'gift1' || scene === 'gift2') {
        this.globalData.giftType = scene;
      }
    }

    // 进入小程序即记录 openid，创建用户记录（无手机号的访客记录）
    wx.cloud.callFunction({
      name: 'login',
      data: { giftType: this.globalData.giftType }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        this.globalData.userInfo = res.result.data;
        // 有手机号才视为已登录
        this.globalData.isLoggedIn = !!res.result.data.phoneNumber;
      }
    }).catch(err => {
      console.error('初始化用户记录失败：', err);
    });
  }
});
