<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="36" color="#1c1b1b" />
      </view>
      <text class="topbar__title">确认订单</text>
      <view class="topbar__btn"></view>
    </view>

    <view class="main">
      <view class="tabs">
        <view
          v-for="(t, i) in tabs"
          :key="i"
          class="tab"
          :class="{ 'tab--active': deliveryType === i }"
          @click="deliveryType = i"
        >{{ t }}</view>
      </view>

      <view class="card" @click="goAddress" v-if="deliveryType === 0">
        <view class="card__row">
          <icon name="location_on" :size="40" color="#884d59" fill />
          <view class="card__body">
            <view class="card__head">
              <text class="card__name">张小花 188****8888</text>
              <view class="card__tag">默认</view>
            </view>
            <text class="card__text">上海市徐汇区虹漕路 88 弄 8 号楼 808 室</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
      </view>

      <view class="card" v-else>
        <view class="card__row">
          <icon name="storefront" :size="40" color="#884d59" fill />
          <view class="card__body">
            <text class="card__name">花间词 · 徐汇旗舰店</text>
            <text class="card__text">上海市徐汇区衡山路 880 号 · 距你 1.2km</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
      </view>

      <view class="card card--goods">
        <view class="goods">
          <image class="goods__img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGMbO8xUVFoAEdn4YJ9Mxgt6_DHh_YfEnxhh_4C0hUwJe0gJZ0SBwZNGNk6aSzxU6RlJZl8UzXrJRcQlZYYS4Nc7gWnOH1xvB4XwCrEBEBwOmHfIbZA5LHvHGMdu2ZBRHxlHH8bLHxX3-kNFtlPZ06zRkJJrDnJMkHRI6aUIhRr_Ft8J8EZxh99Nbq" mode="aspectFill" />
          <view class="goods__body">
            <text class="goods__title">落樱飞雪 · 粉霜玫瑰</text>
            <text class="goods__spec">规格：11枝</text>
            <view class="goods__foot">
              <text class="goods__price">¥ 398</text>
              <text class="goods__qty">×1</text>
            </view>
          </view>
        </view>
      </view>

      <view class="card card--list">
        <view class="row" @click="noop">
          <text class="row__label">送达时间</text>
          <view class="row__value">
            <text>今日 18:00 前</text>
            <icon name="chevron_right" :size="24" color="#d6c2c4" />
          </view>
        </view>
        <view class="row" @click="noop">
          <text class="row__label">优惠券</text>
          <view class="row__value">
            <text class="row__hint">-¥ 20</text>
            <icon name="chevron_right" :size="24" color="#d6c2c4" />
          </view>
        </view>
        <view class="row" @click="noop">
          <text class="row__label">卡片留言</text>
          <view class="row__value">
            <text class="row__placeholder">点此输入</text>
            <icon name="chevron_right" :size="24" color="#d6c2c4" />
          </view>
        </view>
      </view>

      <view class="card card--summary">
        <view class="sum-row"><text>商品金额</text><text>¥ 398.00</text></view>
        <view class="sum-row"><text>配送费</text><text>¥ 15.00</text></view>
        <view class="sum-row"><text>优惠券</text><text class="sum-row--minus">-¥ 20.00</text></view>
        <view class="sum-row sum-row--total"><text>应付金额</text><text class="total">¥ 393.00</text></view>
      </view>
    </view>

    <view class="footbar">
      <view class="footbar__price">
        <text class="footbar__label">合计</text>
        <text class="footbar__total">¥ 393.00</text>
      </view>
      <view class="footbar__btn" @click="submit">提交订单</view>
    </view>
  </view>
</template>

<script>
import Icon from '@/components/icon/icon.vue'
export default {
  components: { Icon },
  data() {
    return {
      deliveryType: 0,
      tabs: ['鲜花配送', '到店自取']
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    goAddress() { uni.navigateTo({ url: '/pages/address/address' }) },
    submit() { uni.navigateTo({ url: '/pages/payment-success/payment-success' }) },
    noop() { uni.showToast({ title: '功能开发中', icon: 'none' }) }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
  padding-bottom: 200rpx;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx;
  background: rgba(252, 248, 247, 0.9);
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
  font-size: 34rpx;
  font-weight: 700;
  color: #1c1b1b;
}
.main {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.tabs {
  display: flex;
  background: #ffffff;
  border-radius: 999rpx;
  padding: 8rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
}
.tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #524345;
  font-weight: 500;
}
.tab--active {
  background: #884d59;
  color: #ffffff;
}
.card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.03);
}
.card__row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.card__body {
  flex: 1;
}
.card__head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.card__name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1c1b1b;
}
.card__tag {
  padding: 4rpx 14rpx;
  background: #f1a7b4;
  color: #ffffff;
  font-size: 20rpx;
  border-radius: 8rpx;
  font-weight: 500;
}
.card__text {
  display: block;
  font-size: 24rpx;
  color: #524345;
  line-height: 1.6;
}
.card--goods {
  padding: 24rpx;
}
.goods {
  display: flex;
  gap: 24rpx;
}
.goods__img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 20rpx;
  background: #f7f3f2;
  flex-shrink: 0;
}
.goods__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.goods__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1c1b1b;
}
.goods__spec {
  font-size: 22rpx;
  color: #847375;
}
.goods__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.goods__price {
  font-size: 30rpx;
  font-weight: 700;
  color: #884d59;
}
.goods__qty {
  font-size: 22rpx;
  color: #847375;
}
.card--list {
  padding: 0 32rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 2rpx solid rgba(214, 194, 196, 0.2);
}
.row:last-child {
  border-bottom: none;
}
.row__label {
  font-size: 28rpx;
  color: #1c1b1b;
  font-weight: 500;
}
.row__value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #524345;
}
.row__hint {
  color: #884d59;
  font-weight: 500;
}
.row__placeholder {
  color: #d6c2c4;
}
.card--summary {
  padding: 32rpx;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #524345;
  padding: 12rpx 0;
}
.sum-row--minus {
  color: #884d59;
}
.sum-row--total {
  margin-top: 16rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(214, 194, 196, 0.2);
  font-size: 28rpx;
  color: #1c1b1b;
  font-weight: 600;
}
.total {
  color: #884d59;
  font-size: 36rpx;
  font-weight: 700;
}
.footbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}
.footbar__price {
  display: flex;
  flex-direction: column;
}
.footbar__label {
  font-size: 22rpx;
  color: #524345;
}
.footbar__total {
  font-size: 36rpx;
  font-weight: 700;
  color: #884d59;
}
.footbar__btn {
  padding: 24rpx 72rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(136, 77, 89, 0.3);
}
</style>
