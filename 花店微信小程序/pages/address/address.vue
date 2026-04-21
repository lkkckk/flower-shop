<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__btn" @click="goBack">
        <icon name="arrow_back_ios_new" :size="32" color="#884d59" />
      </view>
      <text class="topbar__title">植物诗意</text>
      <view class="topbar__btn"></view>
    </view>
    <view class="topbar__divider"></view>

    <view class="main">
      <view class="head">
        <text class="head__title">收货地址</text>
        <text class="head__desc">管理您的配送信息</text>
      </view>

      <view class="list">
        <view
          v-for="(a, i) in addresses"
          :key="i"
          class="card"
          :class="{ 'card--default': a.isDefault }"
        >
          <view class="card__decor" v-if="a.isDefault"></view>
          <view class="card__head">
            <view class="card__identity">
              <text class="card__name">{{ a.name }}</text>
              <text v-if="a.isDefault" class="tag tag--default">默认</text>
              <text class="tag tag--type">{{ a.type }}</text>
            </view>
            <text class="card__phone">{{ a.phone }}</text>
          </view>

          <text class="card__detail">{{ a.detailLine1 }}</text>
          <text class="card__detail">{{ a.detailLine2 }}</text>

          <view class="card__foot">
            <view class="switch-row" @click="setDefault(i)">
              <view class="switch" :class="{ 'switch--on': a.isDefault }">
                <view class="switch__dot"></view>
              </view>
              <text :class="{ 'switch-row__on': a.isDefault }">
                {{ a.isDefault ? '默认地址' : '设为默认' }}
              </text>
            </view>
            <view class="actions">
              <view class="action" @click="edit(i)">
                <icon name="edit" :size="18" color="#524345" />
                <text>编辑</text>
              </view>
              <view class="action action--danger" @click="remove(i)">
                <icon name="delete" :size="18" color="#ba1a1a" />
                <text>删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="add-wrap">
      <view class="add-btn" @click="add">
        <icon name="add" :size="20" color="#ffffff" />
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
          name: '林语夕',
          phone: '138****5678',
          type: '家',
          detailLine1: '上海市静安区南京西路 1266 号',
          detailLine2: '恒隆广场 1 座 66 层',
          isDefault: true
        },
        {
          name: '张爱玲',
          phone: '139****1234',
          type: '公司',
          detailLine1: '北京市朝阳区建国路 87 号',
          detailLine2: '北京 SKP 8 层',
          isDefault: false
        }
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    setDefault(i) {
      this.addresses.forEach((address, index) => {
        address.isDefault = index === i
      })
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
  padding-bottom: 180rpx;
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
  color: #884d59;
  font-weight: 700;
  letter-spacing: -0.6rpx;
}
.topbar__divider {
  height: 10rpx;
  background: linear-gradient(to bottom, #f7f3f2, rgba(247, 243, 242, 0));
}

.main {
  padding: 24rpx 32rpx;
}
.head {
  margin-bottom: 20rpx;
}
.head__title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #884d59;
  letter-spacing: -1rpx;
}
.head__desc {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #524345;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  position: relative;
  overflow: hidden;
  background: #f7f3f2;
  border-radius: 32rpx;
  padding: 40rpx;
}
.card--default {
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(136, 77, 89, 0.08);
}
.card__decor {
  position: absolute;
  top: -26rpx;
  right: -20rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: rgba(136, 77, 89, 0.06);
}
.card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14rpx;
  position: relative;
}
.card__identity {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.card__name {
  font-size: 34rpx;
  color: #1c1b1b;
  font-weight: 700;
}
.tag {
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}
.tag--default {
  background: rgba(136, 77, 89, 0.12);
  color: #884d59;
}
.tag--type {
  background: #e5e2e1;
  color: #524345;
}
.card__phone {
  font-size: 26rpx;
  color: #524345;
}
.card__detail {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: #524345;
}
.card__foot {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 2rpx solid rgba(214, 194, 196, 0.22);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  color: #847375;
}
.switch-row__on {
  color: #884d59;
  font-weight: 600;
}
.switch {
  width: 68rpx;
  height: 38rpx;
  border-radius: 999rpx;
  background: #d6c2c4;
  padding: 4rpx;
  display: flex;
  align-items: center;
  transition: all 0.25s ease;
}
.switch--on {
  background: #884d59;
}
.switch__dot {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.25s ease;
}
.switch--on .switch__dot {
  transform: translateX(30rpx);
}

.actions {
  display: flex;
  gap: 20rpx;
}
.action {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #524345;
}
.action--danger {
  color: #ba1a1a;
}

.add-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #fcf8f7, rgba(252, 248, 247, 0.86), rgba(252, 248, 247, 0));
}
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  padding: 32rpx 0;
  box-shadow: 0 8rpx 26rpx rgba(136, 77, 89, 0.22);
}
</style>
