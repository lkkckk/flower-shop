<template>
  <div class="receipt-page">
    <div class="print-controls">
      <NuxtLink to="/pos">← 返回收银台</NuxtLink>
      <div class="print-actions"><label>纸宽 <select v-model="paperWidth" aria-label="小票纸宽"><option value="58">58mm</option><option value="80">80mm</option></select></label><button type="button" :disabled="!order || loading" @click="printReceipt">打印小票</button></div>
      <p>在打印面板中选择对应纸宽，关闭页眉页脚。iPad 需使用支持 AirPrint 的打印机；普通蓝牙打印机需另配兼容的打印服务。</p>
    </div>
    <div class="print-container" :style="{ '--receipt-width': paperWidth === '58' ? '58mm' : '80mm' }">
    <div v-if="loading" class="receipt-message">加载单据中...</div>
    <div v-else-if="loadError" class="receipt-message" role="alert">{{ loadError }}<button type="button" @click="loadOrder">重新加载</button></div>
    
    <div v-else class="print-area">
      <div class="shop-name">{{ shopName }}</div>
      
      <div class="info-line mt-2">
        <span>单号：{{ order.orderNo }}</span>
      </div>
      <div class="info-line">
        <span>日期：{{ new Date(order.createdAt).toLocaleString() }}</span>
      </div>
      <div class="info-line">
        <span>客户：{{ order.customer?.name || '散客' }} 
          <span v-if="order.customer?.phone">({{ order.customer.phone }})</span>
        </span>
      </div>
      <div v-if="order.deliveryTime" class="info-line">
        <span>配送时间：{{ new Date(order.deliveryTime).toLocaleString() }}</span>
      </div>
      <div v-if="order.deliveryAddress" class="info-line">
        <span>配送地址：{{ order.deliveryAddress }}</span>
      </div>

      <div class="divider"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="text-left">商品</th>
            <th class="text-right">数量</th>
            <th class="text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.id">
            <td class="text-left">
              {{ item.product.name }}
              <div v-if="item.grade" class="sub-text">{{ item.grade }}</div>
            </td>
            <td class="text-right">{{ Number(Number(item.qty).toFixed(2)) }}{{ item.unit }}</td>
            <td class="text-right">¥{{ Number(item.subtotal).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="total-line">
        <span>合计：</span>
        <span class="font-bold">¥{{ Number(order.totalAmount).toFixed(2) }}</span>
      </div>
      <div class="total-line">
        <span>实收：</span>
        <span>¥{{ Number(order.paidAmount).toFixed(2) }}</span>
      </div>
      <div v-if="order.owedAmount > 0" class="total-line text-bold">
        <span>欠款：</span>
        <span>¥{{ Number(order.owedAmount).toFixed(2) }}</span>
      </div>

      <div v-if="order.notes" class="notes-area">
        客户备注：{{ order.notes }}
      </div>

      <div class="footer-text">
        谢谢惠顾，欢迎再次光临！
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: false })

const route = useRoute()
const order = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const paperWidth = ref('58')
const shopName = ref('鲜花批发总汇')
useHead({ title: () => order.value ? `小票 ${order.value.orderNo}` : '小票预览' })

const printReceipt = () => {
  if (order.value && !loading.value) window.print()
}

const loadOrder = async () => {
  loading.value = true
  loadError.value = ''
  const id = route.params.id
    try {
      const res: any = await $fetch(`/api/orders/${id}`)
      if (!res.data || res.error) throw new Error(res.error?.message || '未找到该订单')
      order.value = res.data
    } catch { loadError.value = '单据加载失败，请重试或返回收银台'; order.value = null }
    finally { loading.value = false }
}
onMounted(async () => {
  await loadOrder()
  try {
    const settings: any = await $fetch('/api/settings')
    if (settings.data?.shopName) shopName.value = settings.data.shopName
  } catch {
    // 店名配置不可用时仍允许打印已加载的订单。
  }
})
</script>

<style scoped>
.receipt-page { min-height: 100dvh; padding: 20px 12px 40px; background: #f1f2ed; }
.print-controls { max-width: 520px; margin: 0 auto 24px; font-size: 14px; }
.print-controls > a { display: inline-block; padding: 12px 0; }
.print-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.print-controls select, .print-controls button, .receipt-message button { min-height: 44px; padding: 8px 14px; border: 1px solid #b8c4a0; border-radius: 8px; background: white; font-size: 16px; }
.print-controls button { background: var(--avo-700); color: white; cursor: pointer; }
.print-controls button:disabled { opacity: .4; cursor: not-allowed; }
.print-controls p { font-size: 12px; line-height: 1.7; margin-top: 12px; color: #68705b; }
.receipt-message { padding: 20px 0; font-size: 13px; }.receipt-message button { display: block; margin-top: 14px; }
.print-container {
  width: var(--receipt-width, 58mm);
  max-width: 100%;
  margin: 0 auto;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  color: #000;
  background: white;
  padding: 3mm;
  overflow-wrap: anywhere;
}

.shop-name {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;
}

.info-line {
  font-size: 0.75rem;
  line-height: 1.4;
}

.divider {
  border-top: 1px dashed #000;
  margin: 8px 0;
}

.items-table {
  width: 100%;
  font-size: 0.75rem;
  border-collapse: collapse;
  table-layout: fixed;
}
.items-table th:first-child { width: 46%; }
.items-table th:nth-child(2) { width: 24%; }
.items-table th:nth-child(3) { width: 30%; }

.items-table th {
  padding-bottom: 4px;
  font-weight: normal;
}

.items-table td {
  padding: 4px 0;
  vertical-align: top;
}

.sub-text {
  font-size: 0.65rem;
  color: #666;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 2px;
}

.text-bold {
  font-weight: bold;
}

.notes-area {
  margin-top: 8px;
  font-size: 0.75rem;
}

.footer-text {
  text-align: center;
  font-size: 0.7rem;
  margin-top: 20px;
  color: #333;
}

@media print {
  :global(body) {
    margin: 0 !important;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-controls, .receipt-message { display: none !important; }
  .receipt-page { min-height: 0; padding: 0; background: white; }
  .print-container { margin: 0; padding: 2mm 3mm; box-shadow: none; }
  .items-table tr, .total-line { break-inside: avoid; }
  @page { margin: 0; }
}
</style>
