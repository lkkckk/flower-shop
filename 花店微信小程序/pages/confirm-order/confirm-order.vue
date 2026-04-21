<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="34" color="#884d59" />
      </view>
      <text class="topbar__title">确认订单</text>
      <view class="topbar__btn"></view>
    </view>
    <view class="topbar__divider"></view>

    <scroll-view scroll-y class="main">
      <view class="mode-switch">
        <view
          v-for="(t, i) in tabs"
          :key="i"
          class="mode-switch__item"
          :class="{ 'mode-switch__item--active': deliveryType === i }"
          @click="deliveryType = i"
        >
          {{ t }}
        </view>
      </view>

      <view v-if="deliveryType === 0" class="card card--address" @click="goAddress">
        <view class="card__row">
          <view class="card__icon card__icon--secondary">
            <icon name="location_on" :size="30" color="#49654d" fill />
          </view>
          <view class="card__body">
            <view class="card__line">
              <text class="card__name">林诗韵</text>
              <text class="card__phone">138****5678</text>
            </view>
            <text class="card__text">上海市静安区南京西路 1266 号 恒隆广场 1 座 66 层</text>
          </view>
          <icon name="chevron_right" :size="24" color="#847375" />
        </view>
      </view>

      <view v-else class="card card--address">
        <view class="card__row">
          <view class="card__icon card__icon--tertiary">
            <icon name="storefront" :size="30" color="#77592e" fill />
          </view>
          <view class="card__body">
            <text class="card__name">Botanical Poetry 花店</text>
            <text class="card__text">上海市徐汇区安福路 322 号</text>
            <text class="card__hint">营业时间：09:00 - 20:00</text>
          </view>
          <icon name="chevron_right" :size="24" color="#847375" />
        </view>
      </view>

      <view class="section-title">订购清单</view>
      <view class="card card--items">
        <view v-for="(item, i) in items" :key="i" class="item">
          <image class="item__img" :src="item.img" mode="aspectFill" />
          <view class="item__body">
            <view>
              <text class="item__title">{{ item.title }}</text>
              <text class="item__spec">规格：{{ item.spec }}</text>
            </view>
            <view class="item__foot">
              <text class="item__price">¥ {{ item.price.toFixed(2) }}</text>
              <text class="item__qty">x{{ item.qty }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="card card--list">
        <view class="row">
          <view class="row__left">
            <icon name="schedule" :size="22" color="#884d59" />
            <text>{{ deliveryType === 0 ? '预约送达时间' : '预约自取时间' }}</text>
          </view>
          <view class="row__right">
            <text>{{ deliveryType === 0 ? '明天 14:00 - 16:00' : '明天 16:00 后' }}</text>
            <icon name="chevron_right" :size="22" color="#847375" />
          </view>
        </view>
        <view class="row">
          <view class="row__left">
            <icon name="local_activity" :size="22" color="#884d59" />
            <text>优惠券</text>
          </view>
          <view class="row__right">
            <text class="row__discount">- ¥ 50.00</text>
            <icon name="chevron_right" :size="22" color="#847375" />
          </view>
        </view>
      </view>

      <view class="card card--message">
        <view class="message__head">
          <icon name="edit_note" :size="22" color="#77592e" />
          <text>卡片留言（选填）</text>
        </view>
        <textarea class="message__input" placeholder="写下您的祝福..." maxlength="80" />
      </view>

      <view class="card card--summary">
        <view class="sum-row">
          <text>商品总额</text>
          <text>¥ {{ subtotal.toFixed(2) }}</text>
        </view>
        <view class="sum-row">
          <text>运费</text>
          <text>+ ¥ {{ shippingFee.toFixed(2) }}</text>
        </view>
        <view class="sum-row sum-row--discount">
          <text>优惠减免</text>
          <text>- ¥ {{ discount.toFixed(2) }}</text>
        </view>
        <view class="sum-row sum-row--total">
          <text>实付金额</text>
          <text class="sum-row__total">¥ {{ total.toFixed(2) }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="footbar">
      <view class="footbar__price">
        <text class="footbar__label">合计实付</text>
        <text class="footbar__total">¥ {{ total.toFixed(2) }}</text>
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
      tabs: ['外卖配送', '到店自取'],
      shippingFee: 20,
      discount: 50,
      items: [
        {
          title: '晨雾玫瑰花束',
          spec: '经典款（12枝）',
          price: 399,
          qty: 1,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARKh7U8ZgQg2QPP7yoQVQhI8BkU1-t1d0YFOVu3aAcPBJoxvVsLy-1tBnavSJrcsI563KnkxFqtGYLRlX6zL4OFA_QQK_KJ7RVtFrrFbllfNkAWZBiTCmskgIcnsGRBUUFm2K01huF3t-GtVoLVYtAaTemGtLf8K_hSA1ps_wg5uRU-X9QFdWZtBCsR-URkZ30GhoUsJCvTOUtOypD0UvafwC-n0mPPkbH65Gt1zNkCLwAC63KkKSWyztQ2_iYqdjA8bcxOx4Fyu_2'
        },
        {
          title: '初雪郁金香',
          spec: '迷你款（6枝）',
          price: 199,
          qty: 1,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVgvMu-2G0ZENLtpkCbbVYtK3SOvOIl5fVc_9TmXDqtca096UVJv-ZR5sKBIOmfZrSQpxLLUFq3_OpNxKNkyeIulgvcH0Fh-MSVv_7TVg4OAeF4s2sEaEcP-P4zbYuyMgRliJ_WKArum-zUtZLguCOrflIPq96SLbt18vSMg7nr4-rJFUxqkO338mY9hbPAuKf2OAC9zy0jakq4RzCtT96Tm9awXEzoI6koSGwtr8l3WgZCZm0UkWPO925ecqda7_Cjeu9ZiFjR-ta'
        }
      ]
    }
  },
  computed: {
    subtotal() {
      return this.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    },
    total() {
      return this.subtotal + this.shippingFee - this.discount
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    goAddress() { uni.navigateTo({ url: '/pages/address/address' }) },
    submit() { uni.navigateTo({ url: '/pages/payment-success/payment-success' }) }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
  padding-bottom: 190rpx;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  background: rgba(252, 248, 247, 0.88);
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
  color: #884d59;
}
.topbar__divider {
  height: 10rpx;
  background: linear-gradient(to bottom, #f7f3f2, rgba(247, 243, 242, 0));
}
.main {
  height: calc(100vh - 168rpx);
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.mode-switch {
  background: #f1edec;
  border-radius: 999rpx;
  padding: 8rpx;
  display: flex;
}
.mode-switch__item {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #524345;
  padding: 16rpx 0;
  border-radius: 999rpx;
  font-weight: 500;
}
.mode-switch__item--active {
  background: #f1a7b4;
  color: #713a46;
  font-weight: 700;
}

.card {
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
}
.card--address {
  padding: 28rpx;
}
.card__row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.card__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card__icon--secondary {
  background: #caebcc;
}
.card__icon--tertiary {
  background: #dcb582;
}
.card__body {
  flex: 1;
}
.card__line {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1c1b1b;
}
.card__phone {
  font-size: 24rpx;
  color: #524345;
}
.card__text {
  display: block;
  font-size: 24rpx;
  color: #524345;
  line-height: 1.6;
}
.card__hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #77592e;
}

.section-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1c1b1b;
  margin: 8rpx 0 2rpx;
}
.card--items {
  padding: 24rpx;
}
.item {
  display: flex;
  gap: 20rpx;
  padding: 12rpx 0;
}
.item + .item {
  border-top: 2rpx solid rgba(214, 194, 196, 0.2);
  margin-top: 12rpx;
  padding-top: 24rpx;
}
.item__img {
  width: 192rpx;
  height: 192rpx;
  border-radius: 16rpx;
  background: #f7f3f2;
  flex-shrink: 0;
}
.item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.item__title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1c1b1b;
  margin-bottom: 6rpx;
}
.item__spec {
  display: block;
  font-size: 24rpx;
  color: #847375;
}
.item__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item__price {
  font-size: 32rpx;
  color: #884d59;
  font-weight: 700;
}
.item__qty {
  font-size: 22rpx;
  color: #524345;
}

