<template>
  <div>
    <a-card class="page-card">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :allow-clear="true"
            @change="onFilterChange"
          />
          <a-select
            v-model:value="filterCustomerId"
            placeholder="筛选客户"
            show-search
            allow-clear
            class="w-48"
            :options="customerOptions"
            :filter-option="filterOption"
            @search="onCustomerSearch"
            @change="onFilterChange"
          />
          <a-select
            v-model:value="filterStatus"
            placeholder="订单状态"
            allow-clear
            class="w-32"
            :options="statusOptions"
            @change="onFilterChange"
          />
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 1000 }"
        class="mt-4"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">
            <span class="font-mono text-sm">{{ record.orderNo }}</span>
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
            <a-button type="link" size="small" @click="viewOrder(record.id)">查看</a-button>
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
import { useOrders } from '~/composables/useOrders'
import { useCustomers } from '~/composables/useCustomers'

useHead({ title: '订单记录 - 花店管理系统' })

const router = useRouter()
const { fetchOrders, loading } = useOrders()
const { searchCustomers } = useCustomers()

const dateRange = ref<[string, string] | null>(null)
const filterCustomerId = ref<number | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref<any[]>([])
const customerOptions = ref<{ value: number; label: string }[]>([])

const statusOptions = [
  { value: 'paid', label: '已付款' },
  { value: 'partial', label: '部分付款' },
  { value: 'unpaid', label: '挂账' },
  { value: 'pending', label: '待付款' },
]

const columns = [
  { title: '单号', key: 'orderNo', width: 170 },
  { title: '日期', key: 'createdAt', width: 160 },
  { title: '客户', key: 'customer', width: 120 },
  { title: '总金额', key: 'totalAmount', width: 110 },
  { title: '已付', key: 'paidAmount', width: 110 },
  { title: '未付', key: 'owedAmount', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' as const },
]

const loadList = async () => {
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (filterCustomerId.value) params.customerId = filterCustomerId.value
    if (filterStatus.value) params.status = filterStatus.value

    const data = await fetchOrders(params)
    list.value = data.list
    total.value = data.total
  } catch {
    list.value = []
    total.value = 0
  }
}

const onFilterChange = () => {
  page.value = 1
  loadList()
}

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

const viewOrder = (id: number) => {
  window.open(`/orders/${id}/print`, '_blank')
}

const goCustomer = (id: number) => {
  router.push(`/customers/${id}`)
}

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

onMounted(async () => {
  await onCustomerSearch('')
  await loadList()
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
