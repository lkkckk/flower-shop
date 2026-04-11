<template>
  <div class="space-y-4">
    <!-- 筛选卡片 -->
    <a-card class="page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-select
            v-model:value="customerId"
            placeholder="选择客户"
            show-search
            allow-clear
            class="w-56"
            :options="customerOptions"
            :filter-option="filterOption"
            @search="onCustomerSearch"
          />
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :presets="datePresets"
          />
          <a-button type="primary" :disabled="!canGenerate" @click="loadStatement">生成对账单</a-button>
        </div>
        <div v-if="statement" class="toolbar-right">
          <a-button @click="onExport">
            <template #icon><DownloadOutlined /></template>
            导出 Excel
          </a-button>
          <a-button type="primary" @click="onPrint">
            <template #icon><PrinterOutlined /></template>
            打印对账单
          </a-button>
        </div>
      </div>
    </a-card>

    <a-spin :spinning="loading">
      <!-- 空状态 -->
      <a-card v-if="!statement" class="page-card">
        <a-empty description="请选择客户和日期生成对账单" />
      </a-card>

      <!-- 对账单内容 -->
      <a-card v-else class="page-card">
        <!-- 标题区 -->
        <div class="text-center mb-6">
          <div class="text-2xl font-bold text-gray-800">{{ shopName }}</div>
          <div class="text-gray-500 mt-1">客户对账单</div>
        </div>

        <!-- 客户信息 -->
        <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" bordered size="small" class="mb-4">
          <a-descriptions-item label="客户姓名">{{ statement.customer.name }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ statement.customer.phone || '—' }}</a-descriptions-item>
          <a-descriptions-item label="客户等级">
            <a-tag :color="getLevelColor(statement.customer.level)">{{ getLevelName(statement.customer.level) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="对账期间" :span="2">
            {{ formatDate(statement.startDate) }} 至 {{ formatDate(statement.endDate) }}
          </a-descriptions-item>
          <a-descriptions-item label="地址">{{ statement.customer.address || '—' }}</a-descriptions-item>
        </a-descriptions>

        <!-- 期初余额 -->
        <div class="bg-gray-50 p-3 rounded mb-3 flex justify-between items-center">
          <span class="text-gray-600">期初欠款</span>
          <span :class="balanceColor(statement.openingBalance)" class="text-lg font-bold">
            ¥{{ statement.openingBalance.toFixed(2) }}
          </span>
        </div>

        <!-- 明细表格 -->
        <a-table
          :columns="columns"
          :data-source="tableRows"
          :pagination="false"
          row-key="_key"
          size="small"
          :scroll="{ x: 800 }"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'date'">
              {{ record._isFooter ? '' : formatDateTime(record.date) }}
            </template>
            <template v-else-if="column.key === 'type'">
              <template v-if="record._isFooter"></template>
              <a-tag v-else-if="record.kind === 'order'" color="red">订单</a-tag>
              <a-tag v-else color="green">收款</a-tag>
            </template>
            <template v-else-if="column.key === 'refNo'">
              <span class="font-mono text-xs">{{ record.refNo }}</span>
            </template>
            <template v-else-if="column.key === 'summary'">
              <span :class="record._isFooter ? 'font-bold' : ''">{{ record.summary }}</span>
            </template>
            <template v-else-if="column.key === 'amount'">
              <template v-if="record._isFooter"></template>
              <span v-else-if="record.amount > 0" class="text-red-600 font-medium">
                +¥{{ record.amount.toFixed(2) }}
              </span>
              <span v-else-if="record.amount < 0" class="text-green-600 font-medium">
                -¥{{ Math.abs(record.amount).toFixed(2) }}
              </span>
              <span v-else class="text-gray-400">¥0.00</span>
            </template>
            <template v-else-if="column.key === 'running'">
              <span
                :class="[
                  record._isFooter ? 'font-bold text-lg' : 'font-medium',
                  balanceColor(record.runningBalance),
                ]"
              >
                ¥{{ record.runningBalance.toFixed(2) }}
              </span>
            </template>
          </template>
        </a-table>

        <!-- 汇总区 -->
        <a-descriptions :column="{ xs: 1, sm: 2, md: 5 }" bordered size="small" class="mt-6">
          <a-descriptions-item label="期间销售">
            ¥{{ statement.summary.totalSales.toFixed(2) }}
          </a-descriptions-item>
          <a-descriptions-item label="已收金额">
            <span class="text-green-600">¥{{ statement.summary.totalPaid.toFixed(2) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="新增欠款">
            <span class="text-red-600">¥{{ statement.summary.totalOwed.toFixed(2) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="还款金额">
            <span class="text-green-600">¥{{ statement.summary.totalRepay.toFixed(2) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="期末欠款">
            <span :class="balanceColor(statement.summary.closingBalance)" class="font-bold text-lg">
              ¥{{ statement.summary.closingBalance.toFixed(2) }}
            </span>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 签字区 -->
        <div class="mt-10 grid grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            客户签字：<span class="inline-block border-b border-gray-400 w-32 ml-2">&nbsp;</span>
          </div>
          <div class="text-center">
            对账日期：{{ todayStr }}
          </div>
          <div class="text-right">
            店铺签字：<span class="inline-block border-b border-gray-400 w-32 ml-2">&nbsp;</span>
          </div>
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useCustomers } from '~/composables/useCustomers'
import { useExport } from '~/composables/useExport'
import { buildStatementLines, formatDate, formatDateTime, paymentMethodText } from '~/composables/useStatement'

useHead({ title: '客户对账单 - 花店管理系统' })

const shopName = '鲜花批发店'
const todayStr = dayjs().format('YYYY-MM-DD')

const { searchCustomers } = useCustomers()
const { exportToCsv } = useExport()

const customerId = ref<number | undefined>(undefined)
const dateRange = ref<[string, string]>([
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().endOf('month').format('YYYY-MM-DD'),
])
const customerOptions = ref<{ value: number; label: string }[]>([])
const statement = ref<any | null>(null)
const loading = ref(false)

const datePresets = [
  { label: '今天', value: [dayjs(), dayjs()] },
  { label: '本周', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
  { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: '本季度', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
]

const canGenerate = computed(() => !!customerId.value && !!dateRange.value?.[0] && !!dateRange.value?.[1])

const columns = [
  { title: '日期', key: 'date', width: 150 },
  { title: '类型', key: 'type', width: 80 },
  { title: '单号', key: 'refNo', width: 150 },
  { title: '摘要', key: 'summary' },
  { title: '金额', key: 'amount', width: 130, align: 'right' as const },
  { title: '累计欠款', key: 'running', width: 130, align: 'right' as const },
]

const tableRows = computed(() => {
  if (!statement.value) return []
  const lines = buildStatementLines(
    statement.value.orders,
    statement.value.payments,
    statement.value.openingBalance
  )
  const rows: any[] = lines.map((l, idx) => ({ ...l, _key: `row-${idx}`, _isFooter: false }))
  // 期末行
  rows.push({
    _key: 'footer',
    _isFooter: true,
    summary: '期末欠款合计',
    runningBalance: statement.value.summary.closingBalance,
  })
  return rows
})

const onCustomerSearch = async (keyword: string) => {
  try {
    const data = await searchCustomers(keyword || '')
    customerOptions.value = (data.list || []).map((c: any) => ({
      value: c.id,
      label: `${c.name}${c.phone ? ' · ' + c.phone : ''}`,
    }))
  } catch {
    customerOptions.value = []
  }
}

const filterOption = (input: string, option: any) => {
  return option.label?.toLowerCase().includes(input.toLowerCase())
}

const loadStatement = async () => {
  if (!canGenerate.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/payments/statement', {
      query: {
        customerId: customerId.value,
        startDate: dateRange.value[0],
        endDate: dateRange.value[1],
      },
    })
    if (res.error) {
      message.error(res.error.message || '生成对账单失败')
      statement.value = null
      return
    }
    statement.value = res.data
  } catch (e: any) {
    message.error(e.message || '生成对账单失败')
    statement.value = null
  } finally {
    loading.value = false
  }
}

const onPrint = () => {
  if (!statement.value) return
  const url = `/payments/print/${customerId.value}?startDate=${dateRange.value[0]}&endDate=${dateRange.value[1]}`
  window.open(url, '_blank')
}

const onExport = () => {
  if (!statement.value) return
  const lines = buildStatementLines(
    statement.value.orders,
    statement.value.payments,
    statement.value.openingBalance
  )
  const headers = ['日期', '类型', '单号', '摘要', '金额', '累计欠款']
  const rows: any[][] = []

  // 首行：期初欠款
  rows.push([
    formatDate(statement.value.startDate),
    '期初',
    '-',
    '期初欠款',
    '',
    statement.value.openingBalance.toFixed(2),
  ])

  for (const line of lines) {
    rows.push([
      formatDateTime(line.date),
      line.kind === 'order' ? '订单' : '收款',
      line.refNo,
      line.summary,
      line.amount.toFixed(2),
      line.runningBalance.toFixed(2),
    ])
  }

  // 期末汇总
  rows.push([])
  rows.push(['汇总', '', '', '期间销售', statement.value.summary.totalSales.toFixed(2), ''])
  rows.push(['汇总', '', '', '已收金额', statement.value.summary.totalPaid.toFixed(2), ''])
  rows.push(['汇总', '', '', '新增欠款', statement.value.summary.totalOwed.toFixed(2), ''])
  rows.push(['汇总', '', '', '还款金额', statement.value.summary.totalRepay.toFixed(2), ''])
  rows.push(['汇总', '', '', '期末欠款', '', statement.value.summary.closingBalance.toFixed(2)])

  const name = statement.value.customer.name
  const filename = `对账单_${name}_${dayjs(statement.value.startDate).format('YYYYMMDD')}-${dayjs(statement.value.endDate).format('YYYYMMDD')}`
  exportToCsv(filename, headers, rows)
  message.success('对账单已导出')
}

const balanceColor = (n: number) => {
  if (n > 0) return 'text-red-600'
  if (n < 0) return 'text-green-600'
  return 'text-gray-500'
}

const getLevelName = (level: string) => {
  const map: Record<string, string> = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || level
}
const getLevelColor = (level: string) => {
  const map: Record<string, string> = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}

onMounted(() => {
  onCustomerSearch('')
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

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
