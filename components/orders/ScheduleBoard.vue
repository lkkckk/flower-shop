<template>
  <div class="schedule-board" :class="{ compact }">
    <div class="av-page-head">
      <div>
        <h1 class="av-page-title">订单排单</h1>
        <p class="av-page-sub">按履约时间、制作状态和配送方式管理预售订单。</p>
      </div>
      <a-space wrap>
        <a-button :href="compact ? '/pos/preparation' : '/orders/preparation'">
          今日备货
        </a-button>
        <a-button type="primary" @click="fetchOrders">刷新排单</a-button>
      </a-space>
    </div>

    <a-card class="av-card filter-card" :body-style="{ padding: '16px' }">
      <div class="filter-grid">
        <a-segmented v-model:value="filters.view" :options="viewOptions" @change="fetchOrders" />
        <a-date-picker v-model:value="filters.date" class="w-full" value-format="YYYY-MM-DD" @change="fetchOrders" />
        <a-select v-model:value="filters.fulfillmentType" class="w-full" @change="fetchOrders">
          <a-select-option value="">全部方式</a-select-option>
          <a-select-option value="delivery">配送</a-select-option>
          <a-select-option value="pickup">自提</a-select-option>
        </a-select>
        <a-select v-model:value="filters.isMade" class="w-full" @change="fetchOrders">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="false">未做好</a-select-option>
          <a-select-option value="true">已做好</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filters.keyword"
          allow-clear
          placeholder="搜索订单号、姓名、电话、地址、备注"
          @search="fetchOrders"
        />
      </div>
    </a-card>

    <div class="schedule-stats">
      <a-card v-for="stat in stats" :key="stat.label" class="metric-card" :body-style="{ padding: '15px 16px' }">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value" :class="stat.tone">{{ stat.value }}</div>
        <div class="stat-sub">{{ stat.sub }}</div>
      </a-card>
    </div>

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && orders.length === 0" description="暂无排单订单" class="empty-panel" />
      <div v-else class="order-grid">
        <OrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          @toggle-made="toggleMade"
          @toggle-urgent="toggleUrgent"
          @view-detail="openDetail"
        />
      </div>
    </a-spin>

    <a-drawer v-model:open="detailVisible" width="560" title="订单详情">
      <template v-if="selectedOrder">
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="订单号">{{ selectedOrder.orderNo }}</a-descriptions-item>
          <a-descriptions-item label="收花人">{{ selectedOrder.receiverName }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ selectedOrder.receiverPhone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="履约时间">{{ selectedOrder.dateLabel }} {{ selectedOrder.timeLabel }}</a-descriptions-item>
          <a-descriptions-item label="方式">{{ selectedOrder.fulfillmentType === 'pickup' ? '自提' : '配送' }}</a-descriptions-item>
          <a-descriptions-item label="地址">{{ selectedOrder.deliveryAddress || '-' }}</a-descriptions-item>
          <a-descriptions-item label="金额">¥{{ Number(selectedOrder.totalAmount || 0).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="贺卡">{{ selectedOrder.cardMessage || '-' }}</a-descriptions-item>
          <a-descriptions-item label="备注">{{ selectedOrder.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider>商品明细</a-divider>
        <a-list :data-source="selectedOrder.items || []">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="`${item.qty}${item.unit || ''} x ¥${Number(item.unitPrice || 0).toFixed(2)}`">
                <template #avatar>
                  <a-avatar shape="square" :size="52" :src="item.imageUrl" />
                </template>
                <template #title>{{ item.productName }}</template>
              </a-list-item-meta>
              <div>¥{{ Number(item.subtotal || 0).toFixed(2) }}</div>
            </a-list-item>
          </template>
        </a-list>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import OrderCard from '~~/components/orders/OrderCard.vue'

defineProps<{ compact?: boolean }>()

const viewOptions = [
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '明日', value: 'tomorrow' },
  { label: '未来', value: 'future' },
]

const filters = reactive({
  view: 'all',
  date: dayjs().format('YYYY-MM-DD'),
  keyword: '',
  fulfillmentType: '',
  isMade: '',
})

const loading = ref(false)
const orders = ref<any[]>([])
const detailVisible = ref(false)
const selectedOrder = ref<any>(null)

const unmadeCount = computed(() => orders.value.filter((order) => !order.isMade).length)
const urgentCount = computed(() => orders.value.filter((order) => order.isUrgent).length)
const deliveryCount = computed(() => orders.value.filter((order) => order.fulfillmentType === 'delivery').length)
const pickupCount = computed(() => orders.value.filter((order) => order.fulfillmentType === 'pickup').length)

const stats = computed(() => [
  { label: '订单数', value: orders.value.length, sub: '当前筛选结果', tone: '' },
  { label: '未做好', value: unmadeCount.value, sub: '待制作花束', tone: 'warn' },
  { label: '加急', value: urgentCount.value, sub: '优先处理', tone: 'danger' },
  { label: '配送', value: deliveryCount.value, sub: '需要派送', tone: 'ok' },
  { label: '自提', value: pickupCount.value, sub: '到店取花', tone: 'info' },
])

async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      view: filters.view,
      date: filters.date,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.fulfillmentType) params.fulfillmentType = filters.fulfillmentType
    if (filters.isMade) params.isMade = filters.isMade

    const result: any = await $fetch('/api/preorders/schedule', { params })
    orders.value = result.data || []
  } catch (error: any) {
    message.error(error?.data?.message || '加载排单失败')
  } finally {
    loading.value = false
  }
}

async function toggleMade(order: any) {
  const next = !order.isMade
  try {
    await $fetch(`/api/preorders/${order.id}/made`, {
      method: 'PATCH',
      body: { isMade: next },
    })
    order.isMade = next
    message.success(next ? '已标记为已做好' : '已取消已做好')
  } catch (error: any) {
    message.error(error?.data?.message || '更新制作状态失败')
  }
}

async function toggleUrgent(order: any) {
  const next = !order.isUrgent
  try {
    await $fetch(`/api/preorders/${order.id}/urgent`, {
      method: 'PATCH',
      body: { isUrgent: next },
    })
    order.isUrgent = next
    await fetchOrders()
    message.success(next ? '已设为加急' : '已取消加急')
  } catch (error: any) {
    message.error(error?.data?.message || '更新加急状态失败')
  }
}

function openDetail(order: any) {
  selectedOrder.value = order
  detailVisible.value = true
}

onMounted(fetchOrders)
</script>

<style scoped>
.schedule-board {
  width: 100%;
}

.filter-card {
  margin-bottom: 14px;
}

.filter-grid {
  display: grid;
  grid-template-columns: auto 180px 170px 170px minmax(260px, 1fr);
  gap: 12px;
  align-items: center;
}

.schedule-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-label {
  color: var(--ink-500);
  font-size: 12px;
}

.stat-value {
  margin-top: 4px;
  color: var(--ink-900);
  font-size: 27px;
  font-weight: 800;
  line-height: 1;
}

.stat-value.warn {
  color: var(--warn);
}

.stat-value.danger {
  color: var(--danger);
}

.stat-value.ok {
  color: var(--ok);
}

.stat-value.info {
  color: var(--info);
}

.stat-sub {
  margin-top: 7px;
  color: var(--ink-400);
  font-size: 12px;
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
  gap: 14px;
}

.empty-panel {
  padding: 64px 16px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper-3);
}

.compact {
  padding: 18px;
}

@media (max-width: 1100px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .schedule-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .filter-grid,
  .schedule-stats {
    grid-template-columns: 1fr;
  }

  .compact {
    padding: 14px;
  }
}
</style>
