<template>
  <a-card title="收款与售后" class="mt-4" :loading="busy">
    <template v-if="order">
      <div class="mvp-metrics">
        <div>应付<strong>¥{{ fmt(order.totalAmount) }}</strong></div>
        <div>已收<strong>¥{{ fmt(order.paidAmount) }}</strong></div>
        <div>待收<strong>¥{{ fmt(order.owedAmount) }}</strong></div>
        <div>已退<strong>¥{{ fmt(order.refundedAmount) }}</strong></div>
      </div>
      <a-tabs>
        <a-tab-pane key="collect" tab="收款流水">
          <a-form v-if="Number(order.owedAmount) > 0 && order.fulfillmentStatus !== 'cancelled'" layout="vertical" @finish="collect">
            <div class="mvp-form-grid">
              <a-form-item label="本次收款金额"><a-input-number v-model:value="payment.amount" :min="0.01" :max="Number(order.owedAmount)" :precision="2" class="w-full" /></a-form-item>
              <a-form-item label="收款方式"><a-select v-model:value="payment.paymentMethod" :options="methods" /></a-form-item>
            </div>
            <a-form-item label="收款备注"><a-input v-model:value="payment.notes" /></a-form-item>
            <a-button html-type="submit" type="primary" :disabled="busy">确认收款</a-button>
          </a-form>
          <a-list :data-source="order.paymentLogs || []" class="mt-3">
            <template #renderItem="{ item }"><a-list-item>{{ date(item.createdAt) }} · {{ methodLabel(item.paymentMethod) }} · {{ item.type === 'refund' ? '退款' : '收款' }} ¥{{ fmt(item.amount) }} · {{ item.notes }}</a-list-item></template>
          </a-list>
        </a-tab-pane>
        <a-tab-pane key="returns" tab="作废 / 退货退款">
          <a-alert message="收银员提交申请，店员或管理员审批。退款按原付款方式记账；微信、支付宝须先完成外部退款。" type="info" class="mb-3" />
          <a-form v-if="order.fulfillmentStatus !== 'cancelled'" layout="vertical" @finish="submitAdjustment">
            <a-form-item label="操作类型"><a-radio-group v-model:value="adjustment.type"><a-radio-button :disabled="order.orderType==='preorder' && ['pending','confirmed'].includes(order.fulfillmentStatus)" value="return">部分退货退款</a-radio-button><a-radio-button value="void">整单作废</a-radio-button></a-radio-group></a-form-item>
            <div v-for="line in lines" :key="line.itemId" class="mvp-return-line">
              <span>{{ line.name }}（最多 {{ line.max }} {{ line.unit }}）</span>
              <a-input-number v-model:value="line.qty" :min="0" :max="line.max" :precision="3" :disabled="adjustment.type === 'void'" />
              <a-select v-model:value="line.disposition" :options="[{value:'restock',label:'重新入库'},{value:'scrap',label:'直接报损'}]" />
            </div>
            <a-form-item label="作废 / 退货原因（必填）"><a-textarea v-model:value="adjustment.reason" /></a-form-item>
            <a-button html-type="submit" :disabled="busy">提交审批</a-button>
          </a-form>
          <a-list :data-source="order.adjustments || []" class="mt-4">
            <template #renderItem="{ item }"><a-list-item><div class="w-full">
              <p>#{{ item.id }} · {{ statusLabel(item.status) }} · ¥{{ fmt(item.amount) }} · {{ item.reason }}</p>
              <div v-for="line in item.lines" :key="line.itemId" class="mvp-return-line"><span>{{ lines.find(l=>l.itemId===line.itemId)?.name || `明细 #${line.itemId}` }} · {{line.qty}} · ¥{{fmt(line.amount)}}</span><a-select v-model:value="line.disposition" :disabled="isCashier || item.status!=='pending'" :options="[{value:'restock',label:'重新入库'},{value:'scrap',label:'直接报损'}]" /></div>
              <div v-if="item.status === 'pending' && !isCashier" class="mvp-return-line">
                <a-input v-model:value="references[item.id]" placeholder="外部退款凭证 / 流水号" />
                <a-button type="primary" :disabled="busy" @click="approve(item.id, 'approve')">批准并执行</a-button>
                <a-button :disabled="busy" @click="approve(item.id, 'reject')">拒绝</a-button>
              </div>
            </div></a-list-item></template>
          </a-list>
        </a-tab-pane>
      </a-tabs>
    </template>
  </a-card>
</template>
<script setup lang="ts">
import { amountString, decimal } from '~~/shared/money'
const props = defineProps<{ orderId: number }>()
const emit = defineEmits(['updated'])
const { request, busy } = useBusiness()
const { isCashier } = useAuth()
const order = ref<any>(null)
const lines = ref<any[]>([])
const references = reactive<Record<number, string>>({})
const payment = reactive({ amount: 0, paymentMethod: 'wechat', notes: '' })
const adjustment = reactive({ type: 'return', reason: '' })
const methods = [{ value: 'wechat', label: '微信' }, { value: 'alipay', label: '支付宝' }, { value: 'cash', label: '现金' }, { value: 'balance', label: '客户预存' }]
const methodLabel = (v: string) => methods.find(m => m.value === v)?.label || v
const statusLabel = (v: string) => ({ pending: '待审批', approved: '已执行', rejected: '已拒绝' }[v] || v)
const fmt = (v: any) => amountString(v || 0)
const date = (v: string) => new Date(v).toLocaleString('zh-CN')
async function load() {
  if (!props.orderId) return
  order.value = await request(`/api/orders/${props.orderId}`)
  payment.amount = Number(order.value.owedAmount)
  if(order.value.orderType==='preorder'&&['pending','confirmed'].includes(order.value.fulfillmentStatus))adjustment.type='void'
  lines.value = order.value.items.map((i: any) => ({ itemId: i.id, name: i.product?.name || `商品 #${i.productId}`, unit: i.unit, qty: 0, max: decimal(i.qty).minus(i.returnedQty || 0).toNumber(), disposition: 'restock' }))
}
async function collect() { await request(`/api/orders/${props.orderId}/payments`, 'POST', payment); await load(); emit('updated') }
async function submitAdjustment() {
  const selected = lines.value.filter(l => adjustment.type === 'void' ? l.max > 0 : l.qty > 0).map(l => ({ itemId: l.itemId, qty: adjustment.type === 'void' ? l.max : l.qty, disposition: l.disposition }))
  // Send explicit dispositions for every line, including full void.
  await request(`/api/orders/${props.orderId}/adjustments`, 'POST', { ...adjustment, lines: selected, disposition: selected[0]?.disposition })
  await load(); emit('updated')
}
async function approve(id: number, decision: string) { await request(`/api/orders/${props.orderId}/adjustments/${id}/approve`, 'POST', { decision, externalReference: references[id], refundMethod:'original',lines:order.value.adjustments.find((a:any)=>a.id===id).lines }); await load(); emit('updated') }
watch(() => props.orderId, load, { immediate: true })
</script>
