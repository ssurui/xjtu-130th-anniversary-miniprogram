// pages/lottery/lottery.js
// 抽奖页逻辑（REQ-009, REQ-011）

const app = getApp();
const SPIN_DURATION = 4000; // 转盘动画时长（毫秒）

// 各奖项对应扇区中心角度（与 lottery.wxss 中 conic-gradient 顺序一致）
// conic-gradient: ¥200(0-60°) ¥100(60-120°) ¥50(120-180°) ¥30(180-240°) ¥10(240-300°) ¥500(300-360°)
const PRIZE_ANGLES = {
  200: 30,
  100: 90,
  50: 150,
  30: 210,
  10: 270,
  500: 330
};

Page({
  data: {
    spinning: false,        // 是否正在旋转
    showResult: false,      // 是否显示结果
    lotteryAmount: 0,       // 抽奖金额
    newCouponAmount: 0,     // 抽奖后礼券总额
    wheelAnimation: {}      // 转盘动画对象
  },

  /**
   * 开始抽奖（REQ-009）
   * 先获取云函数结果，再根据结果驱动转盘动画到正确扇区
   */
  onStartLottery() {
    if (this.data.spinning || this.data.showResult) return;

    // 未登录时跳转到登录页授权
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    this.setData({ spinning: true });

    // 先获取抽奖结果
    wx.cloud.callFunction({
      name: 'getLottery',
      data: { giftType: app.globalData.giftType }
    }).then(res => {
      const result = res.result;

      if (result.code === 0 || result.code === 1) {
        const lotteryAmount = result.data.lotteryAmount;
        // 计算目标旋转角度：3圈 + 对准扇区中心
        const sectorAngle = PRIZE_ANGLES[lotteryAmount] || 30;
        const targetDeg = 1080 + (360 - sectorAngle);

        // 启动转盘动画到目标角度
        const animation = wx.createAnimation({
          duration: SPIN_DURATION,
          timingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)'
        });
        animation.rotate(targetDeg).step();
        this.setData({ wheelAnimation: animation.export() });

        // 动画结束后显示结果
        setTimeout(() => {
          this.setData({
            spinning: false,
            showResult: true,
            lotteryAmount: lotteryAmount,
            newCouponAmount: result.data.couponAmount
          });
          if (result.code === 1) {
            wx.showToast({ title: '您已参与过抽奖', icon: 'none', duration: 2000 });
          }
        }, SPIN_DURATION);

      } else {
        this.setData({ spinning: false });
        wx.showModal({
          title: '抽奖失败',
          content: result.message || '网络错误，请返回重试',
          showCancel: false
        });
      }
    }).catch(err => {
      console.error('抽奖失败：', err);
      this.setData({ spinning: false });
      wx.showModal({
        title: '网络错误',
        content: '请检查网络连接后重试',
        showCancel: false
      });
    });
  },

  /**
   * 返回首页（REQ-010）
   * navigateBack 会触发 index 页面的 onShow，从而刷新VIP卡数据
   */
  onGoHome() {
    wx.navigateBack({ delta: 1 });
  }
});
