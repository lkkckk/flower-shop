<template>
  <a-spin :spinning="loading && !order">
    <div v-if="order" class="av-page preorder-detail">
      <header class="detail-head">
        <div class="title-block">
          <div class="title-tags">
            <a-tag :color="statusColor(order.status)">{{ statusLabel(order.status) }}</a-tag>
            <a-tag v-if="order.isUrgent" color="red">加急</a-tag>
            <a-tag v-if="order.isMade" color="green">已做好</a-tag>
            <a-tag v-if="order.reminderStage && order.reminderStage !== 'none'" :color="reminderColor(order.reminderStage)">
              {{ reminderLabel(order.reminderStage) }}
            </a-tag>
          </div>
          <h1>
            <TagsOutlined />
            {{ primaryProductTitle }}
          </h1>
          <p>
            <span class="mono">{{ order.orderNo }}</span>
            <i />
            <span>下单 {{ formatDateTime(order.createdAt) }}</span>
            <i />
            <span>经手人：{{ operatorName }}</span>
            <i />
            <span>来源：{{ order.sourceChannel || '店内' }}</span>
          </p>
        </div>

        <div class="head-actions">
          <a-button @click="goPrint">
            <template #icon><PrinterOutlined /></template>
            打印配送单
          </a-button>
          <a-button :disabled="editDisabled" @click="goEdit">
            <template #icon><EditOutlined /></template>
            编辑
          </a-button>
          <a-dropdown :disabled="advanceOptions.length === 0">
            <a-button>
              推进状态 <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="onAdvance">
                <a-menu-item v-for="opt in advanceOptions" :key="opt.value">{{ opt.label }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button
            type="primary"
            class="made-btn"
            :disabled="order.isMade || order.status === 'cancelled'"
            :loading="madeLoading"
            @click="markMade"
          >
            <template #icon><CheckOutlined /></template>
            {{ order.isMade ? '已做好' : '标记已做好' }}
          </a-button>
        </div>
      </header>

      <section class="progress-card av-card">
        <div class="section-title">
          <span><ClockCircleOutlined /> 履约进度</span>
          <button type="button" @click="router.push('/orders/schedule')">查看排单</button>
        </div>
        <div v-if="order.status === 'cancelled'" class="cancelled-state">
          该预售单已取消，履约流程已关闭。
        </div>
        <div v-else class="progress-steps">
          <div v-for="step in progressSteps" :key="step.key" class="progress-step" :class="step.state">
            <div class="step-line" />
            <div class="step-dot">
              <CheckOutlined v-if="step.state === 'done'" />
              <span v-else>{{ step.index + 1 }}</span>
            </div>
            <b>{{ step.label }}</b>
            <small>{{ step.sub }}</small>
          </div>
        </div>
      </section>

      <main class="detail-grid">
        <div class="main-column">
          <a-card class="av-card item-card" title="商品明细">
            <a-table
              :columns="itemColumns"
              :data-source="order.items"
              row-key="id"
              :pagination="false"
              size="middle"
              :scroll="{ x: 820 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'product'">
                  <div class="product-cell">
                    <a-image
                      v-if="productImage(record)"
                      :src="productImage(record)"
                      :width="62"
                      :height="62"
                      class="product-image"
                    />
                    <div v-else class="image-placeholder">图</div>
                    <div class="product-info">
                      <b>{{ productName(record) }}</b>
                      <span v-if="productMeta(record)">{{ productMeta(record) }}</span>
                      <small v-if="record.notes">{{ record.notes }}</small>
                    </div>
                  </div>
                </template>
                <template v-else-if="column.key === 'qty'">
                  <span class="qty">{{ formatQty(record.qty) }} {{ record.unit }}</span>
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  <span>¥{{ formatMoney(record.unitPrice) }}</span>
                </template>
                <template v-else-if="column.key === 'subtotal'">
                  <b class="amount">¥{{ formatMoney(record.subtotal) }}</b>
                </template>
                <template v-else-if="column.key === 'batch'">
                  <span v-if="record.batch" class="batch-no">{{ record.batch.batchNo }}</span>
                  <a-tag v-else color="orange">待分配</a-tag>
                </template>
              </template>
            </a-table>

            <div class="total-panel">
              <div>
                <span>合计</span>
                <b>¥{{ formatMoney(order.totalAmount) }}</b>
              </div>
              <div>
                <span>已付</span>
                <b>¥{{ formatMoney(order.paidAmount) }}</b>
              </div>
              <div class="tail">
                <span>待收尾款</span>
                <b>¥{{ formatMoney(order.owedAmount) }}</b>
              </div>
            </div>
          </a-card>

          <a-card class="av-card notes-card" title="制作备注">
            <div class="note-box">
              <FileTextOutlined />
              <p>{{ order.notes || '暂无制作备注' }}</p>
            </div>
            <div v-if="order.cardMessage" class="card-message">
              <b>贺卡内容</b>
              <p>{{ order.cardMessage }}</p>
            </div>
          </a-card>
        </div>

        <aside class="side-column">
          <a-card class="av-card side-card">
            <template #title><span><UserOutlined /> 收花人</span></template>
            <div class="receiver">
              <div class="avatar">{{ receiverInitial }}</div>
              <div>
                <b>{{ order.receiverName || order.customer?.name || '散客' }}</b>
                <span>下单客户：{{ order.customer?.name || '散客' }}</span>
              </div>
            </div>
            <InfoRow label="电话" :value="order.receiverPhone || order.customer?.phone || '-'" :icon="PhoneOutlined" />
            <InfoRow label="地址" :value="order.deliveryAddress || '-'" :icon="EnvironmentOutlined" />
          </a-card>

          <a-card class="av-card side-card">
            <template #title><span><CalendarOutlined /> 履约信息</span></template>
            <InfoRow label="履约时间" :value="formatDateTime(order.deliveryTime)" :icon="CalendarOutlined" />
            <InfoRow label="配送方式" :value="fulfillmentLabel(order.fulfillmentType)" :icon="InboxOutlined" />
            <InfoRow label="提醒节点" :value="reminderText" :icon="BellOutlined" />
            <InfoRow label="制作状态" :value="order.isMade ? '已做好' : '待制作完成'" :icon="CheckOutlined" />
          </a-card>

          <a-card class="av-card side-card">
            <template #title><span><CreditCardOutlined /> 收款信息</span></template>
            <div class="money-grid">
              <div>
                <span>总额</span>
                <b>¥{{ formatMoney(order.totalAmount) }}</b>
              </div>
              <div>
                <span>已付</span>
                <b>¥{{ formatMoney(order.paidAmount) }}</b>
              </div>
              <div class="debt">
                <span>待收</span>
                <b>¥{{ formatMoney(order.owedAmount) }}</b>
              </div>
            </div>
            <div v-if="recentPayments.length" class="payment-list">
              <div v-for="payment in recentPayments" :key="payment.id" class="payment-row">
                <span>{{ paymentMethodLabel(payment.paymentMethod) }} · {{ formatDateTime(payment.createdAt) }}</span>
                <b>¥{{ formatMoney(payment.amount) }}</b>
              </div>
            </div>
            <div v-else class="mini-empty">暂无收款记录</div>
          </a-card>

          <a-card class="av-card side-card">
            <template #title><span><InboxOutlined /> 批次分配</span></template>
            <div class="batch-summary">
              <div>
                <span>已分配</span>
                <b>{{ allocatedCount }}</b>
              </div>
              <div>
                <span>待分配</span>
                <b>{{ pendingBatchCount }}</b>
              </div>
            </div>
            <div class="batch-list">
              <div v-for="item in order.items" :key="item.id">
                <span>{{ productName(item) }}</span>
                <b>{{ item.batch?.batchNo || '待分配' }}</b>
              </div>
            </div>
          </a-card>
        </aside>
      </main>
    </div>
    <div v-else class="loading-state">加载中...</div>
  </a-spin>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import type { Component } from 'vue'
import {
  BellOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InboxOutlined,
  PhoneOutlined,
  PrinterOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { usePreorders } from '~/composables/usePreorders'
import {
  PREORDER_STATUSES,
  PREORDER_STATUS_LABEL,
  canTransition,
  isStockDeducted,
  type PreorderStatus,
} from '../../../../shared/preorderStatus'
import { REMINDER_STAGE_LABEL, REMINDER_STAGE_COLOR } from '../../../../shared/preorderReminder'

useHead({ title: '预售单详情 - 花店管理系统' })

const InfoRow = defineComponent({
  name: 'InfoRow',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    icon: { type: Object as () => Component, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'info-row' }, [
      h('span', [h(props.icon), props.label]),
      h('b', String(props.value)),
    ])
  },
})

