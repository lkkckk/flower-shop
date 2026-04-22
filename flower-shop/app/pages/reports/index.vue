<template>
  <div class="space-y-4">
    <!-- 筛选区 -->
    <a-card class="page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :allow-clear="false"
            @change="loadData"
          />
          <a-space :size="4">
            <a-button size="small" @click="applyPreset('today')">今天</a-button>
            <a-button size="small" @click="applyPreset('yesterday')">昨天</a-button>
            <a-button size="small" @click="applyPreset('week')">本周</a-button>
            <a-button size="small" @click="applyPreset('month')">本月</a-button>
            <a-button size="small" @click="applyPreset('lastMonth')">上月</a-button>
          </a-space>
        </div>
        <div class="toolbar-right">
          <a-button @click="onExportReport" :disabled="!data">
            <template #icon><DownloadOutlined /></template>
            导出报表
          </a-button>
          <a-button @click="loadData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>
    </a-card>

    <a-spin :spinning="loading">
      <!-- 核心指标卡片 -->
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="销售总额"
              :value="data?.summary.totalSales || 0"
              :precision="2"
              prefix="¥"
            />
            <div class="metric-footer text-gray-400 text-xs mt-2">
              <DollarOutlined />
              <span class="ml-1">环比 —</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="订单数"
              :value="data?.summary.orderCount || 0"
              suffix="单"
            />
            <div class="metric-footer text-gray-400 text-xs mt-2">
              <ShoppingOutlined />
              <span class="ml-1">环比 —</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="客单价"
              :value="data?.summary.avgOrderValue || 0"
              :precision="2"
              prefix="¥"
            />
            <div class="metric-footer text-gray-400 text-xs mt-2">
              <UserOutlined />
              <span class="ml-1">环比 —</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="毛利率"
              :value="data?.summary.grossMargin || 0"
              :precision="1"
              suffix="%"
              :value-style="{ color: marginColor }"
            />
            <div class="metric-footer text-gray-400 text-xs mt-2">
              <RiseOutlined />
              <span class="ml-1">毛利 ¥{{ (data?.summary.grossProfit || 0).toFixed(2) }}</span>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 附加指标行 -->
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="6">
          <a-card size="small">
            <div class="text-xs text-gray-500">已收金额</div>
            <div class="text-xl font-bold text-green-600">¥{{ (data?.summary.totalPaid || 0).toFixed(2) }}</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card size="small">
            <div class="text-xs text-gray-500">新增欠款</div>
            <div class="text-xl font-bold text-red-600">¥{{ (data?.summary.totalOwed || 0).toFixed(2) }}</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card size="small">
            <div class="text-xs text-gray-500">进货成本</div>
            <div class="text-xl font-bold text-gray-700">¥{{ (data?.summary.totalCost || 0).toFixed(2) }}</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card size="small">
            <div class="text-xs text-gray-500">毛利总额</div>
            <div class="text-xl font-bold" :style="{ color: marginColor }">
              ¥{{ (data?.summary.grossProfit || 0).toFixed(2) }}
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 销售趋势 -->
      <a-card title="销售趋势（按日）" class="page-card">
        <a-empty v-if="!data || !data.dailyTrend?.length" description="暂无数据" />
        <a-table
          v-else
          :columns="trendColumns"
          :data-source="data.dailyTrend"
          :pagination="false"
          row-key="date"
          size="small"
          :scroll="{ x: 500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'amount'">
              <span class="font-medium">¥{{ record.amount.toFixed(2) }}</span>
            </template>
            <template v-else-if="column.key === 'profit'">
              <span :class="record.profit > 0 ? 'text-green-600' : record.profit < 0 ? 'text-red-500' : 'text-gray-400'">
                ¥{{ record.profit.toFixed(2) }}
              </span>
            </template>
            <template v-else-if="column.key === 'bar'">
              <div class="bar-container">
                <div
                  class="bar-fill"
                  :style="{ width: maxDailyAmount > 0 ? (record.amount / maxDailyAmount * 100) + '%' : '0%' }"
                ></div>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- 双列：畅销榜 + 支付方式 -->
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :md="14">
          <a-card title="畅销榜 TOP 10" class="page-card h-full">
            <a-empty v-if="!data?.topProducts?.length" description="暂无销售数据" />
            <a-list v-else :data-source="data.topProducts" item-layout="horizontal">
              <template #renderItem="{ item, index }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <div class="rank-badge" :class="rankClass(index)">{{ index + 1 }}</div>
                    </template>
                    <template #title>{{ item.productName }}</template>
                    <template #description>
                      销量 {{ formatQty(item.qty) }} {{ item.baseUnit }} · 毛利
                      <span :class="item.profit >= 0 ? 'text-green-600' : 'text-red-500'">
                        ¥{{ item.profit.toFixed(2) }}
                      </span>
                    </template>
                  </a-list-item-meta>
                  <div class="text-right">
                    <div class="font-bold text-pink-600">¥{{ item.amount.toFixed(2) }}</div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>

        <a-col :xs="24" :md="10">
          <a-card title="支付方式分布" class="page-card h-full">
            <a-empty v-if="!data?.paymentMethods?.length" description="暂无流水" />
            <a-list v-else :data-source="data.paymentMethods">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>{{ paymentMethodText(item.method) }}</template>
                    <template #description>{{ item.count }} 笔</template>
                  </a-list-item-meta>
                  <div class="text-right">
                    <div class="font-bold">¥{{ item.amount.toFixed(2) }}</div>
                    <div class="text-xs text-gray-400">
                      {{ percent(item.amount, totalPaymentAmount) }}%
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>
      </a-row>

      <!-- 收银员明细（仅 admin） -->
      <a-card v-if="isStrictAdmin" title="收银员收款明细" class="page-card">
        <a-spin :spinning="cashierLoading">
          <a-empty v-if="!cashierStats.length" description="暂无收银记录" />
          <a-table
            v-else
            :columns="cashierColumns"
            :data-source="cashierStats"
            :pagination="false"
            row-key="cashierId"
            size="small"
          />
        </a-spin>
      </a-card>

      <!-- 欠款客户 -->
      <a-card class="page-card">
        <template #title>
          <span>欠款客户列表</span>
          <a-tag color="red" class="ml-2" v-if="debtors.length">{{ debtors.length }} 人</a-tag>
        </template>
        <a-spin :spinning="debtorLoading">
          <a-empty v-if="!debtors.length" description="暂无欠款客户" />
          <a-table
            v-else
            :columns="debtorColumns"
            :data-source="debtors"
            :pagination="false"
            row-key="id"
            size="small"
            :expand-row-by-click="true"
          >
            <template #expandedRowRender="{ record }">
              <div class="pl-4 pr-2 py-2">
                <div class="font-medium text-gray-600 mb-2">欠款订单明细</div>
                <a-table
                  :columns="debtorOrderColumns"
                  :data-source="record.orders"
                  :pagination="false"
                  row-key="id"
                  size="small"
                >
                  <template #bodyCell="{ column, record: order }">
                    <template v-if="column.key === 'createdAt'">
                      {{ formatDate(order.createdAt) }}
                    </template>
                    <template v-else-if="column.key === 'totalAmount'">
                      ¥{{ Number(order.totalAmount).toFixed(2) }}
                    </template>
                    <template v-else-if="column.key === 'paidAmount'">
                      ¥{{ Number(order.paidAmount).toFixed(2) }}
                    </template>
                    <template v-else-if="column.key === 'owedAmount'">
                      <span class="text-red-600 font-bold">¥{{ Number(order.owedAmount).toFixed(2) }}</span>
                    </template>
                    <template v-else-if="column.key === 'lastPayment'">
                      <span v-if="order.payments?.length">
                        ¥{{ Number(order.payments[0].amount).toFixed(2) }}
                        ({{ formatDate(order.payments[0].createdAt) }})
                      </span>
                      <span v-else class="text-gray-400">无收款</span>
                    </template>
                  </template>
                </a-table>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'totalOwed'">
                <span class="text-red-600 font-bold">¥{{ Number(record.totalOwed).toFixed(2) }}</span>
              </template>
              <template v-else-if="column.key === 'balance'">
                <span :class="record.balance >= 0 ? 'text-green-600' : 'text-red-500'">
                  ¥{{ Number(record.balance).toFixed(2) }}
                </span>
              </template>
            </template>
          </a-table>
        </a-spin>
      </a-card>

      <!-- 滞销商品 -->
      <a-card title="滞销商品（近 7 天 < 5 单且仍有库存）" class="page-card">
        <a-empty v-if="!data?.slowProducts?.length" description="暂无滞销商品" />
        <a-table
          v-else
          :columns="slowColumns"
          :data-source="data.slowProducts"
          :pagination="false"
          row-key="productId"
          size="small"
          :scroll="{ x: 700 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lastSoldAt'">
              <span v-if="record.lastSoldAt" class="text-gray-600">
                {{ formatDate(record.lastSoldAt) }}
              </span>
              <span v-else class="text-gray-400">从未销售</span>
            </template>
            <template v-else-if="column.key === 'stagnantDays'">
              <a-tag color="orange">{{ stagnantDays(record) }} 天</a-tag>
            </template>
            <template v-else-if="column.key === 'soldCount'">
              <span>{{ record.soldCount }}</span>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import {
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  RiseOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useReports } from '~/composables/useReports'
import { useExport } from '~/composables/useExport'
import { paymentMethodText, formatDate } from '~/composables/useStatement'

