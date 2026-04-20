<template>
  <div class="print-container">
    <div v-if="!order" class="text-center p-8">加载单据中...</div>
    
    <div v-else class="print-area">
      <div class="shop-name">🌸 鲜花批发总汇</div>
      
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
      <div v-if="order.deliveryAddress" class="info-line">
        <span>配送：{{ order.deliveryAddress }}</span>
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
              <div v-if="item.product.grade" class="sub-text">{{ item.product.grade }}</div>
            </td>
            <td class="text-right">{{ Number(item.qty).toFixed(1) }}{{ item.unit }}</td>
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
        备注：{{ order.notes }}
      </div>

      <div class="footer-text">
        谢谢惠顾，欢迎再次光临！
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

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      const res: any = await $fetch(`/api/orders/${id}`)
      if (res.data) {
        order.value = res.data
        setTimeout(() => {
          window.print()
          // 打印完后可选择自动关闭本窗口
          // window.addEventListener('afterprint', () => window.close())
        }, 800)
      }
    } catch (e) {
      console.error('Failed to load order', e)
    }
  }
})
</script>

<style scoped>
.print-container {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  color: #000;
  background: white;
  padding: 10px;
}

.shop-name {
  font-size: 1.25rem;
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
}

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
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