const route = useRoute()
const router = useRouter()
const { loading, fetchOne, advance, setMade } = usePreorders()
const order = ref<any>(null)
const madeLoading = ref(false)

const itemColumns = [
  { title: '商品', key: 'product', width: 360 },
  { title: '数量', key: 'qty', width: 110, align: 'center' as const },
  { title: '单价', key: 'unitPrice', width: 120, align: 'right' as const },
  { title: '小计', key: 'subtotal', width: 130, align: 'right' as const },
  { title: '批次', key: 'batch', width: 150 },
]

const statusFlow = PREORDER_STATUSES.filter((status) => status !== 'cancelled')

const statusStepLabel: Record<string, string> = {
  pending_confirm: '已下单',
  booked: '已确认',
  scheduled: '已排单',
  in_production: '制作中',
  ready_to_ship: '待配送',
  completed: '已交付',
}

const currentStatusIndex = computed(() => statusFlow.findIndex((status) => status === order.value?.status))

const progressSteps = computed(() => {
  return statusFlow.map((status, index) => {
    const completed = order.value?.status === 'completed'
    const state = completed && index <= currentStatusIndex.value
      ? 'done'
      : index < currentStatusIndex.value
        ? 'done'
        : index === currentStatusIndex.value
          ? 'current'
          : 'todo'

    return {
      key: status,
      index,
      label: statusStepLabel[status] || PREORDER_STATUS_LABEL[status],
      sub: stepSubText(status),
      state,
    }
  })
})