useHead({ title: '经营报表 - 花店管理系统' })

const { isStrictAdmin } = useAuth()
const { fetchDashboard, loading } = useReports()

// 欠款客户
const debtors = ref<any[]>([])
const debtorLoading = ref(false)

const debtorColumns = [
  { title: '客户', dataIndex: 'name', key: 'name', width: 120 },
  { title: '电话', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '累计欠款', key: 'totalOwed', width: 120 },
  { title: '当前余额', key: 'balance', width: 120 },
  { title: '欠款订单数', key: 'orderCount', width: 100, customRender: ({ record }: any) => record.orders?.length || 0 },
]

const debtorOrderColumns = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
  { title: '下单时间', key: 'createdAt', width: 120 },
  { title: '应收', key: 'totalAmount', width: 100 },
  { title: '已付', key: 'paidAmount', width: 100 },
  { title: '欠款', key: 'owedAmount', width: 100 },
  { title: '最近收款', key: 'lastPayment', width: 160 },
]

const loadDebtors = async () => {
  debtorLoading.value = true
  try {
    const res: any = await $fetch('/api/reports/debtors')
    debtors.value = res.data || []
  } catch {
    debtors.value = []
  } finally {
    debtorLoading.value = false
  }
}

// 收银员明细（admin only）
const cashierStats = ref<any[]>([])
const cashierLoading = ref(false)
const cashierColumns = [
  { title: '收银员', dataIndex: 'cashierName', key: 'cashierName', width: 120 },
  { title: '账号', dataIndex: 'cashierUsername', key: 'cashierUsername', width: 100 },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 90 },
  { title: '销售总额', key: 'totalSales', width: 120, customRender: ({ record }: any) => `¥${Number(record.totalSales).toFixed(2)}` },
  { title: '已收', key: 'totalPaid', width: 120, customRender: ({ record }: any) => `¥${Number(record.totalPaid).toFixed(2)}` },
  { title: '欠款', key: 'totalOwed', width: 120, customRender: ({ record }: any) => `¥${Number(record.totalOwed).toFixed(2)}` },
]

