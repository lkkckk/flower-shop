<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="36" color="#1c1b1b" />
      </view>
      <text class="topbar__title">物流详情</text>
      <view class="topbar__btn">
        <icon name="support_agent" :size="36" color="#884d59" />
      </view>
    </view>

    <view class="map">
      <image class="map__img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_RMnsIa4q_O92EurA8V3AITO1IFixfH6RONYHNl1mpx45fpJUMwQ0Ch8Id4FONgRkSq2rSQ56rvXoC_3Rk_pLCDREJDpfpK0JQM2VWKBN0uebr1VW3MKjmhtJ4BOrt-LRCDd7l7ufolJn2ZktsI8IY5voMAbB5B1zd0gd81nUTOZXTGIpDPHzhP25nY0fIVNeCFlTeRkDYgJbbCF1fYvykffCTrX0ZOsAobs2a56vlb32rgTz5WFu30xDgSBjA0wZXLCsHoURe5CR" mode="aspectFill" />
      <view class="map__overlay"></view>
      <view class="map__pin">
        <view class="pin">
          <icon name="local_florist" :size="36" color="#ffffff" fill />
        </view>
        <view class="pin__label">配送中</view>
      </view>
    </view>

    <view class="main">
      <view class="status">
        <view class="status__head">
          <view class="status__icon">
            <icon name="local_shipping" :size="36" color="#ffffff" fill />
          </view>
          <view class="status__body">
            <text class="status__title">正在派送中</text>
            <text class="status__sub">配送员正在前往你的地址，预计 18:00 前送达</text>
          </view>
        </view>
        <view class="status__foot">
          <view class="info-cell">
            <text class="info-cell__label">承运公司</text>
            <text class="info-cell__value">顺丰速运 (SF Express)</text>
          </view>
          <view class="info-cell">
            <text class="info-cell__label">运单号</text>
            <view class="copy-btn" @click="copyWaybill">
              <text class="copy-btn__text">SF109283746500</text>
              <icon name="content_copy" :size="22" color="#49654d" />
            </view>
          </view>
          <view class="info-cell">
            <text class="info-cell__label">配送员</text>
            <view class="info-cell__copy">
              <text class="info-cell__value">林师傅 · 188****8866</text>
              <icon name="call" :size="24" color="#884d59" fill />
            </view>
          </view>
        </view>
      </view>

      <view class="track">
        <text class="track__title">配送轨迹</text>
        <view class="steps">
          <view v-for="(s, i) in steps" :key="i" class="step">
            <view class="step__line">
              <view class="step__dot" :class="{ 'step__dot--active': i === 0 }">
                <view v-if="i === 0" class="step__pulse"></view>
              </view>
              <view v-if="i < steps.length - 1" class="step__bar"></view>
            </view>
            <view class="step__body" :class="{ 'step__body--active': i === 0 }">
              <text class="step__title">{{ s.title }}</text>
              <text class="step__text">{{ s.text }}</text>
              <text class="step__time">{{ s.time }}</text>
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
      steps: [
        { title: '派送中', text: '【上海市】包裹正在派送中，请准备签收。派件员：林师傅', time: '今天 09:42' },
        { title: '到达集散中心', text: '【上海市】已到达 上海徐汇花卉集散中心，正在分拣', time: '上午 06:15' },
        { title: '运输中', text: '【昆明市】已离开 昆明斗南鲜花基地，发往 上海市', time: '昨天 22:30' },
        { title: '已揽收', text: '【昆明市】顺丰速运 已收取快件，花艺师已将您的花束打包完成。', time: '昨天 16:45' }
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    copyWaybill() {
      uni.setClipboardData({
        data: 'SF109283746500',
        success: () => uni.showToast({ title: '已复制运单号', icon: 'none' })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fcf8f7;
  padding-bottom: 48rpx;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
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
.map {
  position: relative;
  width: 100%;
  height: 420rpx;
  background: #e5e2e1;
  overflow: hidden;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
}
.map__img {
  width: 100%;
  height: 100%;
  opacity: 0.82;
}
.map__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(252, 248, 247, 0.92), rgba(252, 248, 247, 0.2), transparent);
}
.map__pin {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pin {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(136, 77, 89, 0.4);
}
.pin__label {
  margin-top: 12rpx;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #884d59;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(28, 27, 27, 0.08);
}
.main {
  padding: 0 32rpx;
  margin-top: -72rpx;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.status {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 30rpx rgba(28, 27, 27, 0.06);
}
.status__head {
  display: flex;
  gap: 24rpx;
  padding-bottom: 32rpx;
  border-bottom: 2rpx solid rgba(214, 194, 196, 0.16);
}
.status__icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.status__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.status__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #884d59;
}
.status__sub {
  font-size: 24rpx;
  color: #524345;
  line-height: 1.5;
}
.status__foot {
  padding-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.info-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-cell__label {
  font-size: 24rpx;
  color: #847375;
}
.info-cell__value {
  font-size: 26rpx;
  color: #1c1b1b;
  font-weight: 500;
}
.info-cell__copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.copy-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(202, 235, 204, 0.34);
}
.copy-btn__text {
  font-size: 24rpx;
  color: #1c1b1b;
  font-weight: 500;
}
.track {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
}
.track__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1c1b1b;
  margin-bottom: 32rpx;
}
.steps {
  display: flex;
  flex-direction: column;
  position: relative;
}
.step {
  display: flex;
  gap: 24rpx;
  padding-bottom: 40rpx;
}
.step:last-child {
  padding-bottom: 0;
}
.step__line {
  position: relative;
  width: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.step__dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #d6c2c4;
  margin-top: 12rpx;
  flex-shrink: 0;
  position: relative;
}
.step__dot--active {
  width: 28rpx;
  height: 28rpx;
  background: #884d59;
  box-shadow: 0 0 0 6rpx rgba(241, 167, 180, 0.3);
}
.step__pulse {
  position: absolute;
  inset: -6rpx;
  border-radius: 50%;
  border: 3rpx solid #f1a7b4;
  animation: pulse2 1.8s infinite;
}
@keyframes pulse2 {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}
.step__bar {
  flex: 1;
  width: 3rpx;
  background: rgba(214, 194, 196, 0.4);
  margin-top: 8rpx;
}
.step__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding-bottom: 8rpx;
}
.step__title {
  font-size: 28rpx;
  color: #524345;
  font-weight: 500;
}
.step__body--active .step__title {
  color: #884d59;
  font-weight: 700;
  font-size: 30rpx;
}
.step__text {
  font-size: 24rpx;
  color: #847375;
  line-height: 1.6;
}
.step__time {
  font-size: 22rpx;
  color: #d6c2c4;
  letter-spacing: 1rpx;
}
</style>