const advanceOptions = computed(() => {
  if (!order.value) return []
  const from = order.value.status as PreorderStatus
  const all = Object.keys(PREORDER_STATUS_LABEL) as PreorderStatus[]
  return all
    .filter((to) => canTransition(from, to))
    .map((to) => ({ value: to, label: `→ ${PREORDER_STATUS_LABEL[to]}` }))
})

const editDisabled = computed(() => {
  if (!order.value) return true
  return isStockDeducted(order.value.status) || order.value.status === 'cancelled'
})

const primaryProductTitle = computed(() => {
  const items = order.value?.items || []
  if (items.length === 0) return `预售单 ${order.value?.orderNo || ''}`
  const firstName = productName(items[0])
  return items.length > 1 ? `${firstName} 等 ${items.length} 项` : firstName
})

const operatorName = computed(() => {
  return order.value?.cashier?.name || order.value?.payments?.[0]?.operator || '-'
})

const receiverInitial = computed(() => {
  const name = order.value?.receiverName || order.value?.customer?.name || '客'
  return String(name).trim().slice(0, 1)
})

const recentPayments = computed(() => (order.value?.payments || []).slice(0, 3))
const allocatedCount = computed(() => (order.value?.items || []).filter((item: any) => item.batch).length)
const pendingBatchCount = computed(() => Math.max(0, (order.value?.items || []).length - allocatedCount.value))

const reminderText = computed(() => {
  const stage = order.value?.reminderStage || 'none'
  const label = REMINDER_STAGE_LABEL[stage as keyof typeof REMINDER_STAGE_LABEL] || '暂无提醒'
  if (order.value?.daysUntil == null) return label
  const days = Number(order.value.daysUntil)
  if (days < 0) return `${label} · 已逾期 ${Math.abs(days)} 天`
  if (days === 0) return `${label} · 今日履约`
  return `${label} · 还剩 ${days} 天`
})

const load = async () => {
  const id = Number(route.params.id)
  if (!id) return
  order.value = await fetchOne(id)
}

const onAdvance = async ({ key }: { key: string }) => {
  const label = PREORDER_STATUS_LABEL[key as PreorderStatus]
  const willDeduct = key === 'in_production'
  Modal.confirm({
    title: `确认推进状态到"${label}"？`,
    content: willDeduct
      ? '进入"制作中"将按 FIFO 分配批次并扣减库存，操作不可撤销。'
      : key === 'cancelled' ? '取消后预售单将关闭。' : undefined,
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      await advance(order.value.id, key)
      message.success('状态已更新')
      await load()
    },
  })
}

