// pages/lottery/lottery.js
// 抽奖页逻辑（REQ-009, REQ-011）

const SPIN_DURATION = 3000; // 转盘动画时长（毫秒），与CSS动画保持一致

Page({
  data: {
    spinning: false,      // 是否正在旋转
    showResult: false,    // 是否显示结果
    lotteryAmount: 0,     // 抽奖金额
    newCouponAmount: 0,   // 抽奖后礼券总额
    hasError: false       // 是否发生错误
  },

  /**
   * 开始抽奖（REQ-009）
   * 并行启动：CSS转盘动画 + getLottery 云函数调用
   */
  onStartLottery() {
    if (this.data.spinning || this.data.showResult) return;

    // 启动旋转动画
    this.setData({ spinning: true });

    // 并行调用抽奖云函数（REQ-009）
    const lotteryPromise = wx.cloud.callFunction({
      name: 'getLottery',
      data: {}
    });

    // 等待动画完成（3秒）+ 云函数结果
    Promise.all([
      new Promise(resolve => setTimeout(resolve, SPIN_DURATION)),
      lotteryPromise
    ]).then(([, cloudResult]) => {
      const result = cloudResult.result;
      this.setData({ spinning: false });

      if (result.code === 0) {
        // 抽奖成功
        this.setData({
          showResult: true,
          lotteryAmount: result.data.lotteryAmount,
          newCouponAmount: result.data.couponAmount
        });
      } else if (result.code === 1) {
        // 已参与过抽奖（REQ-011）
        this.setData({
          showResult: true,
          lotteryAmount: result.data.lotteryAmount,
          newCouponAmount: result.data.couponAmount
        });
        wx.showToast({
          title: '您已参与过抽奖',
          icon: 'none',
          duration: 2000
        });
      } else {
        // 错误情况
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
