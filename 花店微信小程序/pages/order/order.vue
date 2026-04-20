<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn">
        <icon name="menu" :size="36" color="#884d59" />
      </view>
      <text class="topbar__title">我的订单</text>
      <view class="topbar__btn">
        <icon name="shopping_bag" :size="36" color="#884d59" />
      </view>
    </view>

    <view class="main">
      <!-- Tabs -->
      <view class="tabs">
        <view
          v-for="(t, i) in tabs"
          :key="i"
          class="tab"
          :class="{ 'tab--active': current === i }"
          @click="current = i"
        >
          <text>{{ t }}</text>
          <view v-if="current === i" class="tab__bar"></view>
        </view>
      </view>

      <!-- Orders -->
      <view class="orders">
        <!-- Order 1: 配送中 -->
        <view class="order">
          <image class="order__img" :src="orders[0].img" mode="aspectFill" />
          <view class="order__body">
            <view class="order__head">
              <view>
                <text class="order__no">订单号 #202405A12</text>
                <text class="order__date">2024年5月12日</text>
              </view>
              <view class="badge badge--primary">配送中</view>
            </view>
            <view class="order__info">
              <text class="order__title">春日奏鸣曲花束</text>
              <text class="order__desc">粉色牡丹，白色毛茛，尤加利叶</text>
              <text class="order__qty">数量: 1</text>
            </view>
            <view class="order__foot">
              <view>
                <text class="order__label">合计</text>
                <text class="order__total">¥ 380.00</text>
              </view>
              <view class="order__actions">
                <view class="btn btn--ghost" @click="goLogistics">查看物流</view>
                <view class="btn btn--primary">确认收货</view>
              </view>
            </view>
          </view>
        </view>

        <!-- Order 2: 待付款 -->
        <view class="order">
          <image class="order__img" :src="orders[1].img" mode="aspectFill" />
          <view class="order__body">
            <view class="order__head">
              <view>
                <text class="order__no">订单号 #202405A08</text>
                <text class="order__date">2024年5月08日</text>
              </view>
              <view class="badge badge--tertiary">待付款</view>
            </view>
            <view class="order__info">
              <text class="order__title">午夜百合</text>
              <text class="order__desc">优质单支白百合</text>
              <text class="order__qty">数量: 2</text>
            </view>
            <view class="order__foot">
              <view>
                <text class="order__label">合计</text>
                <text class="order__total">¥ 120.00</text>
              </view>
              <view class="order__actions">
                <view class="btn btn--text">取消订单</view>
                <view class="btn btn--secondary">去支付</view>
              </view>
            </view>
          </view>
        </view>

        <!-- Order 3: 已完成 -->
        <view class="order order--done">
          <image class="order__img" :src="orders[2].img" mode="aspectFill" />
          <view class="order__body">
            <view class="order__head">
              <view>
                <text class="order__no">订单号 #202404C22</text>
                <text class="order__date">2024年4月22日</text>
              </view>
              <view class="badge badge--muted">已完成</view>
            </view>
            <view class="order__info">
              <text class="order__title">永生薰衣草</text>
              <text class="order__desc">普罗旺斯干薰衣草花束</text>
              <text class="order__qty">数量: 1</text>
            </view>
            <view class="order__foot">
              <view>
                <text class="order__label">合计</text>
                <text class="order__total">¥ 85.00</text>
              </view>
              <view class="order__actions">
                <view class="btn btn--ghost">再次购买</view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Icon from '@/components/icon/icon.vue'