const markMade = async () => {
  if (!order.value || order.value.isMade) return
  madeLoading.value = true
  try {
    await setMade(order.value.id, true)
    message.success('已标记为做好')
    await load()
  } finally {
    madeLoading.value = false
  }
}

const goEdit = () => router.push(`/preorders/${order.value.id}/edit`)
const goPrint = () => window.open(`/preorders/${order.value.id}/delivery-slip`, '_blank')

const productImage = (item: any) => item?.imageUrl || item?.product?.imageUrl || ''
const productName = (item: any) => item?.product?.name || `#${item?.productId || '-'}`
const productMeta = (item: any) => {
  const product = item?.product || {}
  return [
    item?.grade || product.grade,
    item?.color || product.color,
    product.specification,
  ].filter(Boolean).join(' · ')
}

const stepSubText = (status: string) => {
  if (!order.value) return '-'
  if (status === 'pending_confirm') return formatShortDateTime(order.value.createdAt)
  if (status === 'in_production') return order.value.isMade ? '已做好' : '待开始'
  if (status === 'ready_to_ship') return formatShortDateTime(order.value.deliveryTime)
  if (status === 'completed') return order.value.status === 'completed' ? '已完成' : '-'
  return '-'
}

const fulfillmentLabel = (type: string) => {
  const map: Record<string, string> = {
    delivery: '同城配送',
    pickup: '到店自提',
  }
  return map[type] || '同城配送'
}

const paymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    card: '刷卡',
    balance: '余额',
    other: '其他',
  }
  return map[method] || method || '收款'
}

const formatMoney = (n: any) => Number(n || 0).toFixed(2)
const formatQty = (n: any) => {
  const value = Number(n || 0)
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
const formatDateTime = (d: any) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-')
const formatShortDateTime = (d: any) => (d ? dayjs(d).format('MM-DD HH:mm') : '-')
const statusLabel = (s: string) => PREORDER_STATUS_LABEL[s as PreorderStatus] || s
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending_confirm: 'default',
    booked: 'green',
    scheduled: 'green',
    in_production: 'orange',
    ready_to_ship: 'gold',
    completed: 'green',
    cancelled: 'default',
  }
  return map[s] || 'default'
}
const reminderLabel = (s: string) => REMINDER_STAGE_LABEL[s as keyof typeof REMINDER_STAGE_LABEL] || ''
const reminderColor = (s: string) => REMINDER_STAGE_COLOR[s as keyof typeof REMINDER_STAGE_COLOR] || 'default'

onMounted(load)
</script>

<style scoped>
.preorder-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.title-block {
  min-width: 0;
}

.title-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 9px;
}

.title-block h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--ink-900);
  font-size: 25px;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: pretty;
}

.title-block h1 svg {
  color: var(--avo-700);
  font-size: 20px;
  flex: 0 0 auto;
}

.title-block p {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  margin: 8px 0 0;
  color: var(--ink-500);
  font-size: 13px;
}

.title-block p i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--avo-200);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.head-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.made-btn {
  min-width: 118px;
}

