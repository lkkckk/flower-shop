<template>
  <view class="page">
    <!-- Top App Bar -->
    <view class="topbar">
      <view class="topbar__left">
        <icon name="local_florist" :size="40" color="#884d59" />
        <text class="topbar__title">植物诗集</text>
      </view>
      <view class="topbar__right">
        <icon name="menu" :size="40" color="#847375" />
      </view>
    </view>
    <view class="topbar__divider"></view>

    <view class="layout">
      <!-- Sidebar -->
      <scroll-view class="sidebar" scroll-y>
        <view
          v-for="(c, i) in categories"
          :key="i"
          class="sbitem"
          :class="{ 'sbitem--active': current === i }"
          @click="current = i"
        >
          <view v-if="current === i" class="sbitem__bar"></view>
          <view class="sbitem__icon" :class="{ 'sbitem__icon--active': current === i }">
            <icon :name="c.icon" :size="26" :color="current === i ? '#884d59' : '#847375'" />
          </view>
          <text class="sbitem__text" :class="{ 'sbitem__text--active': current === i }">
            {{ c.name }}
          </text>
        </view>
      </scroll-view>

      <!-- Content -->
      <scroll-view class="content" scroll-y>
        <view class="content__head">
          <text class="content__title">{{ categories[current].name }}系列</text>
          <text class="content__desc">{{ categories[current].desc }}</text>
        </view>

        <view class="grid">
          <!-- Hero card -->
          <view class="pcard pcard--hero" @click="goProduct">
            <view class="pcard__img-wrap">
              <image class="pcard__img" :src="products[0].img" mode="aspectFill" />
              <view class="pcard__badge">推荐</view>
            </view>
            <view class="pcard__body pcard__body--hero">
              <view class="pcard__row">
                <text class="pcard__title-hero">{{ products[0].title }}</text>
                <text class="pcard__price-hero">¥{{ products[0].price }}</text>
              </view>
              <text class="pcard__desc">{{ products[0].desc }}</text>
              <view class="pcard__foot">
                <text class="pcard__chip">热销中</text>
                <view class="pcard__btn pcard__btn--grad">
                  <icon name="add_shopping_cart" :size="22" color="#ffffff" />
                </view>
              </view>
            </view>
          </view>

          <!-- Normal cards -->
          <view
            v-for="(p, i) in products.slice(1)"
            :key="i"
            class="pcard"
            @click="goProduct"
          >
            <image class="pcard__img" :src="p.img" mode="aspectFill" />
            <view class="pcard__body">
              <text class="pcard__title">{{ p.title }}</text>
              <text class="pcard__desc">{{ p.desc }}</text>
              <view class="pcard__foot">
                <text class="pcard__price">¥{{ p.price }}</text>
                <view class="pcard__btn-plain">
                  <icon name="add_circle" :size="28" color="#884d59" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="end-tip">没有更多商品了，去其他分类看看吧～</view>
      </scroll-view>
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
      categories: [
        { name: '红玫瑰', icon: 'eco', desc: '象征着热烈的爱与浪漫，精选高品质红玫瑰，为每一个特别的时刻增添心动。' },
        { name: '康乃馨', icon: 'local_florist', desc: '温柔母爱的象征，适合感恩与祝福。' },
        { name: '郁金香', icon: 'spa', desc: '荷兰经典花卉，传递优雅与深情。' },
        { name: '向日葵', icon: 'filter_vintage', desc: '阳光向上，代表忠诚与光明。' },
        { name: '百合', icon: 'local_florist', desc: '纯洁高雅，百年好合。' },
        { name: '满天星', icon: 'auto_awesome', desc: '浪漫点缀，守护甜蜜。' },
        { name: '桔梗', icon: 'spa', desc: '真诚不变的爱。' }
      ],
      products: [
        {
          title: '挚爱永恒 · 99朵红玫瑰',
          desc: '精选昆明顶级红玫瑰，搭配高级黑灰色包装纸，尽显低调奢华，适合表白、纪念日等重要场合。',
          price: 599,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIKZ4i-yyq4_MBBvFsPZ8f2eO7_JHcT4eOT-qxhmj2aPA61JDIBKCy9DslkdTWce3EFtdct9ITjbHYii4bXN-LVL6fsGifQrZYTAkzkn7RnUfHFkZ7jSiW2mgXycLmINnq6OEgYlrQSS1MQ3xgFbCg5Ekp2LLX9L4uQ6ZErOJo9CO1ldnOVJStrcuPQdksXP0ivPb07yOA8cEey-e6RQF3X88V07QP2NCXUGc7H82CUQru4j5ZvS9xVTrNgagsBXwI6liZi5u9oiAp'
        },
        {
          title: '初见 · 单支装',
          desc: '简约而不简单的单支红玫瑰，适合日常小惊喜。',
          price: 39,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCObvGQ2s6rvMc5VoyA93im0VmBGyiZ5QUN1scBx3YlQnJIv8H9SEiD7TxhzpZ7Je5inPuodlxtIGITXojwZp1TNtOYaRkcostT4bzOfM5nhVmKKhsq-zLg2UmNkmixH_CVVD8cV15iIHrp3HapwA4PHJ1x-0CPqE3U3NdL9vsFDyTYIQK1SodpjbZivPA2r0Z-7o4UTgFhRsShOIyEIhAeTJ5JUEVw6zV4Icn1rLcU7w1d5L2uImI7kU4eRnsK4oXF5XNyPBdrl9je'
        },
        {
          title: '一心一意 · 11朵',
          desc: '11朵红玫瑰代表一生只爱你一人，经典之选。',
          price: 129,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCTpMXRV6xD3LgRGl0P7lpdwpEDkSGd4XzYmFD_WB_Xn8PGe9MWTI5hyAegkpP_v8zhmAcpocCh-SV8FFeVhNU6WpBUcq3mleRsuAcLfgtTRXoN747sLSPc0mLt1VHysRy5ytWVuSDlpNsjb8_pAxSbTqZYpnb9Z5eWpxV4oKRHivs2lCbAImzJ02cRmWpeWmMuCHpr540QP0oy2p2Uv9DUozqphqYga277n2xAVUNmtEQW9_P5i_9e1Y_LgeeldTsi288ApiyYABD'
        },
        {
          title: '浪漫满屋 · 抱抱桶',
          desc: '精致的丝绒抱抱桶搭配新鲜红玫瑰，高级感满满。',
          price: 259,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZUVbqBtW1aTJKkPI23XVwq22AT9IJRVc8DNk3WhZMkdcP7AgQwNsnxiDlowzvpbzmUDO2pXF8TgWF_qaNEicFjZIIb1EgA7suwqv0dd1TSiMeMSTXLeUI1KaSk9igESySfFT82HJP0SGqEQqr2o7cGm48rCTcXleY8pKqfkePcGilMt02FQp_-tbrnlj06uR_VWhP5SaZaioqV2_VtxKm5SREErhb2cfgejWa-q3cs9w2FbcxCj0SX_CVcKx_9B0w2q8n4EUQIDAQ'
        },
        {
          title: '森系红颜 · 瓶花',
          desc: '红玫瑰与尤加利叶的完美结合，适合居家点缀。',
          price: 189,
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkdMJ0Va2-Wi2BTbY5mD8Vvyl4B1nSyrrMEHHIgP2HHzaBIzxa8bCHXjRZ7qU0OwWaPnxWsI9vhXlR7snxaAQPks0uFbLH11A8r0Lt0Q7VBNmkk5QcQ0pye2DeOxvI886QfL10Ih_I9vSN1r8wUMZSzS1bUqTrtW4oZJPJXKt0qSa72pGzgSJzH7uLl07XoPEd8sXHZ5CW3h7qSA_B4lz05c2rnGHdwLxMZEQihWeEYqkpE8dbTSSJDz05SQPRbT8YjtHqUHaeW27V'
        }
      ]
    }
  },
  methods: {
    goProduct() {
      uni.navigateTo({ url: '/pages/product/product' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #fcf8f7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
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
  color: #884d59;
}
.topbar__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #884d59;
  letter-spacing: -1rpx;
}

.layout {
  flex: 1;
  display: flex;
  height: 100vh;
  padding-top: 132rpx;
}

.sidebar {
  width: 160rpx;
  background: #f7f3f2;
  height: 100%;
  border-top-right-radius: 20rpx;
}

.sbitem {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 10rpx;
}
.sbitem--active {
  color: #884d59;
}
.sbitem__bar {
  position: absolute;
  left: 0;
  top: 24rpx;
  bottom: 24rpx;
  width: 6rpx;
  border-radius: 999rpx;
  background: linear-gradient(to bottom, #884d59, #f1a7b4);
}
.sbitem__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sbitem__icon--active {
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.sbitem__text {
  font-size: 20rpx;
  color: #524345;
}
.sbitem__text--active {
  color: #884d59;
  font-weight: 700;
}

.content {
  flex: 1;
  padding: 32rpx;
  height: 100%;
}
.content__head {
  margin-bottom: 32rpx;
}
.content__title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #1c1b1b;
  letter-spacing: -1rpx;
}
.content__desc {
  display: block;
  font-size: 24rpx;
  color: #524345;
  margin-top: 16rpx;
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.pcard {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pcard--hero {
  grid-column: span 2;
  grid-row: span 2;
}
.pcard__img-wrap {
  position: relative;
}
.pcard__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  height: 280rpx;
}
.pcard--hero .pcard__img {
  height: 460rpx;
}
.pcard__badge {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  padding: 4rpx 24rpx;
  background: rgba(229, 226, 225, 0.8);
  color: #524345;
  font-size: 20rpx;
  letter-spacing: 2rpx;
  font-weight: 700;
  border-radius: 4rpx;
  backdrop-filter: blur(10rpx);
}
.pcard__body {
  padding: 32rpx;
  background: #f7f3f2;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.pcard__body--hero {
  background: #f7f3f2;
  padding: 40rpx;
  margin: -64rpx 32rpx 32rpx 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  position: relative;
  z-index: 2;
}
.pcard__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.pcard__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1b1b;
  margin-bottom: 8rpx;
  line-height: 1.2;
}
.pcard__title-hero {
  font-size: 36rpx;
  font-weight: 700;
  color: #1c1b1b;
  flex: 1;
  padding-right: 16rpx;
}
.pcard__price-hero {
  font-size: 36rpx;
  font-weight: 700;
  color: #884d59;
}
.pcard__desc {
  font-size: 24rpx;
  color: #524345;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.pcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}
.pcard__chip {
  padding: 4rpx 16rpx;
  background: #caebcc;
  color: #49654d;
  font-size: 22rpx;
  border-radius: 4rpx;
}
.pcard__price {
  font-size: 30rpx;
  font-weight: 700;
  color: #884d59;
}
.pcard__btn-plain {
  color: #884d59;
}
.pcard__btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pcard__btn--grad {
  background: linear-gradient(135deg, #884d59, #f1a7b4);
  box-shadow: 0 4rpx 8rpx rgba(136, 77, 89, 0.2);
}

.end-tip {
  text-align: center;
  color: #524345;
  font-size: 24rpx;
  margin: 96rpx 0 64rpx;
}
</style>
