<template>
  <a-form layout="vertical" :model="form">
    <a-row :gutter="16">
      <a-col :span="12">
        <a-form-item label="下单客户" extra="可选择已有客户，或直接填写收货信息">
          <a-select
            v-model:value="form.customerId"
            placeholder="搜索客户姓名/电话"
            show-search
            allow-clear
            :filter-option="false"
            :options="customerOptions"
            @search="onCustomerSearch"
            @change="onCustomerChange"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="订单来源">
          <a-input v-model:value="form.sourceChannel" placeholder="如：美团闪购#5、抖音、店内" />
        </a-form-item>
      </a-col>
    </a-row>

    <a-divider orientation="left" style="font-size: 14px">收货信息</a-divider>
    <a-row :gutter="16">
      <a-col :span="12">
        <a-form-item label="收货人姓名" required>
          <a-input v-model:value="form.receiverName" />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="收货人电话" required>
          <a-input v-model:value="form.receiverPhone" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item label="收货地址" required>
      <a-textarea v-model:value="form.deliveryAddress" :rows="2" />
    </a-form-item>

    <a-divider orientation="left" style="font-size: 14px">履约安排</a-divider>
    <a-row :gutter="16">
      <a-col :span="12">
        <a-form-item label="履约日期/时间" required>
          <a-date-picker
            v-model:value="deliveryTime"
            show-time
            format="YYYY-MM-DD HH:mm"
            class="w-full"
            placeholder="选择履约日期和时间"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item v-if="daysHint" :label="' '" :colon="false">
          <a-tag :color="daysHint.color">{{ daysHint.text }}</a-tag>
        </a-form-item>
      </a-col>
    </a-row>

    <a-divider orientation="left" style="font-size: 14px">商品明细</a-divider>
    <a-table
      :columns="itemColumns"
      :data-source="form.items"
      :pagination="false"
      row-key="_key"
      size="small"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'image'">
          <a-image
            v-if="record.imageUrl"
            :src="record.imageUrl"
            :width="50"
            :height="50"
            :preview="false"
            class="object-cover rounded"
          />
        </template>
        <template v-else-if="column.key === 'name'">
          <div class="font-medium">{{ record.productName }}</div>
          <div class="text-xs text-gray-400">
            <span v-if="record.grade">{{ record.grade }}</span>
            <span v-if="record.color"> · {{ record.color }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number v-model:value="record.qty" :min="0.1" :step="0.1" @change="() => recomputeSubtotal(record)" />
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number v-model:value="record.unitPrice" :min="0" :step="0.01" @change="() => recomputeSubtotal(record)" />
        </template>
        <template v-else-if="column.key === 'subtotal'">
          <span class="text-pink-600 font-bold">¥{{ Number(record.subtotal || 0).toFixed(2) }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" danger size="small" @click="removeItem(index)">移除</a-button>
        </template>
      </template>
    </a-table>
    <div class="mt-2 flex justify-between items-center">
      <a-button type="dashed" @click="pickerOpen = true">+ 添加商品</a-button>
      <div class="text-lg">
        合计：<span class="text-pink-600 font-bold">¥{{ totalAmount.toFixed(2) }}</span>
      </div>
    </div>

    <a-divider orientation="left" style="font-size: 14px">备注</a-divider>
    <a-form-item label="贺卡内容">
      <a-textarea v-model:value="form.cardMessage" :rows="2" placeholder="如：生日快乐！" />
    </a-form-item>
    <a-form-item label="其他要求 / 备注">
      <a-textarea v-model:value="form.notes" :rows="2" placeholder="如：一定送到手上、预订人电话另告知等" />
    </a-form-item>

    <div class="flex justify-end gap-2 mt-4">
      <a-button @click="$emit('cancel')">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="onSubmit">{{ submitText }}</a-button>
    </div>
  </a-form>

  <PreorderProductPicker v-model:open="pickerOpen" @pick="onPickProduct" />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import PreorderProductPicker from './PreorderProductPicker.vue'
import { useCustomers } from '~/composables/useCustomers'
import { computeReminderStage, REMINDER_STAGE_LABEL, REMINDER_STAGE_COLOR, daysUntil } from '../../../shared/preorderReminder'

interface Props {
  initial?: any
  submitText?: string
  submitting?: boolean
}
const props = withDefaults(defineProps<Props>(), { submitText: '保存', submitting: false })
const emit = defineEmits<{
  (e: 'submit', payload: any): void
  (e: 'cancel'): void
}>()

const { searchCustomers } = useCustomers()

const form = reactive<any>({
  customerId: null,
  sourceChannel: '',
  receiverName: '',
  receiverPhone: '',
  deliveryAddress: '',
  cardMessage: '',
  notes: '',
  items: [] as any[],
})
const deliveryTime = ref<Dayjs | null>(null)
const pickerOpen = ref(false)
const customerOptions = ref<{ value: number; label: string }[]>([])

const itemColumns = [
  { title: '图片', key: 'image', width: 70 },
  { title: '商品', key: 'name' },
  { title: '数量', key: 'qty', width: 110 },
  { title: '单价', key: 'unitPrice', width: 110 },
  { title: '小计', key: 'subtotal', width: 110 },
  { title: '操作', key: 'action', width: 80 },
]

const totalAmount = computed(() =>
  form.items.reduce((s: number, it: any) => s + Number(it.subtotal || 0), 0),
)

const daysHint = computed(() => {
  if (!deliveryTime.value) return null
  const d = deliveryTime.value.toDate()
  const n = daysUntil(d)
  const stage = computeReminderStage(d)
  if (n === null) return null
  const label = n < 0 ? `已逾期 ${Math.abs(n)} 天` : n === 0 ? '今日履约' : `距履约 ${n} 天`
  return { text: `${label}${REMINDER_STAGE_LABEL[stage] ? ' · ' + REMINDER_STAGE_LABEL[stage] : ''}`, color: REMINDER_STAGE_COLOR[stage] || 'blue' }
})

const recomputeSubtotal = (row: any) => {
  row.subtotal = Number(row.qty || 0) * Number(row.unitPrice || 0)
}

const onPickProduct = (p: any) => {
  form.items.push({
    _key: `${p.id}-${Date.now()}`,
    productId: p.id,
    productName: p.name,
    grade: p.grade,
    color: p.color,
    unit: p.baseUnit || 'default',
    baseQty: 1,
    qty: 1,
    unitPrice: Number(p.defaultPrice) || 0,
    subtotal: Number(p.defaultPrice) || 0,
    imageUrl: p.imageUrl || null,
  })
}

const removeItem = (idx: number) => form.items.splice(idx, 1)

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

const onCustomerChange = async (id: number | null) => {
  if (!id) return
  try {
    const res = await $fetch(`/api/customers/${id}`) as any
    const c = res.data
    if (c && !form.receiverName) form.receiverName = c.name
    if (c && !form.receiverPhone) form.receiverPhone = c.phone || ''
    if (c && !form.deliveryAddress) form.deliveryAddress = c.address || ''
  } catch {}
}

const onSubmit = () => {
  if (!form.receiverName || !form.receiverPhone) {
    message.error('请填写收货人姓名和电话')
    return
  }
  if (!form.deliveryAddress) {
    message.error('请填写收货地址')
    return
  }
  if (!deliveryTime.value) {
    message.error('请选择履约日期')
    return
  }
  if (form.items.length === 0) {
    message.error('请至少添加一个商品')
    return
  }
  emit('submit', {
    customerId: form.customerId || null,
    sourceChannel: form.sourceChannel || null,
    receiverName: form.receiverName,
    receiverPhone: form.receiverPhone,
    deliveryAddress: form.deliveryAddress,
    deliveryTime: deliveryTime.value.toISOString(),
    cardMessage: form.cardMessage || null,
    notes: form.notes || null,
    items: form.items.map((it: any) => ({
      productId: it.productId,
      unit: it.unit,
      qty: Number(it.qty),
      baseQty: Number(it.qty),
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      imageUrl: it.imageUrl,
      grade: it.grade,
      color: it.color,
    })),
  })
}

watch(
  () => props.initial,
  (v) => {
    if (!v) return
    form.customerId = v.customerId || null
    form.sourceChannel = v.sourceChannel || ''
    form.receiverName = v.receiverName || ''
    form.receiverPhone = v.receiverPhone || ''
    form.deliveryAddress = v.deliveryAddress || ''
    form.cardMessage = v.cardMessage || ''
    form.notes = v.notes || ''
    deliveryTime.value = v.deliveryTime ? dayjs(v.deliveryTime) : null
    form.items = (v.items || []).map((it: any, idx: number) => ({
      _key: `${it.productId}-${idx}`,
      productId: it.productId,
      productName: it.product?.name || it.productName,
      grade: it.grade,
      color: it.color,
      unit: it.unit,
      baseQty: it.baseQty,
      qty: it.qty,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
      imageUrl: it.imageUrl || it.product?.imageUrl || null,
    }))
    if (v.customerId) onCustomerSearch('')
  },
  { immediate: true },
)

onMounted(() => { onCustomerSearch('') })
</script>
