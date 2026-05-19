<template>
  <div>
    <a-card class="page-card" :body-style="{ padding: '16px' }">
      <!-- KPI 卡 -->
      <div class="kpi-grid mb-4">
        <a-card class="kpi-card" :body-style="{ padding: '14px 18px' }">
          <div class="kpi-label">订单数</div>
          <div class="kpi-value">{{ summary.count }}</div>
        </a-card>
        <a-card class="kpi-card" :body-style="{ padding: '14px 18px' }">
          <div class="kpi-label">销售额</div>
          <div class="kpi-value text-pink-600">¥{{ summary.totalAmount.toFixed(2) }}</div>
        </a-card>
        <a-card class="kpi-card" :body-style="{ padding: '14px 18px' }">
          <div class="kpi-label">已收</div>
          <div class="kpi-value text-green-600">¥{{ summary.paidAmount.toFixed(2) }}</div>
        </a-card>
        <a-card class="kpi-card" :body-style="{ padding: '14px 18px' }">
          <div class="kpi-label">未收</div>
          <div class="kpi-value" :class="summary.owedAmount > 0 ? 'text-red-600' : 'text-gray-400'">
            ¥{{ summary.owedAmount.toFixed(2) }}
          </div>
        </a-card>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search
            v-model:value="filters.keyword"
            placeholder="单号 / 客户 / 收货人 / 电话"
            class="w-64"
            allow-clear
            @search="onFilterChange"
            @change="onKeywordChange"
          />
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :allow-clear="true"
            @change="onFilterChange"
          />
          <a-select
            v-model:value="filters.status"
            placeholder="状态"
            allow-clear
            class="w-32"
            :options="statusOptions"
            @change="onFilterChange"
          />
          <a-button type="link" size="small" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起筛选 ▲' : '更多筛选 ▼' }}
          </a-button>
        </div>
        <div class="toolbar-right">
          <a-space>
            <a-button v-for="p in presets" :key="p.key" size="small" @click="applyDatePreset(p.key)">
              {{ p.label }}
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 高级筛选 -->
      <div v-if="showAdvanced" class="advanced-filter">
        <a-form layout="inline" :model="filters">
          <a-form-item label="订单类型">
            <a-select v-model:value="filters.orderType" class="w-32" allow-clear placeholder="全部" @change="onFilterChange">
              <a-select-option value="retail">零售</a-select-option>
              <a-select-option value="preorder">预售</a-select-option>
              <a-select-option value="all">全部</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="收银员">
            <a-select
              v-model:value="filters.cashierId"
              class="w-40"
              allow-clear
              placeholder="全部"
              :options="cashierOptions"
              @change="onFilterChange"
            />
          </a-form-item>
          <a-form-item label="支付方式">
            <a-select v-model:value="filters.paymentMethod" class="w-32" allow-clear placeholder="全部" @change="onFilterChange">
              <a-select-option value="cash">现金</a-select-option>
              <a-select-option value="wechat">微信</a-select-option>
              <a-select-option value="alipay">支付宝</a-select-option>
              <a-select-option value="balance">预存</a-select-option>
              <a-select-option value="credit">挂账</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="渠道">
            <a-input v-model:value="filters.sourceChannel" class="w-32" placeholder="如 美团/抖音" allow-clear @change="onFilterChange" />
          </a-form-item>
          <a-form-item label="金额范围">
            <a-input-number v-model:value="filters.minAmount" class="w-24" placeholder="≥" :min="0" @change="onFilterChange" />
            <span class="mx-1">—</span>
            <a-input-number v-model:value="filters.maxAmount" class="w-24" placeholder="≤" :min="0" @change="onFilterChange" />
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model:checked="filters.hasDebt" @change="onFilterChange">仅看欠款</a-checkbox>
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model:checked="filters.hasDiscount" @change="onFilterChange">仅看带折扣</a-checkbox>
          </a-form-item>
        </a-form>
      </div>

      <!-- 批量操作条 -->
      <div v-if="selectedRowKeys.length" class="bulk-bar">
        <span>已选 <b>{{ selectedRowKeys.length }}</b> 单</span>
        <a-space>
          <a-button size="small" @click="bulkPrint">批量打印</a-button>
          <a-button size="small" @click="bulkExport">导出选中</a-button>
          <a-button size="small" type="link" @click="selectedRowKeys = []">清空选择</a-button>
        </a-space>
      </div>

      <!-- 主表格 -->
      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="false"
        :expandable="{ expandedRowRender }"
        :row-selection="rowSelection"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">
            <a class="font-mono text-sm text-pink-600" @click="viewOrder(record.id)">{{ record.orderNo }}</a>
            <a-tag v-if="record.isUrgent" color="red" class="ml-1">加急</a-tag>
            <a-tag v-if="record.owedAmount > 0" color="orange" class="ml-1">欠</a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <span class="text-gray-600 text-sm">{{ formatDateTime(record.createdAt) }}</span>
          </template>

          <template v-else-if="column.key === 'customer'">
            <template v-if="record.customer">
              <a class="text-pink-600" @click="goCustomer(record.customer.id)">{{ record.customer.name }}</a>
            </template>
            <span v-else class="text-gray-400">散客</span>
          </template>

          <template v-else-if="column.key === 'cashier'">
            <span class="text-gray-600 text-sm">{{ record.cashier?.name || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'totalAmount'">
            <span class="font-bold text-pink-600">¥{{ record.totalAmount.toFixed(2) }}</span>
          </template>

          <template v-else-if="column.key === 'paidAmount'">
            <span class="text-green-600">¥{{ record.paidAmount.toFixed(2) }}</span>
          </template>

          <template v-else-if="column.key === 'owedAmount'">
            <span :class="record.owedAmount > 0 ? 'text-red-600 font-bold' : 'text-gray-400'">
              ¥{{ record.owedAmount.toFixed(2) }}
            </span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="viewOrder(record.id)">详情</a-button>
            <a-button type="link" size="small" @click="goPrint(record.id)">打印</a-button>
          </template>
        </template>

        <template #emptyText>
          <div class="empty-state">
            <div class="empty-state-emoji">📋</div>
            <div class="empty-state-text">当前筛选下没有订单</div>
            <a-button type="primary" class="bg-pink-500 hover:bg-pink-600 border-none" @click="router.push('/pos')">
              <ShoppingCartOutlined /> 去开单
            </a-button>
          </div>
        </template>
      </a-table>

      <div class="mt-4 flex justify-between items-center">
        <a-button @click="exportList">
          <DownloadOutlined /> 导出 Excel
        </a-button>
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-total="showTotal"
          @change="loadList"
          @show-size-change="loadList"
        />
      </div>
    </a-card>

    <OrdersOrderDetailDrawer
      v-model:open="drawerOpen"
      :order-id="drawerOrderId"
      @refresh="loadList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { ShoppingCartOutlined, DownloadOutlined } from '@ant-design/icons-vue'

useHead({ title: '订单记录 - 花店管理系统' })

const router = useRouter()
const route = useRoute()
const { presets, applyPresetAsString } = useDatePresets()
const { exportToCsv } = useExport()

const dateRange = ref<[string, string] | null>(null)
const filters = reactive<any>({
  keyword: '',
  status: undefined as string | undefined,
  orderType: undefined as string | undefined,
  cashierId: undefined as number | undefined,
  paymentMethod: undefined as string | undefined,
  sourceChannel: '',
  minAmount: undefined as number | undefined,
  maxAmount: undefined as number | undefined,
  hasDebt: false,
  hasDiscount: false,
})
const showAdvanced = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref<any[]>([])
const summary = reactive({ count: 0, totalAmount: 0, paidAmount: 0, owedAmount: 0 })
const loading = ref(false)
const selectedRowKeys = ref<number[]>([])

const drawerOpen = ref(false)
const drawerOrderId = ref<number | null>(null)

const cashierOptions = ref<{ value: number; label: string }[]>([])

const statusOptions = [
  { value: 'paid', label: '已付款' },
  { value: 'partial', label: '部分付款' },
  { value: 'unpaid', label: '挂账' },
  { value: 'pending', label: '待付款' },
  { value: 'cancelled', label: '已取消' },
]

const columns = [
  { title: '单号', key: 'orderNo', width: 170 },
  { title: '下单时间', key: 'createdAt', width: 150 },
  { title: '客户', key: 'customer', width: 120 },
  { title: '收银员', key: 'cashier', width: 100 },
  { title: '总额', key: 'totalAmount', width: 100, align: 'right' as const },
  { title: '已付', key: 'paidAmount', width: 100, align: 'right' as const },
  { title: '未付', key: 'owedAmount', width: 100, align: 'right' as const },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 110, fixed: 'right' as const, align: 'center' as const },
]

const buildQuery = () => {
  const q: any = {
    page: page.value,
    pageSize: pageSize.value,
  }
  if (dateRange.value) {
    q.startDate = dateRange.value[0]
    q.endDate = dateRange.value[1]
  }
  if (filters.keyword) q.keyword = filters.keyword
  if (filters.status) q.status = filters.status
  if (filters.orderType) q.orderType = filters.orderType
  if (filters.cashierId) q.cashierId = filters.cashierId
  if (filters.paymentMethod) q.paymentMethod = filters.paymentMethod
  if (filters.sourceChannel) q.sourceChannel = filters.sourceChannel
  if (filters.minAmount !== undefined && filters.minAmount !== null) q.minAmount = filters.minAmount
  if (filters.maxAmount !== undefined && filters.maxAmount !== null) q.maxAmount = filters.maxAmount
  if (filters.hasDebt) q.hasDebt = 'true'
  if (filters.hasDiscount) q.hasDiscount = 'true'
  return q
}

const loadList = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/orders', { query: buildQuery() })
    if (res.error) {
      message.error(res.error.message)
      list.value = []; total.value = 0
    } else {
      list.value = res.data.list
      total.value = res.data.total
      Object.assign(summary, res.data.summary || { count: 0, totalAmount: 0, paidAmount: 0, owedAmount: 0 })
    }
  } catch (e: any) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => {
  page.value = 1
  loadList()
}

