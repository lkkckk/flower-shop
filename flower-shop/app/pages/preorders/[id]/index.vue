<template>
  <div v-if="order" class="wrap">
    <a-card class="page-card">
      <template #title>
        <div class="flex items-center gap-2">
          <span>预售单 {{ order.orderNo }}</span>
          <a-tag :color="statusColor(order.status)">{{ statusLabel(order.status) }}</a-tag>
          <a-tag v-if="order.reminderStage && order.reminderStage !== 'none'" :color="reminderColor(order.reminderStage)">
            {{ reminderLabel(order.reminderStage) }}
            <span v-if="order.daysUntil != null">
              （距履约 {{ order.daysUntil }} 天）
            </span>
          </a-tag>
        </div>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="goEdit" :disabled="editDisabled">编辑</a-button>
          <a-button @click="goPrint">打印配送单</a-button>
          <a-dropdown>
            <a-button type="primary">推进状态 <DownOutlined /></a-button>
            <template #overlay>
              <a-menu @click="onAdvance">
                <a-menu-item v-for="opt in advanceOptions" :key="opt.value">{{ opt.label }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </template>

      <a-descriptions :column="2" bordered size="small">
        <a-descriptions-item label="来源">{{ order.sourceChannel || '店内' }}</a-descriptions-item>
        <a-descriptions-item label="履约时间">{{ formatDateTime(order.deliveryTime) }}</a-descriptions-item>
        <a-descriptions-item label="下单客户">
          <span v-if="order.customer">{{ order.customer.name }}<span v-if="order.customer.phone"> · {{ order.customer.phone }}</span></span>
          <span v-else class="text-gray-400">散客</span>
        </a-descriptions-item>
        <a-descriptions-item label="收货人">{{ order.receiverName || '-' }} · {{ order.receiverPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="收货地址" :span="2">{{ order.deliveryAddress || '-' }}</a-descriptions-item>
        <a-descriptions-item label="贺卡内容" :span="2">{{ order.cardMessage || '-' }}</a-descriptions-item>
        <a-descriptions-item label="其他要求" :span="2">
          <span class="text-red-500">{{ order.notes || '-' }}</span>
        </a-descriptions-item>
      </a-descriptions>

      <a-divider orientation="left">商品明细</a-divider>
      <a-table :columns="itemColumns" :data-source="order.items" row-key="id" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'image'">
            <a-image
              v-if="record.imageUrl || record.product?.imageUrl"
              :src="record.imageUrl || record.product?.imageUrl"
              :width="60"
              :height="60"
              class="object-cover rounded"
            />
          </template>
          <template v-else-if="column.key === 'name'">
            {{ record.product?.name }}
            <div class="text-xs text-gray-400">
              <span v-if="record.grade">{{ record.grade }}</span>
              <span v-if="record.color"> · {{ record.color }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'batch'">
            <span v-if="record.batch">{{ record.batch.batchNo }}</span>
            <a-tag v-else color="orange">待分配</a-tag>
          </template>
          <template v-else-if="column.key === 'qty'">{{ Number(record.qty).toFixed(1) }} {{ record.unit }}</template>
          <template v-else-if="column.key === 'subtotal'">
            <span class="text-pink-600 font-bold">¥{{ Number(record.subtotal).toFixed(2) }}</span>
          </template>
        </template>
      </a-table>
      <div class="mt-3 text-right text-lg">
        合计：<span class="text-pink-600 font-bold">¥{{ Number(order.totalAmount).toFixed(2) }}</span>
      </div>
    </a-card>
  </div>
  <div v-else class="text-center text-gray-400 p-10">加载中...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { usePreorders } from '~/composables/usePreorders'
import { PREORDER_STATUS_LABEL, canTransition, isStockDeducted } from '../../../../shared/preorderStatus'
import { REMINDER_STAGE_LABEL, REMINDER_STAGE_COLOR } from '../../../../shared/preorderReminder'

useHead({ title: '预售单详情 - 花店管理系统' })

const route = useRoute()
const router = useRouter()
const { fetchOne, advance } = usePreorders()
const order = ref<any>(null)

const itemColumns = [
  { title: '图片', key: 'image', width: 80 },
  { title: '商品', key: 'name' },
  { title: '批次', key: 'batch', width: 140 },
  { title: '数量', key: 'qty', width: 120 },
  { title: '小计', key: 'subtotal', width: 120 },
]

const advanceOptions = computed(() => {
  if (!order.value) return []
  const from = order.value.status
  const all = Object.keys(PREORDER_STATUS_LABEL) as (keyof typeof PREORDER_STATUS_LABEL)[]
  return all
    .filter((to) => canTransition(from, to))
    .map((to) => ({ value: to, label: `→ ${PREORDER_STATUS_LABEL[to]}` }))
})

const editDisabled = computed(() => {
  if (!order.value) return true
  return isStockDeducted(order.value.status) || order.value.status === 'cancelled'
})

const load = async () => {
  const id = Number(route.params.id)
  if (!id) return
  order.value = await fetchOne(id)
}

const onAdvance = async ({ key }: { key: string }) => {
  const label = PREORDER_STATUS_LABEL[key as keyof typeof PREORDER_STATUS_LABEL]
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

const goEdit = () => router.push(`/preorders/${order.value.id}/edit`)
const goPrint = () => window.open(`/preorders/${order.value.id}/delivery-slip`, '_blank')

const formatDateTime = (d: any) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-')
const statusLabel = (s: string) => PREORDER_STATUS_LABEL[s as keyof typeof PREORDER_STATUS_LABEL] || s
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending_confirm: 'default', booked: 'blue', scheduled: 'cyan',
    in_production: 'purple', ready_to_ship: 'orange', completed: 'green', cancelled: 'default',
  }
  return map[s] || 'default'
}
const reminderLabel = (s: string) => REMINDER_STAGE_LABEL[s as keyof typeof REMINDER_STAGE_LABEL] || ''
const reminderColor = (s: string) => REMINDER_STAGE_COLOR[s as keyof typeof REMINDER_STAGE_COLOR] || 'default'

onMounted(load)
</script>

<style scoped>
.wrap { max-width: 1100px; margin: 0 auto; }
.page-card { border-radius: 8px; }
</style>
