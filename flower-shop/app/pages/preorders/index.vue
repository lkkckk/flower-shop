<template>
  <div>
    <a-card class="page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索单号 / 客户 / 收货人 / 电话"
            allow-clear
            class="w-72"
            @search="onFilterChange"
          />
          <a-range-picker
            v-model:value="deliveryRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :allow-clear="true"
            :placeholder="['履约开始', '履约结束']"
            @change="onFilterChange"
          />
          <a-select
            v-model:value="filterStatus"
            placeholder="状态"
            allow-clear
            class="w-32"
            :options="statusOptions"
            @change="onFilterChange"
          />
          <a-select
            v-model:value="filterReminder"
            placeholder="提醒"
            allow-clear
            class="w-32"
            :options="reminderOptions"
            @change="onFilterChange"
          />
        </div>
        <div>
          <a-button type="primary" @click="goNew">+ 新建预售单</a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        :row-class-name="rowClass"
        class="mt-4"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">
            <span class="font-mono text-sm">{{ record.orderNo }}</span>
            <a-tag v-if="record.sourceChannel" color="blue" class="ml-1">{{ record.sourceChannel }}</a-tag>
          </template>

          <template v-else-if="column.key === 'deliveryTime'">
            <div>{{ formatDateTime(record.deliveryTime) }}</div>
            <a-tag v-if="record.reminderStage && record.reminderStage !== 'none'" :color="reminderColor(record.reminderStage)">
              {{ reminderLabel(record.reminderStage) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'receiver'">
            <div>{{ record.receiverName || '-' }}</div>
            <div class="text-xs text-gray-400">{{ record.receiverPhone || '-' }}</div>
          </template>

          <template v-else-if="column.key === 'customer'">
            <span v-if="record.customer">{{ record.customer.name }}</span>
            <span v-else class="text-gray-400">散客</span>
          </template>

          <template v-else-if="column.key === 'totalAmount'">
            <span class="font-bold text-pink-600">¥{{ record.totalAmount.toFixed(2) }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="goDetail(record.id)">详情</a-button>
            <a-button type="link" size="small" @click="goPrint(record.id)">打印</a-button>
          </template>
        </template>
      </a-table>

      <div class="mt-4 flex justify-end">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-total="(t: number) => `共 ${t} 条`"
          @change="loadList"
          @show-size-change="loadList"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { usePreorders } from '~/composables/usePreorders'
import { PREORDER_STATUS_LABEL } from '../../../shared/preorderStatus'
import { REMINDER_STAGE_LABEL, REMINDER_STAGE_COLOR } from '../../../shared/preorderReminder'

useHead({ title: '预售管理 - 花店管理系统' })

const router = useRouter()
const { fetchList, loading } = usePreorders()

const keyword = ref('')
const deliveryRange = ref<[string, string] | null>(null)
const filterStatus = ref<string | undefined>()
const filterReminder = ref<string | undefined>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref<any[]>([])

const statusOptions = Object.entries(PREORDER_STATUS_LABEL).map(([value, label]) => ({ value, label }))
const reminderOptions = [
  { value: 'd7', label: '7天内' },
  { value: 'd3', label: '3天内' },
  { value: 'due', label: '今日' },
  { value: 'overdue', label: '已逾期' },
]

const columns = [
  { title: '单号', key: 'orderNo', width: 220 },
  { title: '履约时间', key: 'deliveryTime', width: 180 },
  { title: '收货人', key: 'receiver', width: 140 },
  { title: '下单客户', key: 'customer', width: 120 },
  { title: '金额', key: 'totalAmount', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
]

const loadList = async () => {
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.q = keyword.value
    if (deliveryRange.value) {
      params.deliveryStart = deliveryRange.value[0]
      params.deliveryEnd = deliveryRange.value[1]
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterReminder.value) params.reminderStage = filterReminder.value
    const data = await fetchList(params)
    list.value = data.list
    total.value = data.total
  } catch {
    list.value = []
    total.value = 0
  }
}

const onFilterChange = () => { page.value = 1; loadList() }

const goNew = () => router.push('/preorders/new')
const goDetail = (id: number) => router.push(`/preorders/${id}`)
const goPrint = (id: number) => window.open(`/preorders/${id}/delivery-slip`, '_blank')

const formatDateTime = (d: any) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-')

const rowClass = (record: any) => {
  const stage = record.reminderStage
  if (stage === 'due' || stage === 'overdue') return 'row-urgent'
  if (stage === 'd3') return 'row-soon'
  if (stage === 'd7') return 'row-warn'
  return ''
}

const reminderColor = (s: string) => REMINDER_STAGE_COLOR[s as keyof typeof REMINDER_STAGE_COLOR] || 'default'
const reminderLabel = (s: string) => REMINDER_STAGE_LABEL[s as keyof typeof REMINDER_STAGE_LABEL] || ''

const statusLabel = (s: string) => PREORDER_STATUS_LABEL[s as keyof typeof PREORDER_STATUS_LABEL] || s
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending_confirm: 'default',
    booked: 'blue',
    scheduled: 'cyan',
    in_production: 'purple',
    ready_to_ship: 'orange',
    completed: 'green',
    cancelled: 'default',
  }
  return map[s] || 'default'
}

onMounted(loadList)
</script>

<style scoped>
.page-card { border-radius: 8px; }
.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px;
}
.toolbar-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
:deep(.row-urgent) { background: #fff1f0; }
:deep(.row-soon)   { background: #fff7e6; }
:deep(.row-warn)   { background: #feffe6; }
</style>