const onKeywordChange = (e: any) => {
  if (!e?.target?.value) onFilterChange()
}

const showTotal = (t: number) => `共 ${t} 条`

const rowSelection = {
  get selectedRowKeys() {
    return selectedRowKeys.value
  },
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(Number)
  },
}

const applyDatePreset = (key: any) => {
  dateRange.value = applyPresetAsString(key)
  onFilterChange()
}

const loadCashiers = async () => {
  try {
    const res: any = await $fetch('/api/users', { query: { role: 'cashier' } }).catch(() => null)
    // 接口可能不存在或无权限，静默忽略
    if (res?.data?.list) {
      cashierOptions.value = res.data.list.map((u: any) => ({ value: u.id, label: u.name || u.username }))
    }
  } catch {
    cashierOptions.value = []
  }
}

const expandedRowRender = ({ record }: any) => {
  return h('div', { class: 'expanded-items' }, [
    h('div', { class: 'expanded-items-title' }, `商品明细 · 共 ${record.items?.length || 0} 项`),
    h('table', { class: 'expanded-items-table' }, [
      h('thead', null, h('tr', null, [
        h('th', null, '商品'),
        h('th', { style: 'text-align:right;' }, '单价'),
        h('th', { style: 'text-align:right;' }, '数量'),
        h('th', { style: 'text-align:right;' }, '小计'),
      ])),
      h('tbody', null, (record.items || []).map((it: any) =>
        h('tr', { key: it.id }, [
          h('td', null, `${it.product?.name || '已删除'} ${it.grade ? '· ' + it.grade : ''} ${it.color ? '· ' + it.color : ''}`),
          h('td', { style: 'text-align:right;' }, `¥${it.unitPrice.toFixed(2)}`),
          h('td', { style: 'text-align:right;' }, `${it.qty} ${it.unit}`),
          h('td', { style: 'text-align:right; font-weight:600; color:#db2777;' }, `¥${it.subtotal.toFixed(2)}`),
        ]),
      )),
    ]),
  ])
}

