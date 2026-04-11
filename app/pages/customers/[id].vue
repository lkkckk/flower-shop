<template>
  <div>
    <a-page-header
      class="page-header"
      :title="customer?.name || '客户详情'"
      @back="goBack"
    >
      <template #tags>
        <a-tag v-if="customer" :color="getLevelColor(customer.level)">{{ getLevelName(customer.level) }}</a-tag>
      </template>
      <template #extra>
        <a-button v-if="customer" @click="openEdit">编辑</a-button>
        <a-button v-if="customer" type="primary" @click="openRepay">收款</a-button>
      </template>
    </a-page-header>

    <a-spin :spinning="loading">
      <a-card v-if="customer" class="page-card mt-4">
        <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" bordered size="small">
          <a-descriptions-item label="姓名">{{ customer.name }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ customer.phone || '—' }}</a-descriptions-item>
          <a-descriptions-item label="等级">
            <a-tag :color="getLevelColor(customer.level)">{{ getLevelName(customer.level) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="账户余额">
            <span v-if="customer.balance > 0" class="text-green-600 font-bold">预存 ¥{{ customer.balance.toFixed(2) }}</span>
            <span v-else-if="customer.balance < 0" class="text-red-600 font-bold">欠款 ¥{{ Math.abs(customer.balance).toFixed(2) }}</span>
            <span v-else class="text-gray-400">—</span>
          </a-descriptions-item>
          <a-descriptions-item label="累计欠款">¥{{ (customer.totalOwed || 0).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDateTime(customer.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="地址" :span="3">{{ customer.address || '—' }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="3">{{ customer.notes || '—' }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card v-if="customer" class="page-card mt-4">
        <a-tabs v-model:active-key="activeTab">
          <a-tab-pane key="orders" tab="最近订单">
            <a-empty v-if="!customer.orders || customer.orders.length === 0" description="暂无订单" />
            <a-table
              v-else
              :columns="orderColumns"
              :data-source="customer.orders"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 700 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'orderNo'">
                  <span class="font-mono text-sm">{{ record.orderNo }}</span>
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTime(record.createdAt) }}
                </template>
                <template v-else-if="column.key === 'totalAmount'">
                  <span class="font-medium">¥{{ record.totalAmount.toFixed(2) }}</span>
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
                  <a-tag :color="orderStatusColor(record.status)">{{ orderStatusText(record.status) }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="payments" tab="收款流水">
            <a-empty v-if="!customer.payments || customer.payments.length === 0" description="暂无流水" />
            <a-table
              v-else
              :columns="paymentColumns"
              :data-source="customer.payments"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 600 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'createdAt'">
                  {{ formatDateTime(record.createdAt) }}
                </template>
                <template v-else-if="column.key === 'type'">
                  <a-tag :color="paymentTypeColor(record.type)">{{ paymentTypeText(record.type) }}</a-tag>
                </template>
                <template v-else-if="column.key === 'amount'">
                  <span class="font-medium">¥{{ record.amount.toFixed(2) }}</span>
                </template>
                <template v-else-if="column.key === 'paymentMethod'">
                  {{ paymentMethodText(record.paymentMethod) }}
                </template>
                <template v-else-if="column.key === 'notes'">
                  <span class="text-gray-500">{{ record.notes || '—' }}</span>
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </a-spin>

    <CustomerForm
      v-model:visible="formVisible"
      :customer="customer"
      @success="loadCustomer"
    />

    <RepayDialog
      v-model:visible="repayVisible"
      :customer="customer"
      @success="loadCustomer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useCustomers } from '~/composables/useCustomers'
import CustomerForm from '~/components/customers/CustomerForm.vue'
import RepayDialog from '~/components/customers/RepayDialog.vue'

useHead({ title: '客户详情 - 花店管理系统' })

const route = useRoute()
const router = useRouter()
const { fetchCustomer, loading } = useCustomers()

const customer = ref<any | null>(null)
const activeTab = ref('orders')
const formVisible = ref(false)
const repayVisible = ref(false)

const orderColumns = [
  { title: '订单号', key: 'orderNo', width: 160 },
  { title: '日期', key: 'createdAt', width: 160 },
  { title: '总金额', key: 'totalAmount', width: 100 },
  { title: '已付', key: 'paidAmount', width: 100 },
  { title: '未付', key: 'owedAmount', width: 100 },
  { title: '状态', key: 'status', width: 100 },
]

const paymentColumns = [
  { title: '日期', key: 'createdAt', width: 160 },
  { title: '类型', key: 'type', width: 80 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '支付方式', key: 'paymentMethod', width: 100 },
  { title: '备注', key: 'notes' },
]

const loadCustomer = async () => {
  const id = Number(route.params.id)
  if (!id) return
  try {
    const data = await fetchCustomer(id)
    customer.value = data
  } catch {
    customer.value = null
  }
}

const goBack = () => router.push('/customers')

const openEdit = () => {
  formVisible.value = true
}

const openRepay = () => {
  repayVisible.value = true
}

const formatDateTime = (d: string | Date) => dayjs(d).format('YYYY-MM-DD HH:mm')

const getLevelName = (level: string) => {
  const map: Record<string, string> = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || level
}

const getLevelColor = (level: string) => {
  const map: Record<string, string> = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}

const orderStatusText = (s: string) => {
  const map: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    partial: '部分付款',
    unpaid: '挂账',
    cancelled: '已取消',
  }
  return map[s] || s
}

const orderStatusColor = (s: string) => {
  const map: Record<string, string> = {
    pending: 'default',
    paid: 'green',
    partial: 'orange',
    unpaid: 'red',
    cancelled: 'default',
  }
  return map[s] || 'default'
}

const paymentTypeText = (t: string) => {
  const map: Record<string, string> = { income: '收款', repay: '还款', refund: '退款' }
  return map[t] || t
}

const paymentTypeColor = (t: string) => {
  const map: Record<string, string> = { income: 'green', repay: 'blue', refund: 'orange' }
  return map[t] || 'default'
}

const paymentMethodText = (m: string) => {
  const map: Record<string, string> = { cash: '现金', wechat: '微信', alipay: '支付宝', credit: '记账' }
  return map[m] || m
}

onMounted(() => {
  loadCustomer()
})
</script>

<style scoped>
.page-header {
  background: #fff;
  border-radius: 8px;
}

.page-card {
  border-radius: 8px;
}
</style>
