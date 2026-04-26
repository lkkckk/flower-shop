<template>
  <div class="prep-board" :class="{ compact }">
    <div class="av-page-head prep-head">
      <div>
        <h1 class="av-page-title">今日备货</h1>
        <p class="av-page-sub">按预售单生成花束需求、花材需求和未完成制作清单。</p>
      </div>
      <a-space wrap>
        <a-button :href="compact ? '/pos/schedule' : '/orders/schedule'">订单排单</a-button>
        <a-date-picker v-model:value="date" value-format="YYYY-MM-DD" @change="fetchStats" />
        <a-button type="primary" @click="fetchStats">刷新统计</a-button>
      </a-space>
    </div>

    <div class="prep-stats">
      <a-card v-for="stat in statItems" :key="stat.label" class="metric-card" :body-style="{ padding: '15px 16px' }">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value" :class="stat.tone">{{ stat.value }}</div>
        <div class="stat-sub">{{ stat.sub }}</div>
      </a-card>
    </div>

    <div class="prep-filter">
      <a-segmented v-model:value="activeFilter" :options="filterOptions" />
    </div>

    <div class="prep-grid">
      <a-card title="今日花束需求" class="av-card">
        <a-spin :spinning="loading">
          <div v-if="!loading && filteredProductRows.length === 0" class="mini-empty">暂无花束需求</div>
          <a-table
            v-else
            :columns="productColumns"
            :data-source="filteredProductRows"
            :pagination="false"
            row-key="productId"
            size="middle"
            :scroll="{ x: 720 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'product'">
                <div class="product-cell">
                  <a-avatar shape="square" :size="48" :src="record.imageUrl || undefined">
                    <template v-if="!record.imageUrl">图</template>
                  </a-avatar>
                  <div>
                    <b>{{ record.productName }}</b>
                    <span>{{ record.hasRecipe ? '已配置配方' : '未配置配方' }}</span>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'totalQty'">
                <b>{{ formatQty(record.totalQty) }} {{ record.unit || '' }}</b>
              </template>
              <template v-else-if="column.key === 'totalAmount'">
                ¥{{ formatMoney(record.totalAmount) }}
              </template>
            </template>
          </a-table>
        </a-spin>
      </a-card>

      <a-card class="av-card material-card">
        <template #title>
          <span>花材需求清单</span>
          <a-tag v-if="shortageRows.length" color="red" class="ml-2">缺货 {{ shortageRows.length }}</a-tag>
        </template>
        <a-spin :spinning="loading">
          <div v-if="!loading && filteredMaterialRows.length === 0" class="mini-empty">
            {{ materialRows.length === 0 ? '暂无配方花材需求' : '暂无缺货花材' }}
          </div>
          <a-table
            v-else
            :columns="materialColumns"
            :data-source="filteredMaterialRows"
            :pagination="false"
            row-key="productId"
            size="middle"
            :scroll="{ x: 760 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'product'">
                <div class="product-cell">
                  <a-avatar shape="square" :size="44" :src="record.imageUrl || undefined">
                    <template v-if="!record.imageUrl">材</template>
                  </a-avatar>
                  <div>
                    <b>{{ record.productName }}</b>
                    <span>库存 {{ formatQty(record.currentStock) }} {{ record.baseUnit }}</span>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'requiredQty'">
                <b>{{ formatQty(record.requiredQty) }} {{ record.baseUnit }}</b>
              </template>
              <template v-else-if="column.key === 'shortageQty'">
                <a-tag v-if="record.shortageQty > 0" color="red">缺 {{ formatQty(record.shortageQty) }} {{ record.baseUnit }}</a-tag>
                <a-tag v-else color="green">充足</a-tag>
              </template>
            </template>
          </a-table>
        </a-spin>
      </a-card>

      <a-card class="av-card orders-card">
        <template #title>
          <span>未完成订单</span>
          <a-tag v-if="filteredOrders.length" color="orange" class="ml-2">{{ filteredOrders.length }}</a-tag>
        </template>
        <a-spin :spinning="loading">
          <div v-if="!loading && filteredOrders.length === 0" class="mini-empty">暂无待处理订单</div>
          <div v-else class="order-list">
            <div v-for="order in filteredOrders" :key="order.id" class="order-row" :class="{ made: order.isMade }">
              <div class="order-main">
                <div class="order-title">
                  <b>{{ order.receiverName }}</b>
                  <span class="mono">{{ order.orderNo }}</span>
                  <a-tag v-if="order.isUrgent" color="red">加急</a-tag>
                  <a-tag :color="order.isMade ? 'green' : 'orange'">{{ order.isMade ? '已做好' : '未做好' }}</a-tag>
                </div>
                <div class="order-sub">
                  {{ formatTime(order.deliveryTime) }} · {{ fulfillmentLabel(order.fulfillmentType) }} · {{ order.itemCount }} 项 · ¥{{ formatMoney(order.totalAmount) }}
                </div>
                <div class="order-items">
                  <span v-for="item in order.items.slice(0, 3)" :key="item.id">
                    {{ item.productName }} × {{ formatQty(item.qty) }}{{ item.unit }}
                  </span>
                </div>
              </div>
              <div class="order-actions">
                <a-button size="small" @click="router.push(`/preorders/${order.id}`)">详情</a-button>
                <a-button
                  size="small"
                  type="primary"
                  :disabled="order.isMade"
                  :loading="markingId === order.id"
                  @click="markMade(order)"
                >
                  标记已做好
                </a-button>
              </div>
            </div>
          </div>
        </a-spin>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Modal, message } from 'ant-design-vue'
import { isStockDeducted } from '~~/shared/preorderStatus'

defineProps<{ compact?: boolean }>()

const router = useRouter()
const { setMade } = usePreorders()

