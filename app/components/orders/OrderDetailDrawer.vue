<template>
  <a-drawer
    :open="open"
    width="640"
    title="订单详情"
    placement="right"
    @update:open="$emit('update:open', $event)"
  >
    <a-spin :spinning="loading">
      <template v-if="detail">
        <!-- 顶部：单号 + 状态 + 创建时间 -->
        <div class="head">
          <div class="head-left">
            <span class="font-mono text-base">{{ detail.orderNo }}</span>
            <a-tag :color="statusColor(detail.status)" class="ml-2">{{ statusText(detail.status) }}</a-tag>
            <a-tag v-if="detail.priceMode && detail.priceMode !== 'retail'" color="purple" class="ml-1">
              {{ priceModeText(detail.priceMode) }}
            </a-tag>
          </div>
          <div class="head-right text-xs text-gray-500">
            {{ formatDateTime(detail.createdAt) }}
          </div>
        </div>

        <!-- 金额一目了然 -->
        <div class="amount-row">
          <div class="amount-cell">
            <span>总额</span>
            <b class="text-pink-600">¥{{ detail.totalAmount.toFixed(2) }}</b>
          </div>
          <div class="amount-cell">
            <span>已付</span>
            <b class="text-green-600">¥{{ detail.paidAmount.toFixed(2) }}</b>
          </div>
          <div class="amount-cell">
            <span>未付</span>
            <b :class="detail.owedAmount > 0 ? 'text-red-600' : 'text-gray-400'">
              ¥{{ detail.owedAmount.toFixed(2) }}
            </b>
          </div>
        </div>

        <a-tabs v-model:active-key="activeTab">
          <a-tab-pane key="info" tab="基础信息">
            <a-descriptions :column="1" size="small" :label-style="{ width: '88px', color: '#6b7280' }">
              <a-descriptions-item label="客户">
                <a-button v-if="detail.customer" type="link" class="p-0" @click="goCustomer">
                  {{ detail.customer.name }}{{ detail.customer.phone ? ' · ' + detail.customer.phone : '' }}
                </a-button>
                <span v-else class="text-gray-400">散客</span>
              </a-descriptions-item>
              <a-descriptions-item label="收银员">
                {{ detail.cashier?.name || detail.cashier?.username || '—' }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.orderType === 'preorder'" label="履约时间">
                {{ formatDateTime(detail.deliveryTime) }} · {{ detail.fulfillmentType === 'pickup' ? '自提' : '配送' }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.receiverName" label="收货人">
                {{ detail.receiverName }}{{ detail.receiverPhone ? ' · ' + detail.receiverPhone : '' }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.deliveryAddress" label="配送地址">
                {{ detail.deliveryAddress }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.sourceChannel" label="渠道">
                {{ detail.sourceChannel }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.promotion" label="促销活动">
                {{ detail.promotion.name }} · 满 {{ detail.promotion.threshold }} 减 {{ detail.promotion.reduction }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.discountRate" label="折扣率">
                {{ detail.discountRate }}%
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.cardMessage" label="贺卡">
                {{ detail.cardMessage }}
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.notes" label="备注">
                {{ detail.notes }}
              </a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>

          <a-tab-pane key="items" :tab="`商品明细 (${detail.items?.length || 0})`">
            <a-table
              :columns="itemColumns"
              :data-source="detail.items"
              :pagination="false"
              size="small"
              row-key="id"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'product'">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ record.product?.name || '已删除商品' }}</span>
                    <span class="text-xs text-gray-400">
                      <template v-if="record.grade">{{ record.grade }}</template>
                      <template v-if="record.color"> · {{ record.color }}</template>
                    </span>
                  </div>
                </template>
                <template v-else-if="column.key === 'qty'">
                  {{ record.qty }} {{ record.unit }}
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  ¥{{ record.unitPrice.toFixed(2) }}
                </template>
                <template v-else-if="column.key === 'subtotal'">
                  <b class="text-pink-600">¥{{ record.subtotal.toFixed(2) }}</b>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="payments" :tab="`收款流水 (${detail.paymentLogs?.length || 0})`">
            <a-table
              :columns="paymentColumns"
              :data-source="detail.paymentLogs"
              :pagination="false"
              size="small"
              row-key="id"
              :locale="{ emptyText: '暂无收款流水' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'createdAt'">
                  {{ formatDateTime(record.createdAt) }}
                </template>
                <template v-else-if="column.key === 'amount'">
                  <b :class="record.type === 'refund' ? 'text-red-600' : 'text-green-600'">
                    {{ record.type === 'refund' ? '-' : '+' }}¥{{ record.amount.toFixed(2) }}
                  </b>
                </template>
                <template v-else-if="column.key === 'paymentMethod'">
                  {{ payMethodText(record.paymentMethod) }}
                </template>
                <template v-else-if="column.key === 'type'">
                  <a-tag :color="record.type === 'refund' ? 'red' : 'green'">{{ payTypeText(record.type) }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="actions" tab="操作">
            <a-space direction="vertical" class="w-full" :size="12">
              <a-card v-if="detail.owedAmount > 0" size="small" title="补款">
                <div class="mb-3 text-sm text-gray-500">
                  当前欠款 <b class="text-red-600">¥{{ detail.owedAmount.toFixed(2) }}</b>
                </div>
                <a-form layout="vertical">
                  <a-form-item label="补款金额">
                    <a-input-number
                      v-model:value="repayForm.amount"
                      :min="0.01"
                      :max="detail.owedAmount"
                      :step="0.01"
                      :precision="2"
                      class="w-full"
                      placeholder="请输入补款金额"
                    />
                  </a-form-item>
                  <a-form-item label="支付方式">
                    <a-radio-group v-model:value="repayForm.paymentMethod">
                      <a-radio-button value="cash">现金</a-radio-button>
                      <a-radio-button value="wechat">微信</a-radio-button>
                      <a-radio-button value="alipay">支付宝</a-radio-button>
                    </a-radio-group>
                  </a-form-item>
                  <a-form-item label="备注">
                    <a-input v-model:value="repayForm.notes" placeholder="可选" />
                  </a-form-item>
                  <a-button
                    type="primary"
                    :loading="repaying"
                    class="bg-pink-500 hover:bg-pink-600 border-none"
                    block
                    @click="onRepay"
                  >
                    确认补款
                  </a-button>
                </a-form>
              </a-card>

              <a-card size="small" title="打印">
                <a-space>
                  <a-button @click="goPrintReceipt">打印小票</a-button>
                  <a-button v-if="detail.orderType === 'preorder'" @click="goPrintDelivery">打印配送单</a-button>
                </a-space>
              </a-card>
            </a-space>
          </a-tab-pane>
        </a-tabs>
      </template>
      <a-empty v-else-if="!loading" description="未加载到订单" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

const props = defineProps<{
  open: boolean
  orderId: number | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  refresh: []
}>()

const loading = ref(false)
const detail = ref<any | null>(null)
const activeTab = ref('info')
const repaying = ref(false)
const repayForm = reactive({
  amount: null as number | null,
  paymentMethod: 'cash' as 'cash' | 'wechat' | 'alipay',
  notes: '',
})

const itemColumns = [
  { title: '商品', key: 'product' },
  { title: '数量', key: 'qty', width: 90 },
  { title: '单价', key: 'unitPrice', width: 90 },
  { title: '小计', key: 'subtotal', width: 100 },
]
const paymentColumns = [
  { title: '时间', key: 'createdAt', width: 140 },
  { title: '类型', key: 'type', width: 80 },
  { title: '金额', key: 'amount', width: 110 },
  { title: '方式', key: 'paymentMethod', width: 80 },
  { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true },
]

const formatDateTime = (d: string | Date | null | undefined) =>
  d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—'

const statusText = (s: string) => {
  const map: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    partial: '部分付款',
    unpaid: '挂账',
    cancelled: '已取消',
    pending_confirm: '待确认',
    confirmed: '已确认',
    in_production: '制作中',
    ready: '已完成',
    delivered: '已送达',
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
    pending_confirm: 'blue',
    in_production: 'purple',
    ready: 'cyan',
    delivered: 'green',
  }
  return map[s] || 'default'
}
const priceModeText = (m: string) => {
  const map: Record<string, string> = {
    vip: 'VIP 价',
    wholesale: '批发价',
    discount: '折扣',
    promotion: '满减',
    custom: '自定义',
  }
  return map[m] || m
}
const payMethodText = (m: string) => {
  const map: Record<string, string> = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    balance: '预存',
    credit: '挂账',
  }
  return map[m] || m
}
const payTypeText = (t: string) => {
  const map: Record<string, string> = {
    income: '收款',
    refund: '退款',
    repay: '还款',
    recharge: '充值',
  }
  return map[t] || t
}

const loadDetail = async (id: number) => {
  loading.value = true
  try {
    const res: any = await $fetch(`/api/orders/${id}`)
    if (res.error) {
      message.error(res.error.message)
      detail.value = null
    } else {
      detail.value = res.data
      // 默认补款金额 = 当前欠款，方便一键确认
      repayForm.amount = detail.value.owedAmount > 0 ? detail.value.owedAmount : null
      repayForm.notes = ''
    }
  } catch (e: any) {
    message.error(e.message || '加载失败')
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.orderId] as const,
  ([open, id]) => {
    if (open && id) {
      activeTab.value = 'info'
      loadDetail(id)
    } else if (!open) {
      detail.value = null
    }
  },
  { immediate: true },
)

const onRepay = async () => {
  if (!detail.value || !repayForm.amount || !(repayForm.amount > 0)) {
    message.warning('请输入有效的补款金额')
    return
  }
  repaying.value = true
  try {
    const res: any = await $fetch(`/api/orders/${detail.value.id}/repay`, {
      method: 'POST',
      body: {
        amount: repayForm.amount,
        paymentMethod: repayForm.paymentMethod,
        notes: repayForm.notes || undefined,
      },
    })
    if (res.error) {
      message.error(res.error.message)
    } else {
      message.success('补款成功')
      await loadDetail(detail.value.id)
      emit('refresh')
    }
  } catch (e: any) {
    message.error(e.data?.error?.message || e.message || '补款失败')
  } finally {
    repaying.value = false
  }
}

const goPrintReceipt = () => {
  if (!detail.value) return
  window.open(`/orders/${detail.value.id}/print`, '_blank')
}
const goPrintDelivery = () => {
  if (!detail.value) return
  window.open(`/preorders/${detail.value.id}/print`, '_blank')
}
const goCustomer = () => {
  if (!detail.value?.customer) return
  window.open(`/customers/${detail.value.customer.id}`, '_blank')
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.head-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.amount-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
}
.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.amount-cell span {
  font-size: 12px;
  color: #9ca3af;
}
.amount-cell b {
  font-size: 16px;
}
</style>