const loadCashierStats = async () => {
  if (!isStrictAdmin.value) return
  cashierLoading.value = true
  try {
    const res: any = await $fetch('/api/reports/cashier', {
      query: { startDate: dateRange.value[0], endDate: dateRange.value[1] },
    })
    cashierStats.value = res.data || []
  } catch {
    cashierStats.value = []
  } finally {
    cashierLoading.value = false
  }
}

const dateRange = ref<[string, string]>([
  dayjs().startOf('day').format('YYYY-MM-DD'),
  dayjs().endOf('day').format('YYYY-MM-DD'),
])

const data = ref<any | null>(null)

const trendColumns = [
  { title: '日期', key: 'date', dataIndex: 'date', width: 120 },
  { title: '订单数', key: 'orderCount', dataIndex: 'orderCount', width: 90 },
  { title: '销售额', key: 'amount', width: 120 },
  { title: '毛利', key: 'profit', width: 120 },
  { title: '走势', key: 'bar' },
]

const slowColumns = [
  { title: '商品名', key: 'productName', dataIndex: 'productName', width: 200 },
  { title: '当前库存', key: 'currentStock', dataIndex: 'currentStock', width: 100 },
  { title: '7天销量', key: 'soldCount', width: 90 },
  { title: '最后销售日期', key: 'lastSoldAt', width: 150 },
  { title: '停滞天数', key: 'stagnantDays', width: 110 },
]

const marginColor = computed(() => {
  const m = data.value?.summary?.grossMargin || 0
  if (m >= 30) return '#059669'
  if (m >= 10) return '#d97706'
  return '#dc2626'
})

const maxDailyAmount = computed(() => {
  if (!data.value?.dailyTrend?.length) return 0
  return Math.max(...data.value.dailyTrend.map((d: any) => d.amount))
})

const totalPaymentAmount = computed(() => {
  if (!data.value?.paymentMethods?.length) return 0
  return data.value.paymentMethods.reduce((s: number, m: any) => s + m.amount, 0)
})

const percent = (part: number, total: number) => {
  if (total <= 0) return '0.0'
  return ((part / total) * 100).toFixed(1)
}

