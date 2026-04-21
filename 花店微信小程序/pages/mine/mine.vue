<template>
  <view class="page">
    <view class="topbar topbar--logged" v-if="isLoggedIn">
      <view class="topbar__left">
        <icon name="local_florist" :size="36" color="#884d59" />
        <text class="topbar__title">植物诗集</text>
      </view>
      <view class="topbar__right">
        <icon name="settings" :size="40" color="#847375" />
      </view>
    </view>
    <view class="topbar topbar--guest" v-else>
      <text class="topbar__title topbar__title--guest">我的</text>
    </view>

    <view class="main">
      <!-- Profile Hero -->
      <view v-if="isLoggedIn" class="hero hero--logged">
        <view class="hero__glow"></view>
        <view class="hero__row">
          <image class="hero__avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYCs_F8eCnWdphmFKbrMQWxZCWEd_l22lQ8oIFQqvlOQdLfckNiJWj8XNH4sqLo8Z7M7J5vPaaPXpC_A3QTmbSln-XQNUUYexc1eFZPLnsBO9dC5-1yvRvJTdqI1IyEzcv1-KmL81ZcP3zKkgULJAmTGgHOxd41Cy0kzfWwsIw7KtVqGP5sRXWoKlZmdn5qBQl8MsxbwW773cvjta24eoncU9ostDpC86tVmdnHYdbsHhmP4FGt8o40hj_xsujFfMWncOpq1afkdew" mode="aspectFill" />
          <view class="hero__info">
            <text class="hero__name">林间微风</text>
            <view class="hero__chip">
              <icon name="auto_awesome" :size="22" color="#370b17" />
              <text>花阶会员</text>
            </view>
          </view>
        </view>
        <view class="hero__logout" @click="logout">
          <text>退出</text>
        </view>
      </view>

      <view v-else class="hero hero--guest" @click="login">
        <view class="hero__glow"></view>
        <view class="hero__row">
          <view class="hero__avatar-guest">
            <icon name="person" :size="72" color="#847375" fill />
          </view>
          <view class="hero__info">
            <view class="hero__login">
              <text>点击登录/注册</text>
              <icon name="chevron_right" :size="28" color="#ffffff" />
            </view>
            <text class="hero__tip">登录享更多专属优惠</text>
          </view>
        </view>
      </view>

      <!-- Orders -->
      <view class="block">
        <view class="block__head">
          <text class="block__title">我的订单</text>
          <view class="block__more" @click="goOrders">
            <text>查看全部</text>
            <icon name="chevron_right" :size="24" color="#884d59" />
          </view>
        </view>
        <view class="order-grid">
          <view class="og-item">
            <view class="og-icon">
              <icon name="account_balance_wallet" :size="48" color="#524345" fill />
              <view class="og-badge"></view>
            </view>
            <text class="og-label">待付款</text>
          </view>
          <view class="og-item">
            <view class="og-icon">
              <icon name="local_shipping" :size="48" color="#524345" fill />
            </view>
            <text class="og-label">待发货</text>
          </view>
          <view class="og-item">
            <view class="og-icon">
              <icon name="rate_review" :size="48" color="#524345" fill />
            </view>
            <text class="og-label">待评价</text>
          </view>
          <view class="og-item">
            <view class="og-icon">
              <icon name="support_agent" :size="48" color="#524345" fill />
            </view>
            <text class="og-label">售后</text>
          </view>
        </view>
      </view>

      <!-- Functions -->
      <view class="block block--list">
        <text class="block__title block__title--tight">常用功能</text>
        <view class="row" @click="noop">
          <view class="row__left">
            <icon name="favorite" :size="32" color="#f1a7b4" fill />
            <text class="row__text">我的收藏</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
        <view class="row" @click="goAddress">
          <view class="row__left">
            <icon name="location_on" :size="32" color="#f1a7b4" fill />
            <text class="row__text">收货地址</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
        <view class="row" @click="noop">
          <view class="row__left">
            <icon name="confirmation_number" :size="32" color="#f1a7b4" fill />
            <text class="row__text">领券中心</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
        <view class="row" @click="noop">
          <view class="row__left">
            <icon name="chat_bubble" :size="32" color="#f1a7b4" fill />
            <text class="row__text">在线客服</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
        </view>
        <view class="row" @click="noop">
          <view class="row__left">
            <icon name="info" :size="32" color="#f1a7b4" fill />
            <text class="row__text">关于我们</text>
          </view>
          <icon name="chevron_right" :size="28" color="#d6c2c4" />
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
    return { isLoggedIn: false }
  },
  methods: {
    login() {
      this.isLoggedIn = true
    },
    logout() {
      this.isLoggedIn = false
    },
    goOrders() {
      uni.switchTab({ url: '/pages/order/order' })
    },
    goAddress() {
      uni.navigateTo({ url: '/pages/address/address' })
    },
    noop() {
      uni.showToast({ title: '功能开发中', icon: 'none' })
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 48rpx;
}
.topbar--logged {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
}
.topbar--guest {
  justify-content: center;
  padding: 48rpx 32rpx 20rpx;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.topbar__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #884d59;
  letter-spacing: -1rpx;
}
.topbar__title--guest {
  color: #1c1b1b;
  font-size: 40rpx;
}

.main {
  padding: 0 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

/* Hero */
.hero {
  position: relative;
  border-radius: 32rpx;
  padding: 48rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(136, 77, 89, 0.1);
}
.hero--logged {
  background: linear-gradient(135deg, #ffd9de 0%, #f1a7b4 100%);
}
.hero--guest {
  background: linear-gradient(135deg, #884d59 0%, #f1a7b4 100%);
}
.hero__glow {
  position: absolute;
  right: -80rpx;
  top: -80rpx;
  width: 280rpx;
  height: 280rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  filter: blur(40rpx);
}
.hero__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.hero__avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  background: #f7f3f2;
  flex-shrink: 0;
}
.hero__avatar-guest {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #f7f3f2;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero__info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.hero__name {
  font-size: 44rpx;
  font-weight: 700;
  color: #370b17;
  letter-spacing: -1rpx;
  margin-bottom: 12rpx;
}
.hero__chip {
  align-self: flex-start;
  padding: 8rpx 24rpx;
  background: rgba(255, 255, 255, 0.4);
  color: #370b17;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.hero__login {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #ffffff;
  font-size: 38rpx;
  font-weight: 600;
}
.hero__tip {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
}
.hero__logout {
  position: absolute;
  right: 32rpx;
  top: 32rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.5);
  color: #370b17;
  font-size: 22rpx;
  font-weight: 500;
}

.block {
  background: #f7f3f2;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.02);
}
.block--list {
  padding: 12rpx 28rpx;
}
.block__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8rpx 8rpx;
  margin-bottom: 20rpx;
}
.block__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1b1b;
}
.block__title--tight {
  display: block;
  padding: 22rpx 4rpx;
}
.block__more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: #884d59;
  font-size: 26rpx;
  font-weight: 500;
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.og-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 4rpx;
}
.og-icon {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #e5e2e1;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.og-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 16rpx;
  height: 16rpx;
  background: #ba1a1a;
  border-radius: 50%;
}
.og-label {
  font-size: 22rpx;
  font-weight: 500;
  color: #524345;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 4rpx;
  border-bottom: 2rpx solid rgba(214, 194, 196, 0.15);
}
.row:last-child {
  border-bottom: none;
}
.row__left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.row__text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1c1b1b;
}
</style>
