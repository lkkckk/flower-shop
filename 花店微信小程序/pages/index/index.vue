<template>
  <view class="page">
    <!-- Top App Bar -->
    <view class="topbar">
      <view class="topbar__left">
        <icon name="local_florist" :size="44" color="#884d59" />
        <text class="topbar__title">植物诗集</text>
      </view>
      <view class="topbar__right" @click="onSearch">
        <icon name="search" :size="44" color="#884d59" />
      </view>
    </view>
    <view class="topbar__divider"></view>

    <view class="main">
      <!-- Search Bar -->
      <view class="search">
        <view class="search__icon">
          <icon name="search" :size="32" color="#847375" />
        </view>
        <input class="search__input" placeholder="寻找你的专属花语..." placeholder-class="search__ph" />
      </view>

      <!-- Hero -->
      <view class="hero">
        <image class="hero__img" :src="heroImg" mode="aspectFill" />
        <view class="hero__mask"></view>
        <view class="hero__content">
          <text class="hero__tag">春季限定</text>
          <text class="hero__title">落樱飞雪</text>
          <text class="hero__title">粉霜玫瑰花束</text>
          <text class="hero__desc">细腻柔软的粉霜玫瑰，如初雪般纯净。</text>
          <view class="hero__btn" @click="goProduct">立即选购</view>
        </view>
        <view class="hero__dots">
          <view class="dot dot--active"></view>
          <view class="dot"></view>
          <view class="dot"></view>
        </view>
      </view>

      <!-- Quick Links -->
      <view class="quick">
        <view class="quick__item" v-for="(q, i) in quicks" :key="i">
          <view class="quick__circle">
            <icon :name="q.icon" :size="40" :color="q.color" />
          </view>
          <text class="quick__label">{{ q.label }}</text>
        </view>
      </view>

      <!-- Weekly Recommendations -->
      <view class="week">
        <view class="week__head">
          <view>
            <text class="week__title">本周推荐</text>
            <text class="week__subtitle">精选当季鲜花，传递自然之美</text>
          </view>
          <view class="week__more">
            <text>查看全部</text>
            <icon name="arrow_forward_ios" :size="20" color="#884d59" />
          </view>
        </view>

        <view class="week__grid">
          <!-- Large card -->
          <view class="bcard bcard--wide" @click="goProduct">
            <image class="bcard__img" :src="p1Img" mode="aspectFill" />
            <view class="bcard__body">
              <text class="bcard__tag">FRAGRANT</text>
              <text class="bcard__title">晨露郁金香</text>
              <text class="bcard__desc">荷兰进口，自带清新香气</text>
              <view class="bcard__foot">
                <text class="bcard__price">¥ 198</text>
                <view class="bcard__btn">
                  <icon name="shopping_cart" :size="22" color="#884d59" />
                </view>
              </view>
            </view>
          </view>

          <!-- Small card 1 -->
          <view class="bcard" @click="goProduct">
            <view class="bcard__img-wrap">
              <image class="bcard__img" :src="p2Img" mode="aspectFill" />
              <view class="bcard__badge">热销</view>
            </view>
            <view class="bcard__body bcard__body--sm">
              <text class="bcard__title-sm">普罗旺斯之梦</text>
              <text class="bcard__desc">干花礼盒，长久留香</text>
              <view class="bcard__foot">
                <text class="bcard__price-sm">¥ 128</text>
                <view class="bcard__btn bcard__btn--sm">
                  <icon name="add" :size="20" color="#884d59" />
                </view>
              </view>
            </view>
          </view>

          <!-- Small card 2 -->
          <view class="bcard" @click="goProduct">
            <image class="bcard__img" :src="p3Img" mode="aspectFill" />
            <view class="bcard__body bcard__body--sm">
              <text class="bcard__title-sm">治愈系多肉</text>
              <text class="bcard__desc">桌面小绿植，易于养护</text>
              <view class="bcard__foot">
                <text class="bcard__price-sm">¥ 58</text>
                <view class="bcard__btn bcard__btn--sm">
                  <icon name="add" :size="20" color="#884d59" />
                </view>
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
      heroImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjP29zTZ4HlWR5ZUBZwiyYsSOEG0Ym0qB7XnKU1PGVWXtjx1jLZuUu_elcbqGFBF0GYM-0ERtiMO4T_hb0eh-7siDo9DWSR5xrEZpCCQzgm-VXrzXZsN1_LXUhWUFXIIq5W17brI2I4K5vf7T8wytAiT7m1IXIuMMHeP8bncUhkMyS2RhmdvnuL4oN2LHpFhFX7wkSC7qVWC2bseWlXxDxVK_1ifpNL5adl2nWRyvugqnobeitDp9ZvPsHOgq6NTGSC0XKz-x_Wjcm',
      p1Img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVNGQcKTEoFzg9IrA-ZMFeGstVCbWi8C0gAuo2EtHk2xbYVpLMEu2u28Gqa-VAuzIQVZDagDHKT7Vhlp802UptlNxFRRwK2ERnsRb4gi4j9n_EWQzEIcsaXm1PTzpe40IAG7QDQUEVNdepvFLGB-uW2WZnC_QjCl6YHE4gYuT1N0Og8pct-pNH9lC4dwttr63lQDD6duKXtv48cj13rpdzUfPe2KcCJNPqaU70tOWwJ7tRlpac2z6CFKQ0oHnLWXiteAoxJkqqjKXm',
      p2Img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuuyBhm5bknWgmkT8ruw1Dbh7VUXal6R5imCLkH-n2pyDHxtTTclFn9ad3Cvsk8OiZZNEGHn7NFznrocYHDS6aHJtRVWweisQBKkG2cG9U1L7uETjsmpvGH0vfaUJKZBdYlrL3xVFZhkAK4vNZxYbbSn2kDsVMnXFujTmCEDd4mK4iQvHOTEfRUmMJsr8A3E07K7MkiIV0tGu4CT5Vm2F42_akfXo-KedCFWOyar35HzN2w6lIfSX7-E70amFu0kusx3DqZpAizmED',
      p3Img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdnnOlsyAiM49R_Hu7Mq711lDEpfvrnQAja_REIYERpdxwpWMDeegsdSfH5nhINxR8yBtgNTJQYFVE5jJ9DT6sUnD3GZkQgEfZuD3njBiTm0qIS1ta_5nOtZ2mYYXsGSLym25qTvlRQqZV-cMaa2QMO83oor1X_ZwdZPyZ6xE3gEkQnqz1M7O-NiQKoaTCh-tZs3xxuvhXPnKMKfUS6AVhoZ8irWn7BkKQaBoWvxJB0ogK5M_xCc-GQNegWFKDaPhjZGmlccqhK5Yp',
      quicks: [
        { icon: 'redeem', label: '节日花束', color: '#884d59' },
        { icon: 'storefront', label: '开业花篮', color: '#884d59' },
        { icon: 'all_inclusive', label: '永生花', color: '#884d59' },
        { icon: 'potted_plant', label: '绿植盆栽', color: '#49654d' }
      ]
    }
  },
  methods: {
    onSearch() {
      uni.showToast({ title: '搜索', icon: 'none' })
    },
    goProduct() {
      uni.navigateTo({ url: '/pages/product/product' })
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 48rpx;
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
}
.topbar__divider {
  position: fixed;
  top: 124rpx;
  left: 0;
  right: 0;
  z-index: 49;
  height: 10rpx;
  background: linear-gradient(to bottom, #f7f3f2, rgba(247, 243, 242, 0));
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.topbar__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #884d59;
  letter-spacing: -1rpx;
}
.topbar__right {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main {
  padding: 160rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 64rpx;
}

/* Search */
.search {
  position: relative;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  height: 96rpx;
}
.search__icon {
  margin-right: 16rpx;
}
.search__input {
  flex: 1;
  font-size: 28rpx;
  color: #1c1b1b;
}
.search__ph {
  color: #d6c2c4;
}

/* Hero */
.hero {
  position: relative;
  height: 720rpx;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(28, 27, 27, 0.06);
}
.hero__img {
  width: 100%;
  height: 100%;
}
.hero__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.1), transparent);
}
.hero__content {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  color: #ffffff;
}
.hero__tag {
  align-self: flex-start;
  padding: 6rpx 24rpx;
  background: rgba(229, 226, 225, 0.3);
  border-radius: 4rpx;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
  backdrop-filter: blur(10rpx);
}
.hero__title {
  font-size: 60rpx;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -1rpx;
}
.hero__desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
  margin-bottom: 24rpx;
  font-weight: 300;
}
.hero__btn {
  align-self: flex-start;
  padding: 16rpx 44rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(28, 27, 27, 0.1);
}
.hero__dots {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  gap: 10rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}
.dot--active {
  background: #ffffff;
}

