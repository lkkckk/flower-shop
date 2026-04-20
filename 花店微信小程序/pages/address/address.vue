<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="36" color="#1c1b1b" />
      </view>
      <text class="topbar__title">收货地址</text>
      <view class="topbar__btn"></view>
    </view>

    <view class="main">
      <view
        v-for="(a, i) in addresses"
        :key="i"
        class="addr"
        :class="{ 'addr--default': a.isDefault }"
      >
        <view class="addr__head">
          <view class="addr__name-row">
            <text class="addr__name">{{ a.name }}</text>
            <text class="addr__phone">{{ a.phone }}</text>
            <view v-if="a.isDefault" class="addr__tag">默认</view>
          </view>
          <view class="addr__actions">
            <view class="addr__action" @click="edit(i)">
              <icon name="edit" :size="28" color="#884d59" />
            </view>
            <view class="addr__action" @click="remove(i)">
              <icon name="delete" :size="28" color="#884d59" />
            </view>
          </view>
        </view>
        <text class="addr__detail">{{ a.detail }}</text>
        <view class="addr__foot">
          <view class="addr__radio" @click="setDefault(i)">
            <view class="radio" :class="{ 'radio--on': a.isDefault }">
              <view v-if="a.isDefault" class="radio__dot"></view>
            </view>
            <text>设为默认地址</text>
          </view>
        </view>
      </view>
    </view>

    <view class="addbar">
      <view class="addbtn" @click="add">
        <icon name="add" :size="36" color="#ffffff" />
        <text>新增收货地址</text>
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
      addresses: [
        {
          name: '张小花',
          phone: '188****8888',
          detail: '上海市徐汇区虹漕路 88 弄 8 号楼 808 室',
          isDefault: true
        },
        {
          name: '李花匠',
          phone: '139****1234',
          detail: '上海市静安区南京西路 1788 号恒隆广场 B 座 20F',
          isDefault: false
        }
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    setDefault(i) {
      this.addresses.forEach((a, idx) => { a.isDefault = idx === i })
    },
    edit() { uni.showToast({ title: '编辑地址', icon: 'none' }) },
    remove() { uni.showToast({ title: '删除地址', icon: 'none' }) },
    add() { uni.showToast({ title: '新增地址', icon: 'none' }) }
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
.main {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.addr {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 27, 27, 0.04);
  border: 2rpx solid transparent;
}
.addr--default {
  background: linear-gradient(135deg, #ffd9de 0%, #f7f3f2 100%);
  border-color: #f1a7b4;
}
.addr__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.addr__name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.addr__name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1b1b;
}
.addr__phone {
  font-size: 26rpx;
  color: #524345;
}
.addr__tag {
  padding: 4rpx 14rpx;
  background: #884d59;
  color: #ffffff;
  font-size: 20rpx;
  border-radius: 8rpx;
  font-weight: 500;
}
.addr__actions {
  display: flex;
  gap: 20rpx;
}
.addr__action {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.addr__detail {
  display: block;
  font-size: 26rpx;
  color: #524345;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.addr__foot {
  padding-top: 20rpx;
  border-top: 2rpx solid rgba(214, 194, 196, 0.3);
}
.addr__radio {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: #524345;
}
.radio {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 3rpx solid #d6c2c4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio--on {
  border-color: #884d59;
}
.radio__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #884d59;
}
.addbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(252, 248, 247, 0.9);
  backdrop-filter: blur(20rpx);
}
.addbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx 0;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(136, 77, 89, 0.3);
}
</style>