const date = ref(dayjs().format('YYYY-MM-DD'))
const activeFilter = ref('all')
const loading = ref(false)
const markingId = ref<number | null>(null)
const productRows = ref<any[]>([])
const materialRows = ref<any[]>([])
const orders = ref<any[]>([])
const summary = ref<any>({})

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '未做好', value: 'unmade' },
  { label: '配送', value: 'delivery' },
  { label: '自提', value: 'pickup' },
  { label: '缺货', value: 'shortage' },
]

const statItems = computed(() => [
  { label: '订单数', value: summary.value.orderCount || 0, sub: '当日履约', tone: '' },
  { label: '未做好', value: summary.value.unmadeCount || 0, sub: '待制作', tone: 'warn' },
  { label: '已做好', value: summary.value.madeCount || 0, sub: '已完成制作', tone: 'ok' },
  { label: '配送', value: summary.value.deliveryCount || 0, sub: '派送任务', tone: 'info' },
  { label: '自提', value: summary.value.pickupCount || 0, sub: '到店取花', tone: '' },
  { label: '缺货物料', value: summary.value.shortageCount || 0, sub: '需补货', tone: 'danger' },
])

const shortageRows = computed(() => materialRows.value.filter((row) => Number(row.shortageQty || 0) > 0))
const filteredMaterialRows = computed(() => activeFilter.value === 'shortage' ? shortageRows.value : materialRows.value)
const filteredProductRows = computed(() => {
  if (activeFilter.value === 'shortage') return productRows.value.filter((row) => row.hasRecipe)
  return productRows.value
})
const filteredOrders = computed(() => {
  let rows = orders.value
  if (activeFilter.value === 'unmade') rows = rows.filter((order) => !order.isMade)
  if (activeFilter.value === 'delivery') rows = rows.filter((order) => order.fulfillmentType !== 'pickup')
  if (activeFilter.value === 'pickup') rows = rows.filter((order) => order.fulfillmentType === 'pickup')
  if (activeFilter.value === 'shortage') rows = rows.filter((order) => !order.isMade)
  return rows
})

const productColumns = [
  { title: '花束款式', key: 'product', width: 300 },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 110 },
  { title: '总数量', key: 'totalQty', width: 120 },
  { title: '总金额', key: 'totalAmount', width: 130 },
]

const materialColumns = [
  { title: '花材 / 包装', key: 'product', width: 300 },
  { title: '需求量', key: 'requiredQty', width: 130 },
  { title: '缺口', key: 'shortageQty', width: 150 },
]

async function fetchStats() {
  loading.value = true
  try {
    const result: any = await $fetch('/api/preorders/stats/hot', {
      params: { date: date.value },
    })
    productRows.value = result.productRows || result.data || []
    materialRows.value = result.materialRows || []
    orders.value = result.orders || []
    summary.value = result.summary || {}
  } catch (error: any) {
    message.error(error?.data?.message || '加载备货统计失败')
  } finally {
    loading.value = false
  }
}

async function markMade(order: any) {
  if (!isStockDeducted(order.status)) {
    Modal.confirm({
      title: '需要先推进到制作中',
      content: '标记已做好前需要先进入制作中并完成库存扣减，请先到预售单详情推进状态。',
      okText: '去详情处理',
      cancelText: '取消',
      onOk: () => router.push(`/preorders/${order.id}`),
    })
    return
  }

  markingId.value = order.id
  try {
    await setMade(order.id, true)
    message.success('已标记为做好')
    await fetchStats()
  } finally {
    markingId.value = null
  }
}

const formatMoney = (n: any) => Number(n || 0).toFixed(2)
const formatQty = (n: any) => {
  const value = Number(n || 0)
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
const formatTime = (d: any) => d ? dayjs(d).format('MM-DD HH:mm') : '-'
const fulfillmentLabel = (type: string) => type === 'pickup' ? '自提' : '配送'

onMounted(fetchStats)
</script>

<style scoped>
.prep-board {
  width: 100%;
}

.prep-head {
  margin-bottom: 14px;
}

.prep-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.stat-label {
  color: var(--ink-500);
  font-size: 12px;
}

.stat-value {
  margin-top: 4px;
  color: var(--ink-900);
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
}

.stat-value.ok {
  color: var(--ok);
}

.stat-value.warn {
  color: var(--warn);
}

.stat-value.info {
  color: var(--info);
}

.stat-value.danger {
  color: var(--danger);
}

.stat-sub {
  margin-top: 7px;
  color: var(--ink-400);
  font-size: 12px;
}

.prep-filter {
  margin-bottom: 14px;
}

.prep-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.orders-card {
  grid-column: 1 / -1;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-cell b {
  display: block;
  color: var(--ink-900);
}

.product-cell span {
  display: block;
  margin-top: 3px;
  color: var(--ink-500);
  font-size: 12px;
}

.mini-empty {
  padding: 30px 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
  background: var(--paper-2);
  color: var(--ink-400);
  text-align: center;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  background: var(--paper-2);
}

.order-row.made {
  opacity: 0.72;
}

.order-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.order-title b {
  color: var(--ink-900);
}

.mono {
  color: var(--ink-400);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}

.order-sub {
  margin-top: 5px;
  color: var(--ink-500);
  font-size: 12px;
}

.order-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.order-items span {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--avo-50);
  color: var(--avo-800);
  font-size: 12px;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.compact {
  padding: 18px;
}

@media (max-width: 1180px) {
  .prep-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .prep-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .prep-stats {
    grid-template-columns: 1fr;
  }

  .order-row {
    grid-template-columns: 1fr;
  }

  .order-actions {
    flex-wrap: wrap;
  }

  .compact {
    padding: 14px;
  }
}
</style>
