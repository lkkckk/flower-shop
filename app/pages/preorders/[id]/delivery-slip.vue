<template>
  <div v-if="order" class="slip-page">
    <div class="slip">
      <!-- 页头 -->
      <div class="slip-header">
        <div class="shop">{{ shopName }}</div>
        <div class="title">配送单</div>
        <div v-if="order.sourceChannel" class="source-tag">{{ order.sourceChannel }}</div>
      </div>

      <!-- 主表格 -->
      <table class="slip-table">
        <tbody>
          <tr>
            <td class="label">顾客姓名</td>
            <td>{{ order.customer?.name || order.receiverName || '-' }}</td>
            <td class="label">顾客电话</td>
            <td>{{ order.customer?.phone || order.receiverPhone || '-' }}</td>
          </tr>
          <tr>
            <td class="label">收货人</td>
            <td colspan="3">{{ order.receiverName || '-' }} · {{ order.receiverPhone || '-' }}</td>
          </tr>
          <tr>
            <td class="label">顾客地址</td>
            <td colspan="3">{{ order.deliveryAddress || '-' }}</td>
          </tr>
          <tr>
            <td class="label">配送时间</td>
            <td colspan="3">
              <span class="delivery-time">【{{ formatDeliveryTime(order.deliveryTime) }} 前送达】</span>
            </td>
          </tr>
          <tr>
            <td class="label">商品描述及<br/>参考照片</td>
            <td colspan="3" class="items-cell">
              <div v-for="item in order.items" :key="item.id" class="item-row">
                <div class="item-image">
                  <img
                    v-if="item.imageUrl || item.product?.imageUrl"
                    :src="item.imageUrl || item.product?.imageUrl"
                    alt="product"
                  />
                  <div v-else class="no-image">无图片</div>
                </div>
                <div class="item-info">
                  <div class="item-name">{{ item.product?.name }}</div>
                  <div class="item-sub">
                    <span v-if="item.grade">{{ item.grade }}</span>
                    <span v-if="item.color"> · {{ item.color }}</span>
                  </div>
                  <div class="item-qty">数量：{{ Number(item.qty).toFixed(1) }} {{ item.unit }}</div>
                </div>
              </div>
              <div class="items-summary">共 {{ order.items.length }} 个商品</div>
            </td>
          </tr>
          <tr>
            <td class="label">其他要求</td>
            <td colspan="3" class="notes-cell">
              <div v-if="order.notes" class="note-red">{{ order.notes }}</div>
              <div class="note-phones">
                <span>预订人电话：{{ order.customer?.phone || order.receiverPhone || '-' }}</span>
                <span v-if="order.receiverPhone" class="ml-6">收货人电话：{{ order.receiverPhone }}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="label">贺卡内容</td>
            <td colspan="3" class="card-cell">{{ order.cardMessage || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 页尾 -->
      <div class="footer-note" v-if="shopPhone">
        制作配送环节如有问题，请联系店铺电话：{{ shopPhone }}
      </div>

      <div class="barcode">
        <div class="barcode-title">订单条形码</div>
        <Barcode :value="order.orderNo" />
        <div class="barcode-text">{{ order.orderNo }}</div>
      </div>
    </div>
  </div>
  <div v-else class="text-center p-10 text-gray-400">加载中...</div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'

definePageMeta({ layout: false })
useHead({ title: '配送单打印 - 花店管理系统' })

const route = useRoute()
const order = ref<any>(null)
const shopName = ref('花店')
const shopPhone = ref('')

const formatDeliveryTime = (d: any) => {
  if (!d) return '-'
  return dayjs(d).format('YYYY年MM月DD日 HH时mm分')
}

// 简易纯 CSS 条形码（视觉上条纹 + 数字即可，不做严格 code128 编码）
const Barcode = defineComponent({
  name: 'SimpleBarcode',
  props: { value: { type: String, required: true } },
  setup(props) {
    return () => {
      const bars: any[] = []
      for (let i = 0; i < props.value.length * 3; i++) {
        const code = props.value.charCodeAt(i % props.value.length)
        const w = ((code + i) % 4) + 1
        const black = (code + i) % 2 === 0
        bars.push(
          h('div', {
            class: 'bar',
            style: {
              width: `${w}px`,
              background: black ? '#000' : 'transparent',
              height: '60px',
              display: 'inline-block',
            },
          }),
        )
      }
      return h('div', { class: 'barcode-bars' }, bars)
    }
  },
})

onMounted(async () => {
  const id = route.params.id
  if (!id) return
  try {
    const res: any = await $fetch(`/api/preorders/${id}`)
    if (res?.data) order.value = res.data

    // 读取店铺名称 / 电话
    try {
      const settingRes: any = await $fetch('/api/settings')
      const kv = settingRes?.data || {}
      shopName.value = kv.shop_name || kv.shopName || shopName.value
      shopPhone.value = kv.shop_phone || kv.shopPhone || ''
    } catch {}

    setTimeout(() => window.print(), 800)
  } catch (e) {
    console.error('Failed to load preorder', e)
  }
})
</script>

<style scoped>
.slip-page {
  background: #f5f5f5;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.slip {
  width: 210mm;
  min-height: 280mm;
  background: white;
  padding: 15mm 12mm;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #000;
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  position: relative;
}

.slip-header {
  text-align: center;
  position: relative;
  margin-bottom: 10px;
}

.shop {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.title {
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 4px;
}

.source-tag {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 14px;
  color: #666;
}

.slip-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 10px;
}

.slip-table td {
  border: 1px solid #333;
  padding: 8px 10px;
  vertical-align: top;
  line-height: 1.5;
}

.label {
  width: 90px;
  background: #fafafa;
  font-weight: bold;
  text-align: center;
  white-space: nowrap;
}

.delivery-time {
  font-weight: bold;
  font-size: 14px;
}

.items-cell {
  padding: 10px !important;
}

.item-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed #ddd;
}

.item-row:last-child {
  border-bottom: none;
}

.item-image {
  flex: 0 0 120px;
}

.item-image img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 1px solid #eee;
}

.no-image {
  width: 120px;
  height: 120px;
  border: 1px dashed #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 12px;
}

.item-info {
  flex: 1;
  padding-top: 4px;
}

.item-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.item-sub {
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
}

.item-qty {
  font-size: 13px;
}

.items-summary {
  text-align: right;
  margin-top: 4px;
  font-size: 13px;
  font-weight: bold;
}

.notes-cell {
  min-height: 60px;
}

.note-red {
  color: #d32029;
  font-weight: bold;
  margin-bottom: 4px;
}

.note-phones {
  color: #d32029;
  font-size: 12px;
}

.card-cell {
  min-height: 50px;
  color: #d32029;
}

.footer-note {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.barcode {
  margin-top: 16px;
  text-align: center;
}

.barcode-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.barcode-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 0;
}

.barcode-text {
  font-family: monospace;
  font-size: 13px;
  letter-spacing: 2px;
  margin-top: 4px;
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .slip-page { background: white; padding: 0; }
  .slip { box-shadow: none; width: 100%; min-height: auto; }
  @page { size: A4; margin: 10mm; }
}
</style>