export default {
  components: { Icon },
  data() {
    return {
      current: 0,
      tabs: ['全部', '待付款', '进行中', '已完成'],
      orders: [
        { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrrDL9BK-3X6eMvx697kaVhURzwRlb95WXEDCtI7Ae_Y6MfK3fsL1NV8KuZG17XbIB9uiGGZi2pLNWjgd5gUmr_tFz1YS_n-qU4X3Z7zGA55zA8ebgQhUO0gAogewYBglrcbfZXbFDnaPPwsWX9OcKLwfZ9E9uVFFTKk-KV1a1_9FClFzoQTpurj1WpL0AoJ2Ht1M1qL4sCV-tt_B70Q8nHpJtOeaCY7lzjiltmgPhnJPokJ_DeKfihD8OVXR8gchfk3wyMYt4U8Ci' },
        { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAiJXrVdijI2orZkVbSYylqaF_muS3GmgursOIOZ861YxHvX9x4Cx71szG6TV5kabm0KyZaafqGbq7Tyn65NRaomkyuzVTqV5tq8GDJg8PkjYaKOnIuy51DYDtdgLjt4D8btyq6RU8-6WQrlgNkhYPLvMi2pUDeVHYjQGEN18BPZEo1LrLUAGFpC6BGsicOCv5j4HVY5jp396vQ4dCfg3UDmWErw1xYiLTEQtl7JFpy1H31wUJIdKxohVnK5uqhpsJs8h4ocqpeuhxq' },
        { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYPtbZheK121IHrxJuVDN0z5AZdZfZYxNUdS-h0Nis-NZnqZDp3_59pt_paDidKIXNzuqFfABHIu2QexlyY1G0m7Ke4hIsC_YqTtQ3cP78_JaDriaF9h4lxwjoSDNZ9NwICwLI-dD5sLfqRzXxtFtD73BVXhb8hWEbTACLE4dTBemOM2HoqIRwGj0vFfDl3ZN-nO3SGZSIrcS2SHj-OF1QThcD5jejuEA5vC5YPvmZICm0xNgF18n239CFzRH19AM6O268ONYxsIm0' }
      ]
    }
  },
  methods: {
    goLogistics() {
      uni.navigateTo({ url: '/pages/logistics/logistics' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
  padding-bottom: 40rpx;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 48rpx;
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
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
  color: #884d59;
  letter-spacing: -0.5rpx;
}

.main {
  padding: 0 32rpx 40rpx;
}

/* Tabs */
.tabs {
  position: sticky;
  top: 140rpx;
  z-index: 40;
  display: flex;
  gap: 48rpx;
  padding: 32rpx 16rpx 32rpx;
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(16rpx);
  margin: 0 -32rpx 48rpx;
  overflow-x: auto;
}
.tab {
  position: relative;
  padding-bottom: 16rpx;
  font-size: 28rpx;
  color: #524345;
  font-weight: 500;
  white-space: nowrap;
}
.tab--active {
  color: #884d59;
}
.tab__bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: #884d59;
  border-radius: 999rpx;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}
.order {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
}
.order--done {
  opacity: 0.75;
}
.order__img {
  width: 100%;
  height: 300rpx;
  background: #f7f3f2;
}
.order__body {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
}
.order__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32rpx;
}
.order__no {
  display: block;
  font-size: 22rpx;
  font-weight: 500;
  color: #524345;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  margin-bottom: 8rpx;
}
.order__date {
  display: block;
  font-size: 22rpx;
  color: #847375;
  font-weight: 500;
  letter-spacing: 1rpx;
}
.order__info {
  margin-bottom: 40rpx;
}
.order__title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #1c1b1b;
  margin-bottom: 12rpx;
}
.order__desc {
  display: block;
  font-size: 28rpx;
  color: #524345;
  line-height: 1.6;
}
.order__qty {
  display: block;
  font-size: 28rpx;
  color: #1c1b1b;
  margin-top: 8rpx;
}
.order__foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 32rpx;
  border-top: 2rpx solid rgba(214, 194, 196, 0.15);
}
.order__label {
  display: block;
  font-size: 22rpx;
  color: #524345;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  margin-bottom: 8rpx;
}
.order__total {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1c1b1b;
}
.order__actions {
  display: flex;
  gap: 20rpx;
}

/* Badges */
.badge {
  padding: 8rpx 24rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.badge--primary {
  background: rgba(241, 167, 180, 0.3);
  color: #884d59;
}
.badge--tertiary {
  background: rgba(220, 181, 130, 0.3);
  color: #77592e;
}
.badge--muted {
  background: #e5e2e1;
  color: #524345;
}

/* Buttons */
.btn {
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  text-align: center;
}
.btn--ghost {
  border: 2rpx solid #d6c2c4;
  color: #1c1b1b;
  background: transparent;
}
.btn--primary {
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(136, 77, 89, 0.2);
}
.btn--secondary {
  background: #49654d;
  color: #ffffff;
}
.btn--text {
  color: #884d59;
  background: transparent;
}
</style>