const viewOrder = (id: number) => {
  drawerOrderId.value = id
  drawerOpen.value = true
}
const goPrint = (id: number) => window.open(`/orders/${id}/print`, '_blank')
const goCustomer = (id: number) => router.push(`/customers/${id}`)

const formatDateTime = (d: string | Date) => dayjs(d).format('YYYY-MM-DD HH:mm')

const statusText = (s: string) => {
  const map: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    partial: '部分付款',
    unpaid: '挂账',
    cancelled: '已取消',
  }
  return map[s] || s
}
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending: 'default',
    paid: 'green',
    partial: 'orange',
    unpaid: 'red',
    cancelled: 'default',
  }
  return map[s] || 'default'
}

// 导出
const buildCsvRows = (rows: any[]) => {
  const headers = ['单号', '下单时间', '客户', '电话', '收银员', '总额', '已付', '未付', '状态', '渠道', '备注']
  const data = rows.map((r: any) => [
    r.orderNo,
    formatDateTime(r.createdAt),
    r.customer?.name || '散客',
    r.customer?.phone || '',
    r.cashier?.name || '',
    r.totalAmount.toFixed(2),
    r.paidAmount.toFixed(2),
    r.owedAmount.toFixed(2),
    statusText(r.status),
    r.sourceChannel || '',
    (r.notes || '').replace(/\n/g, ' '),
  ])
  return { headers, data }
}
const exportList = async () => {
  try {
    const res: any = await $fetch('/api/orders', { query: { ...buildQuery(), pageSize: 5000, page: 1 } })
    const rows = res.data?.list || []
    if (rows.length === 0) {
      message.info('当前筛选无数据可导出')
      return
    }
    const { headers, data } = buildCsvRows(rows)
    const stamp = dayjs().format('YYYYMMDD_HHmm')
    exportToCsv(`orders_${stamp}`, headers, data)
    message.success(`已导出 ${rows.length} 条`)
  } catch (e: any) {
    message.error(e.message || '导出失败')
  }
}
const bulkExport = () => {
  const rows = list.value.filter((r) => selectedRowKeys.value.includes(r.id))
  if (rows.length === 0) return
  const { headers, data } = buildCsvRows(rows)
  const stamp = dayjs().format('YYYYMMDD_HHmm')
  exportToCsv(`orders_selected_${stamp}`, headers, data)
  message.success(`已导出 ${rows.length} 条`)
}
const bulkPrint = () => {
  selectedRowKeys.value.forEach((id) => window.open(`/orders/${id}/print`, '_blank'))
}

onMounted(async () => {
  await loadCashiers()
  await loadList()
  const initialOrderId = Number(route.query.orderId)
  if (initialOrderId) viewOrder(initialOrderId)
})

watch(
  () => route.query.orderId,
  (id) => {
    const orderId = Number(id)
    if (orderId) viewOrder(orderId)
  },
)
</script>

<script lang="ts">
import { h } from 'vue'
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-card {
  border-radius: 8px;
}
.kpi-label {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.advanced-filter {
  background: #fafafa;
  border: 1px dashed #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin: 12px 0 4px;
}

.bulk-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  margin: 12px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  gap: 8px;
}
.empty-state-emoji {
  font-size: 36px;
  line-height: 1;
}
.empty-state-text {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 4px;
}

:deep(.expanded-items) {
  padding: 8px 24px 12px 48px;
  background: #fafafa;
}
:deep(.expanded-items-title) {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
:deep(.expanded-items-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
:deep(.expanded-items-table th),
:deep(.expanded-items-table td) {
  padding: 4px 8px;
  border-bottom: 1px dashed #e5e7eb;
}
:deep(.expanded-items-table th) {
  text-align: left;
  font-weight: 500;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
