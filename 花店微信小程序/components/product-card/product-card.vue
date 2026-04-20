<template>
  <view class="pcard" :class="{ 'pcard--wide': wide }" @click="$emit('click')">
    <view class="pcard__img-wrap">
      <image class="pcard__img" :src="image" mode="aspectFill" />
      <view v-if="badge" class="pcard__badge">{{ badge }}</view>
    </view>
    <view class="pcard__body">
      <view v-if="tag" class="pcard__tag">{{ tag }}</view>
      <text class="pcard__title">{{ title }}</text>
      <text class="pcard__desc">{{ desc }}</text>
      <view class="pcard__foot">
        <text class="pcard__price">¥ {{ price }}</text>
        <view class="pcard__btn">
          <icon :name="btnIcon" :size="24" color="#884d59" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Icon from '@/components/icon/icon.vue'
export default {
  name: 'ProductCard',
  components: { Icon },
  props: {
    image: String,
    title: String,
    desc: String,
    price: [Number, String],
    tag: String,
    badge: String,
    wide: Boolean,
    btnIcon: { type: String, default: 'add' }
  }
}
</script>

<style lang="scss" scoped>
.pcard {
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 40rpx rgba(28, 27, 27, 0.03);
  display: flex;
  flex-direction: column;
}
.pcard--wide {
  flex-direction: row;
  grid-column: span 2;
}

.pcard__img-wrap {
  position: relative;
  width: 100%;
  height: 256rpx;
  overflow: hidden;
  background: #f7f3f2;
}
.pcard--wide .pcard__img-wrap {
  width: 40%;
  height: auto;
  min-height: 192rpx;
}

.pcard__img {
  width: 100%;
  height: 100%;
}

.pcard__badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 2rpx 16rpx;
  background: rgba(252, 248, 247, 0.8);
  color: #1c1b1b;
  font-size: 20rpx;
  border-radius: 4rpx;
  backdrop-filter: blur(8rpx);
}

.pcard__body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.pcard--wide .pcard__body {
  width: 60%;
  padding: 32rpx;
  justify-content: center;
}

.pcard__tag {
  align-self: flex-start;
  padding: 2rpx 16rpx;
  background: #e5e2e1;
  color: #524345;
  font-size: 20rpx;
  letter-spacing: 1rpx;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
  text-transform: uppercase;
}

.pcard__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1b1b;
  line-height: 1.3;
  margin-bottom: 8rpx;
}

.pcard__desc {
  font-size: 22rpx;
  color: #847375;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  margin-bottom: 16rpx;
}

.pcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.pcard__price {
  font-size: 32rpx;
  font-weight: 700;
  color: #884d59;
}

.pcard__btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(241, 167, 180, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