.progress-card {
  padding: 18px 20px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.section-title span,
.side-card :deep(.ant-card-head-title span) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.section-title svg,
.side-card :deep(.ant-card-head-title svg) {
  color: var(--avo-700);
}

.section-title button {
  border: 0;
  background: transparent;
  color: var(--avo-700);
  cursor: pointer;
  font-size: 13px;
}

.cancelled-state {
  padding: 24px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
  color: var(--ink-500);
  text-align: center;
  background: var(--paper-2);
}

.progress-steps {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.progress-step {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 7px;
  color: var(--ink-400);
  text-align: center;
}

.step-line {
  position: absolute;
  top: 17px;
  left: -50%;
  width: 100%;
  height: 2px;
  background: var(--line);
}

.progress-step:first-child .step-line {
  display: none;
}

.progress-step.done .step-line,
.progress-step.current .step-line {
  background: var(--avo-500);
}

.step-dot {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 2px solid var(--line);
  border-radius: 50%;
  background: var(--paper-3);
  color: var(--ink-400);
  font-weight: 800;
  transition: all 0.18s ease;
}

.progress-step.done .step-dot {
  border-color: var(--avo-500);
  background: var(--avo-500);
  color: #fffef7;
}

.progress-step.current .step-dot {
  border-color: var(--avo-500);
  color: var(--avo-800);
  box-shadow: 0 0 0 5px rgba(168, 185, 127, 0.18);
}

.progress-step b {
  color: var(--ink-700);
  font-size: 13px;
}

.progress-step small {
  min-height: 16px;
  color: var(--ink-400);
  font-size: 11px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(340px, 1fr);
  gap: 14px;
  align-items: start;
}

.main-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 260px;
}

.product-image {
  overflow: hidden;
  border-radius: 12px;
  object-fit: cover;
}

.product-image :deep(img) {
  object-fit: cover;
}

.image-placeholder {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px dashed var(--avo-200);
  border-radius: 12px;
  background: var(--avo-50);
  color: var(--avo-700);
  font-size: 13px;
  font-weight: 800;
}

.product-info {
  min-width: 0;
}

.product-info b {
  display: block;
  color: var(--ink-900);
  font-weight: 800;
}

.product-info span,
.product-info small {
  display: block;
  margin-top: 3px;
  color: var(--ink-500);
  font-size: 12px;
}

.qty,
.batch-no {
  color: var(--ink-700);
  font-weight: 700;
}

.amount {
  color: var(--avo-700);
  font-weight: 900;
}

.total-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--avo-50);
  gap: 12px;
}

.total-panel span,
.money-grid span,
.batch-summary span {
  display: block;
  color: var(--ink-500);
  font-size: 12px;
}

.total-panel b,
.money-grid b,
.batch-summary b {
  display: block;
  margin-top: 4px;
  color: var(--ink-900);
  font-size: 18px;
  font-weight: 900;
}

.total-panel .tail b,
.money-grid .debt b {
  color: var(--danger);
}

.note-box {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--paper-2);
  color: var(--ink-700);
}

.note-box svg {
  margin-top: 2px;
  color: var(--avo-700);
}

.note-box p,
.card-message p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
}

.card-message {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  background: var(--paper-3);
}

.card-message b {
  display: block;
  margin-bottom: 6px;
  color: var(--ink-800);
}

.side-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.receiver {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line-soft);
}

.avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--avo-200);
  color: var(--avo-800);
  font-weight: 900;
}

.receiver b {
  display: block;
  color: var(--ink-900);
}

.receiver span {
  display: block;
  margin-top: 3px;
  color: var(--ink-500);
  font-size: 12px;
}

.info-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: start;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line-soft);
}

.info-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.info-row span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-500);
  font-size: 13px;
}

.info-row span svg {
  color: var(--avo-600);
}

.info-row b {
  color: var(--ink-700);
  font-weight: 600;
  line-height: 1.55;
}

.money-grid,
.batch-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.batch-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.payment-list,
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-empty {
  padding: 18px 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
  background: var(--paper-2);
  color: var(--ink-400);
  font-size: 13px;
  text-align: center;
}

.payment-row,
.batch-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--line-soft);
  color: var(--ink-500);
  font-size: 12px;
}

.payment-row b,
.batch-list b {
  color: var(--ink-800);
  white-space: nowrap;
}

.batch-list span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-state {
  padding: 56px;
  color: var(--ink-400);
  text-align: center;
}

@media (max-width: 1180px) {
  .detail-head {
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions {
    justify-content: flex-start;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .progress-steps {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .progress-step {
    grid-template-columns: auto 1fr;
    justify-items: start;
    text-align: left;
  }

  .step-line {
    left: 16px;
    top: -14px;
    width: 2px;
    height: 28px;
  }

  .progress-step b,
  .progress-step small {
    grid-column: 2;
  }

  .progress-step b {
    grid-row: 1;
    align-self: end;
  }

  .progress-step small {
    grid-row: 2;
    align-self: start;
  }

  .total-panel,
  .money-grid {
    grid-template-columns: 1fr;
  }

  .head-actions > * {
    flex: 1 1 150px;
  }

  .info-row {
    grid-template-columns: 1fr;
  }
}
</style>
