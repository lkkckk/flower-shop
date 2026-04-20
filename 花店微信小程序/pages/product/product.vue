<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="36" color="#1c1b1b" />
      </view>
      <text class="topbar__title">植物诗集</text>
      <view class="topbar__btn">
        <icon name="share" :size="36" color="#1c1b1b" />
      </view>
    </view>
    <view class="topbar__divider"></view>

    <scroll-view scroll-y class="scroll">
      <view class="hero">
        <image class="hero__img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAT3vEJD1jxKgCXGijFHPwOJ-B5YXksI21I0MahG87cPO9eXgd_XxpnO0U9YbuMI6v-iorokqZgFAWQhuDVDif4enoJkrQp38rYhxk-Wy6nNQeJqRysKFh6Qj8MbbL_ybnlPzSIYhS_QVIRt9V2Yr0dChnThg7AWt3ecSHRrLC-rFXZXVd5JaBaLH7qmdMGiwyevKMwqdIahKXC4W9HNftUs817uVtLO29JpkF7-CjJ1VwGAhkPZmZiMpGtXWVHF3-PnwrA4XFEGIvc" mode="aspectFill" />
        <view class="hero__dots">
          <view class="dot dot--active"></view>
          <view class="dot"></view>
          <view class="dot"></view>
        </view>
      </view>

      <view class="info">
        <view class="info__head">
          <view class="info__copy">
            <text class="info__title">落樱飞雪 · 粉霜玫瑰</text>
            <text class="info__subtitle">如初雪般纯净，诉说温柔绵绵。</text>
          </view>
          <view class="info__price-box">
            <text class="info__price">¥398</text>
            <text class="info__note">起售</text>
          </view>
        </view>
        <view class="tags">
          <view class="tag">热销款</view>
          <view class="tag">同城配送</view>
          <view class="tag">代写贺卡</view>
        </view>
      </view>

      <view class="block block--panel">
        <text class="block__eyebrow">规格选择</text>
        <view class="specs">
          <view
            v-for="(s, i) in specs"
            :key="i"
            class="spec"
            :class="{ 'spec--active': specIndex === i }"
            @click="specIndex = i"
          >
            <text class="spec__name">{{ s.name }}</text>
            <text class="spec__price">¥{{ s.price }}</text>
          </view>
        </view>
      </view>

      <view class="block">
        <text class="block__eyebrow">花材组成</text>
        <text class="block__text">精选 A 级昆明粉佳人玫瑰，搭配尤加利叶、白色洋桔梗与少许蕾丝花。柔和的粉白渐变，营造出高级的清冷呼吸感。</text>
      </view>

      <view class="block">
        <text class="block__eyebrow">设计语意</text>
        <text class="block__text">“落樱”取其粉嫣，“飞雪”喻其纯净。这款花束旨在传递不张扬却深沉的爱意，适合纪念日、表白或送给气质温婉的她。</text>
      </view>

      <view class="care">
        <view class="care__icon">
          <icon name="water_drop" :size="36" color="#49654d" fill />
        </view>
        <view class="care__body">
          <view class="care__head">
            <text class="care__title">养护建议</text>
          </view>
          <text class="care__text">收到后请倾斜 45 度剪根，水位建议保持在花瓶的 1/3 处，每 2 天更换一次清水并清洗花瓶内壁。避免阳光直射和空调出风口。</text>
        </view>
      </view>
    </scroll-view>

    <view class="actionbar">
      <view class="actionbar__icons">
        <view class="ab-icon">
          <icon name="headset_mic" :size="44" color="#524345" />
          <text>客服</text>
        </view>
        <view class="ab-icon">
          <icon name="favorite_border" :size="44" color="#524345" />
          <text>收藏</text>
        </view>
      </view>
      <view class="actionbar__btns">
        <view class="ab-btn ab-btn--cart" @click="addCart">加入购物车</view>
        <view class="ab-btn ab-btn--buy" @click="buyNow">立即购买</view>
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
      specIndex: 0,
      specs: [
        { name: '11枝', price: 398 },
        { name: '19枝', price: 598 },
        { name: '33枝', price: 988 }
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    addCart() { uni.showToast({ title: '已加入购物车', icon: 'none' }) },
    buyNow() { uni.navigateTo({ url: '/pages/confirm-order/confirm-order' }) }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 24rpx;
  background: rgba(252, 248, 247, 0.86);
  backdrop-filter: blur(20rpx);
}
.topbar__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #884d59;
  letter-spacing: -0.5rpx;
}
.topbar__btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.08);
}
.topbar__divider {
  height: 12rpx;
  background: linear-gradient(to bottom, #f7f3f2, rgba(247, 243, 242, 0));
}
.scroll {
  flex: 1;
  padding-bottom: 200rpx;
}
.hero {
  position: relative;
  width: 100%;
  height: 760rpx;
  background: #f7f3f2;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  overflow: hidden;
}
.hero__img {
  width: 100%;
  height: 100%;
}
.hero__dots {
  position: absolute;
  bottom: 36rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(252, 248, 247, 0.5);
  backdrop-filter: blur(16rpx);
  justify-content: center;
  gap: 12rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}
.dot--active {
  background: #884d59;
}
.info {
  padding: 48rpx 32rpx 32rpx;
  background: #ffffff;
}
.info__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.info__copy {
  flex: 1;
}
.info__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1c1b1b;
  letter-spacing: -1rpx;
  margin-bottom: 8rpx;
}
.info__subtitle {
  display: block;
  font-size: 24rpx;
  color: #847375;
  line-height: 1.6;
}
.info__price-box {
  text-align: right;
}
.info__price {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #884d59;
}
.info__note {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #847375;
  letter-spacing: 4rpx;
}
.tags {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.tag {
  padding: 10rpx 18rpx;
  border-radius: 8rpx;
  background: #e5e2e1;
  color: #1c1b1b;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}
.block {
  margin-top: 24rpx;
  padding: 40rpx 32rpx;
  background: #ffffff;
}
.block--panel {
  background: #f7f3f2;
  border-radius: 32rpx;
}
.block__eyebrow {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #1c1b1b;
  margin-bottom: 24rpx;
  letter-spacing: 4rpx;
  text-transform: uppercase;
}
.block__text {
  display: block;
  font-size: 26rpx;
  color: #524345;
  line-height: 1.8;
  white-space: pre-line;
}
.specs {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}
.spec {
  min-width: 180rpx;
  padding: 22rpx 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid #d6c2c4;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.spec--active {
  border-color: #884d59;
  background: rgba(136, 77, 89, 0.05);
}
.spec__name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1c1b1b;
}
.spec__price {
  font-size: 22rpx;
  color: #884d59;
  font-weight: 500;
}
.care {
  margin: 24rpx;
  padding: 32rpx;
  background: #f7f3f2;
  border-radius: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.care__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(202, 235, 204, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.care__body {
  flex: 1;
}
.care__head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.care__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #4e6b53;
}
.care__text {
  display: block;
  font-size: 24rpx;
  color: #524345;
  line-height: 1.8;
  white-space: pre-line;
}
.actionbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
  gap: 24rpx;
}
.actionbar__icons {
  display: flex;
  gap: 32rpx;
}
.ab-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: #524345;
}
.actionbar__btns {
  flex: 1;
  display: flex;
  gap: 16rpx;
}
.ab-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 999rpx;
}
.ab-btn--cart {
  background: #e5e2e1;
  color: #1c1b1b;
}
.ab-btn--buy {
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
}
</style>
