// pages/login/login.js
// 一键登录引导页逻辑（REQ-007, REQ-008）

const app = getApp();

Page({
  data: {
    loading: false
  },

  /**
   * 获取手机号授权回调（REQ-007, REQ-008）
   * @param {Object} e - 包含 detail.code 的事件对象
   */
  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      // 用户拒绝授权
      wx.showToast({
        title: '授权取消，无法登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const phoneCode = e.detail.code;
    if (!phoneCode) {
      wx.showToast({
        title: '获取手机号失败，请重试',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 调用 login 云函数（REQ-008）
    wx.cloud.callFunction({
      name: 'login',
      data: {
        phoneCode,
        giftType: app.globalData.giftType || 'gift1'
      }
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        // 登录成功，更新全局状态
        app.globalData.isLoggedIn = true;
        app.globalData.userInfo = result.data;

        wx.showToast({
          title: result.data.isNewUser ? '登录成功，已获得VIP卡！' : '欢迎回来！',
          icon: 'success',
          duration: 1500
        });

        // 登录成功后跳转到抽奖页（如果未抽奖）或返回首页
        setTimeout(() => {
          this.setData({ loading: false });
          if (!result.data.hasLottery) {
            // 跳转到抽奖页
            wx.redirectTo({ url: '/pages/lottery/lottery' });
          } else {
            // 已抽过奖，返回首页
            wx.navigateBack();
          }
        }, 1500);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: result.message || '登录失败，请重试',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('登录云函数调用失败：', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 暂不参与，返回首页（REQ-012）
   */
  onSkip() {
    wx.navigateBack();
  }
});
