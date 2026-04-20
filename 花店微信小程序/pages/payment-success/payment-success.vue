<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goHome">
        <icon name="close" :size="36" color="#1c1b1b" />
      </view>
      <text class="topbar__title">支付成功</text>
      <view class="topbar__btn"></view>
    </view>
    <view class="topbar__divider"></view>

    <view class="main">
      <view class="hero">
        <view class="hero__glow hero__glow--a"></view>
        <view class="hero__glow hero__glow--b"></view>
        <view class="hero__icon">
          <icon name="check_circle" :size="160" color="#ffffff" fill />
        </view>
      </view>

      <text class="title">支付成功</text>
      <text class="subtitle">感谢你的订单，我们会尽快为你准备这束温柔</text>

      <view class="card">
        <view class="row">
          <text class="row__label">订单金额</text>
          <text class="row__total">¥ 393.00</text>
        </view>
        <view class="row">
          <text class="row__label">支付方式</text>
          <text class="row__value">微信支付</text>
        </view>
        <view class="row">
          <text class="row__label">订单编号</text>
          <text class="row__value">#202405A12</text>
        </view>
        <view class="row">
          <text class="row__label">下单时间</text>
          <text class="row__value">2024-05-12 10:24</text>
        </view>
      </view>

      <view class="tip">
        <icon name="local_shipping" :size="32" color="#4e6b53" fill />
        <text>预计今日 18:00 前送达</text>
      </view>

      <view class="actions">
        <view class="btn btn--ghost" @click="goOrder">查看订单</view>
        <view class="btn btn--primary" @click="goHome">返回首页</view>
      </view>
    </view>
  </view>
</template>

<script>
import Icon from '@/components/icon/icon.vue'
export default {
  components: { Icon },
  methods: {
    goOrder() { uni.switchTab({ url: '/pages/order/order' }) },
    goHome() { uni.switchTab({ url: '/pages/index/index' }) }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: rgba(252, 248, 247, 0.86);
  backdrop-filter: blur(20rpx);
}
.topbar__btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topbar__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1c1b1b;
}
.topbar__divider {
  height: 12rpx;
  background: linear-gradient(to bottom, #f7f3f2, rgba(247, 243, 242, 0));
}
.main {
  padding: 48rpx 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero {
  position: relative;
  width: 360rpx;
  height: 360rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 48rpx;
  margin-bottom: 48rpx;
}
.hero__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60rpx);
}
.hero__glow--a {
  width: 280rpx;
  height: 280rpx;
  background: rgba(241, 167, 180, 0.6);
  top: -20rpx;
  left: -20rpx;
}
.hero__glow--b {
  width: 240rpx;
  height: 240rpx;
  background: rgba(202, 235, 204, 0.6);
  bottom: -20rpx;
  right: -20rpx;
}
.hero__icon {
  position: relative;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(136, 77, 89, 0.3);
}
.title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1c1b1b;
  letter-spacing: -1rpx;
  margin-bottom: 16rpx;
}
.subtitle {
  font-size: 26rpx;
  color: #524345;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 48rpx;
}
.card {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 12rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
  margin-bottom: 32rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 2rpx solid rgba(214, 194, 196, 0.2);
}
.row:last-child { border-bottom: none; }
.row__label {
  font-size: 26rpx;
  color: #524345;
}
.row__value {
  font-size: 26rpx;
  color: #1c1b1b;
  font-weight: 500;
}
.row__total {
  font-size: 36rpx;
  color: #884d59;
  font-weight: 700;
}
.tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(202, 235, 204, 0.4);
  color: #4e6b53;
  font-size: 24rpx;
  font-weight: 500;
  margin-bottom: 64rpx;
}
.actions {
  width: 100%;
  display: flex;
  gap: 24rpx;
}
.btn {
  flex: 1;
  padding: 28rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.btn--ghost {
  background: #ffffff;
  color: #884d59;
  border: 2rpx solid #d6c2c4;
}
.btn--primary {
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(136, 77, 89, 0.3);
}
</style>