/* Quick */
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 0 16rpx;
}
.quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.quick__circle {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: #f7f3f2;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(28, 27, 27, 0.03);
}
.quick__label {
  font-size: 24rpx;
  color: #524345;
  font-weight: 500;
}

/* Week */
.week {
  padding-bottom: 48rpx;
}
.week__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 48rpx;
}
.week__title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #1c1b1b;
  letter-spacing: -1rpx;
}
.week__subtitle {
  display: block;
  font-size: 28rpx;
  color: #847375;
  margin-top: 8rpx;
  font-weight: 300;
}
.week__more {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #884d59;
  font-size: 24rpx;
  font-weight: 600;
}

.week__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.bcard {
  background: #ffffff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.03);
  display: flex;
  flex-direction: column;
}
.bcard--wide {
  grid-column: span 2;
  flex-direction: row;
}
.bcard__img {
  width: 100%;
  height: 256rpx;
}
.bcard--wide .bcard__img {
  width: 268rpx;
  height: 256rpx;
  flex-shrink: 0;
}
.bcard__img-wrap {
  position: relative;
}
.bcard__badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 16rpx;
  background: rgba(252, 248, 247, 0.8);
  color: #1c1b1b;
  font-size: 20rpx;
  border-radius: 4rpx;
  backdrop-filter: blur(8rpx);
}
.bcard__body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
}
.bcard__body--sm {
  padding: 24rpx;
}
.bcard__tag {
  align-self: flex-start;
  padding: 2rpx 12rpx;
  background: #e5e2e1;
  color: #524345;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
}
.bcard__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1c1b1b;
  line-height: 1.2;
  margin-bottom: 4rpx;
}
.bcard__title-sm {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1b1b;
  line-height: 1.2;
  margin-bottom: 4rpx;
}
.bcard__desc {
  font-size: 24rpx;
  color: #847375;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}
.bcard__price {
  font-size: 36rpx;
  font-weight: 700;
  color: #884d59;
}
.bcard__price-sm {
  font-size: 32rpx;
  font-weight: 700;
  color: #884d59;
}
.bcard__btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(241, 167, 180, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bcard__btn--sm {
  width: 48rpx;
  height: 48rpx;
}
</style>
