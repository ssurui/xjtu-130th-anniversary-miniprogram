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
        env: 'your-cloud-env-id',
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
  }
});