const formatQty = (n: number) => {
  if (!n) return 0
  return Number.isInteger(n) ? n : n.toFixed(2)
}

const stagnantDays = (record: any) => {
  if (!record.lastSoldAt) return '∞'
  return dayjs().startOf('day').diff(dayjs(record.lastSoldAt).startOf('day'), 'day')
}

const rankClass = (index: number) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

const applyPreset = (preset: string) => {
  const today = dayjs()
  switch (preset) {
    case 'today':
      dateRange.value = [today.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
      break
    case 'yesterday': {
      const y = today.subtract(1, 'day')
      dateRange.value = [y.format('YYYY-MM-DD'), y.format('YYYY-MM-DD')]
      break
    }
    case 'week':
      dateRange.value = [today.startOf('week').format('YYYY-MM-DD'), today.endOf('week').format('YYYY-MM-DD')]
      break
    case 'month':
      dateRange.value = [today.startOf('month').format('YYYY-MM-DD'), today.endOf('month').format('YYYY-MM-DD')]
      break
    case 'lastMonth': {
      const lm = today.subtract(1, 'month')
      dateRange.value = [lm.startOf('month').format('YYYY-MM-DD'), lm.endOf('month').format('YYYY-MM-DD')]
      break
    }
  }
  loadData()
}

const onExportReport = () => {
  if (!data.value) {
    message.warning('暂无数据可导出')
    return
  }
  const { exportToCsv } = useExport()
  const s = data.value.summary
  const rows: any[][] = []

  // 核心指标
  rows.push(['--- 核心指标 ---', ''])
  rows.push(['销售总额', s.totalSales.toFixed(2)])
  rows.push(['订单数', s.orderCount])
  rows.push(['客单价', s.avgOrderValue.toFixed(2)])
  rows.push(['毛利率', s.grossMargin.toFixed(1) + '%'])
  rows.push(['已收金额', s.totalPaid.toFixed(2)])
  rows.push(['新增欠款', s.totalOwed.toFixed(2)])
  rows.push(['进货成本', s.totalCost.toFixed(2)])
  rows.push(['毛利总额', s.grossProfit.toFixed(2)])
  rows.push([])

  // 每日趋势
  rows.push(['--- 每日趋势 ---', '', '', ''])
  rows.push(['日期', '订单数', '销售额', '毛利'])
  for (const d of data.value.dailyTrend || []) {
    rows.push([d.date, d.orderCount, d.amount.toFixed(2), d.profit.toFixed(2)])
  }
  rows.push([])

  // 畅销榜
  rows.push(['--- 畅销榜 TOP 10 ---', '', '', '', ''])
  rows.push(['排名', '商品名', '销量', '销售额', '毛利'])
  ;(data.value.topProducts || []).forEach((p: any, i: number) => {
    rows.push([i + 1, p.productName, formatQty(p.qty), p.amount.toFixed(2), p.profit.toFixed(2)])
  })
  rows.push([])

  // 支付方式
  rows.push(['--- 支付方式分布 ---', '', ''])
  rows.push(['方式', '笔数', '金额'])
  for (const m of data.value.paymentMethods || []) {
    rows.push([paymentMethodText(m.method), m.count, m.amount.toFixed(2)])
  }
  rows.push([])

  // 滞销商品
  rows.push(['--- 滞销商品 ---', '', '', ''])
  rows.push(['商品名', '当前库存', '7天销量', '最后销售日期'])
  for (const p of data.value.slowProducts || []) {
    rows.push([p.productName, p.currentStock, p.soldCount, p.lastSoldAt ? formatDate(p.lastSoldAt) : '从未销售'])
  }

  const headers = ['指标', '值']
  const filename = `经营报表_${dateRange.value[0]}_${dateRange.value[1]}`
  exportToCsv(filename, headers, rows)
  message.success('报表已导出')
}

const loadData = async () => {
  try {
    const result = await fetchDashboard({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
    })
    data.value = result
  } catch {
    data.value = null
  }
}

onMounted(() => {
  loadData()
  loadDebtors()
  loadCashierStats()
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.metric-card :deep(.ant-statistic-title) {
  color: #6b7280;
  font-size: 13px;
}

.metric-card :deep(.ant-statistic-content) {
  font-size: 26px;
  font-weight: bold;
  color: #db2777;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background: #e5e7eb;
  color: #6b7280;
}

.rank-gold { background: #fbbf24; color: #fff; }
.rank-silver { background: #9ca3af; color: #fff; }
.rank-bronze { background: #b45309; color: #fff; }

.bar-container {
  width: 100%;
  height: 10px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #f472b6);
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