.card--list {
  padding: 0 28rpx;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
  border-bottom: 2rpx solid rgba(214, 194, 196, 0.22);
}
.row:last-child {
  border-bottom: none;
}
.row__left {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 28rpx;
  color: #1c1b1b;
  font-weight: 500;
}
.row__right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #524345;
}
.row__discount {
  color: #884d59;
  font-weight: 600;
}

.card--message {
  padding: 24rpx;
  background: rgba(220, 181, 130, 0.14);
}
.message__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  color: #62461d;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.message__input {
  width: 100%;
  min-height: 136rpx;
  border-radius: 16rpx;
  background: #ffffff;
  padding: 20rpx;
  font-size: 24rpx;
  color: #1c1b1b;
  box-sizing: border-box;
}

.card--summary {
  padding: 28rpx;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
  color: #524345;
  padding: 8rpx 0;
}
.sum-row--discount {
  color: #884d59;
}
.sum-row--total {
  margin-top: 12rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid rgba(214, 194, 196, 0.22);
  color: #1c1b1b;
  font-weight: 600;
}
.sum-row__total {
  font-size: 44rpx;
  color: #884d59;
  font-weight: 700;
}

.footbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -8rpx 30rpx rgba(28, 27, 27, 0.08);
}
.footbar__label {
  display: block;
  font-size: 22rpx;
  color: #524345;
  margin-bottom: 4rpx;
}
.footbar__total {
  display: block;
  font-size: 40rpx;
  color: #884d59;
  font-weight: 700;
}
.footbar__btn {
  width: 400rpx;
  max-width: 400rpx;
  text-align: center;
  padding: 24rpx 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 20rpx rgba(136, 77, 89, 0.24);
}
</style>
