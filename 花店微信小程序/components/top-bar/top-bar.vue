<template>
  <view class="top-bar-wrap">
    <view :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="top-bar">
      <view class="top-bar__left" @click="onBack">
        <slot name="left">
          <icon v-if="showBack" name="arrow_back_ios_new" :size="36" :color="iconColor" />
        </slot>
      </view>
      <view class="top-bar__title">
        <slot name="title">
          <text class="top-bar__title-text" :style="{ color: titleColor }">{{ title }}</text>
        </slot>
      </view>
      <view class="top-bar__right">
        <slot name="right"></slot>
      </view>
    </view>
    <view class="top-bar__shadow"></view>
  </view>
</template>

<script>
import Icon from '@/components/icon/icon.vue'

export default {
  name: 'TopBar',
  components: { Icon },
  props: {
    title: { type: String, default: '' },
    titleColor: { type: String, default: '#884d59' },
    iconColor: { type: String, default: '#884d59' },
    showBack: { type: Boolean, default: true },
    fixed: { type: Boolean, default: false }
  },
  data() {
    return { statusBarHeight: 20 }
  },
  created() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 20
    } catch (e) {}
  },
  methods: {
    onBack() {
      if (!this.showBack) return
      this.$emit('back')
      const pages = getCurrentPages ? getCurrentPages() : []
      if (pages.length > 1) uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.top-bar-wrap {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 40rpx;
  width: 100%;
  box-sizing: border-box;
}

.top-bar__left,
.top-bar__right {
  min-width: 60rpx;
  min-height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-bar__title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-bar__title-text {
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
}

.top-bar__shadow {
  height: 16rpx;
  background: linear-gradient(to bottom, #f7f3f2, transparent);
}
</style>
