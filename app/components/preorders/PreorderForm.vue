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
      <a-col :span="8">
        <a-form-item label="履约方式" required>
          <a-radio-group v-model:value="form.fulfillmentType" button-style="solid">
            <a-radio-button value="delivery">配送</a-radio-button>
            <a-radio-button value="pickup">自提</a-radio-button>
          </a-radio-group>
        </a-form-item>
      </a-col>
      <a-col :span="8">
        <a-form-item label="收货/取花人姓名" required>
          <a-input v-model:value="form.receiverName" />
        </a-form-item>
      </a-col>
      <a-col :span="8">
        <a-form-item label="联系电话" required>
          <a-input v-model:value="form.receiverPhone" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item :label="form.fulfillmentType === 'pickup' ? '自提备注/门店信息' : '配送地址'" :required="form.fulfillmentType === 'delivery'">
      <a-textarea
        v-model:value="form.deliveryAddress"
        :rows="2"
        :placeholder="form.fulfillmentType === 'pickup' ? '如：到店自提、联系人备注等' : '请输入配送地址'"
      />
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

    <a-divider orientation="left" style="font-size: 14px">价格模式</a-divider>
    <div class="mb-4 rounded-lg border border-pink-100 bg-pink-50 p-3">
      <a-radio-group v-model:value="form.priceMode" button-style="solid" class="flex flex-wrap gap-1" @change="applyPriceModeToAllItems">
        <a-radio-button value="retail">零售价</a-radio-button>
        <a-radio-button value="vip">VIP价</a-radio-button>
        <a-radio-button value="wholesale">批发价</a-radio-button>
        <a-radio-button value="discount">折扣价</a-radio-button>
        <a-radio-button value="promotion">满减活动价</a-radio-button>
        <a-radio-button value="custom">自定义价</a-radio-button>
      </a-radio-group>

      <div v-if="form.priceMode === 'discount'" class="mt-3 flex items-center gap-2">
        <span class="text-sm text-gray-600">折扣率：</span>
        <a-input-number
          v-model:value="form.discountRate"
          :min="1"
          :max="100"
          :step="1"
          :precision="0"
          class="w-28"
          @change="applyPriceModeToAllItems"
        />
        <span class="text-sm text-gray-500">%（例：85 表示八五折）</span>
      </div>

      <div v-if="form.priceMode === 'promotion'" class="mt-3">
        <a-select
          v-model:value="form.promotionId"
          placeholder="请选择满减活动"
          class="w-full"
          :loading="loadingPromotions"
          allow-clear
        >
          <a-select-option
            v-for="p in promotions"
            :key="p.id"
            :value="p.id"
            :disabled="subtotalBeforeReduction < p.threshold"
          >
            {{ p.name }}（满 {{ p.threshold }} 减 {{ p.reduction }}）
            <span v-if="subtotalBeforeReduction < p.threshold" class="text-gray-400 text-xs">
              — 还差 ¥{{ (p.threshold - subtotalBeforeReduction).toFixed(2) }}
            </span>
          </a-select-option>
        </a-select>
      </div>

      <div v-if="form.priceMode === 'custom'" class="mt-3 text-sm text-gray-500">
        自定义价模式下，可直接修改每行单价。
      </div>
    </div>

    <a-divider orientation="left" style="font-size: 14px">商品明细</a-divider>
    <a-table
      :columns="itemColumns"
      :data-source="form.items"
      :pagination="false"
      row-key="_key"
      size="small"
      :scroll="{ x: 920 }"
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
        <template v-else-if="column.key === 'unit'">
          <a-select v-model:value="record.unit" class="w-24" @change="() => onUnitChange(record)">
            <a-select-option v-for="u in record.unitOptions" :key="u.unit" :value="u.unit">
              {{ u.unit }}
            </a-select-option>
          </a-select>
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number v-model:value="record.qty" :min="0.1" :step="0.1" class="w-24" @change="() => recomputeSubtotal(record)" />
        </template>
        <template v-else-if="column.key === 'priceSource'">
          <a-select v-model:value="record.priceSource" class="w-28" @change="() => applyPriceModeToRow(record)">
            <a-select-option value="retail">零售价</a-select-option>
            <a-select-option value="vip">VIP价</a-select-option>
            <a-select-option value="wholesale">批发价</a-select-option>
            <a-select-option value="custom">自定义</a-select-option>
          </a-select>
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number v-model:value="record.unitPrice" :min="0" :step="0.01" class="w-28" @change="() => onManualPriceChange(record)" />
        </template>
        <template v-else-if="column.key === 'subtotal'">
          <span class="text-pink-600 font-bold">¥{{ Number(record.subtotal || 0).toFixed(2) }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" danger size="small" @click="removeItem(index)">移除</a-button>
        </template>
      </template>
    </a-table>
    <div class="mt-2 flex justify-between items-start gap-4">
      <a-button type="dashed" @click="pickerOpen = true">+ 添加商品</a-button>
      <div class="text-right text-sm leading-7">
        <div>商品小计：<span class="font-bold">¥{{ subtotalBeforeReduction.toFixed(2) }}</span></div>
        <div v-if="promotionReduction > 0" class="text-gray-500">满减优惠：-¥{{ promotionReduction.toFixed(2) }}</div>
        <div class="text-lg">合计：<span class="text-pink-600 font-bold">¥{{ totalAmount.toFixed(2) }}</span></div>
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

interface PromotionRow {
  id: number
  name: string
  threshold: number
  reduction: number
  status: string
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
  fulfillmentType: 'delivery',
  receiverName: '',
  receiverPhone: '',
  deliveryAddress: '',
  priceMode: 'retail',
  discountRate: 90,
  promotionId: null,
  cardMessage: '',
  notes: '',
  items: [] as any[],
})
const deliveryTime = ref<Dayjs | null>(null)
const pickerOpen = ref(false)
const customerOptions = ref<{ value: number; label: string }[]>([])
const promotions = ref<PromotionRow[]>([])
const loadingPromotions = ref(false)

const itemColumns = [
  { title: '图片', key: 'image', width: 70 },
  { title: '商品', key: 'name', width: 170 },
  { title: '销售单位', key: 'unit', width: 120 },
  { title: '数量', key: 'qty', width: 110 },
  { title: '价格类型', key: 'priceSource', width: 130 },
  { title: '单价', key: 'unitPrice', width: 130 },
  { title: '小计', key: 'subtotal', width: 120 },
  { title: '操作', key: 'action', width: 80 },
]

const subtotalBeforeReduction = computed(() =>
  form.items.reduce((s: number, it: any) => s + Number(it.subtotal || 0), 0),
)

const selectedPromotion = computed(() =>
  promotions.value.find((p) => p.id === form.promotionId) || null,
)

const promotionReduction = computed(() => {
  if (form.priceMode !== 'promotion' || !selectedPromotion.value) return 0
  return subtotalBeforeReduction.value >= selectedPromotion.value.threshold
    ? Number(selectedPromotion.value.reduction || 0)
    : 0
})

const totalAmount = computed(() =>
  Math.max(0, Math.round((subtotalBeforeReduction.value - promotionReduction.value) * 100) / 100),
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

const roundMoney = (n: number) => Math.max(0, Math.round(n * 100) / 100)

const unitToBaseQty = (row: any) => {
  const hit = row.unitOptions?.find((u: any) => u.unit === row.unit)
  return Number(hit?.toBaseQty || 1)
}

const getBasePrice = (row: any, source = row.priceSource) => {
  if (source === 'vip') return Number(row.vipPrice || row.defaultPrice || 0)
  if (source === 'wholesale') return Number(row.wholesalePrice || row.defaultPrice || 0)
  return Number(row.defaultPrice || 0)
}

const getModePriceSource = () => {
  if (form.priceMode === 'vip') return 'vip'
  if (form.priceMode === 'wholesale') return 'wholesale'
  return 'retail'
}

const recomputeSubtotal = (row: any) => {
  row.baseQty = roundMoney(Number(row.qty || 0) * unitToBaseQty(row))
  row.subtotal = roundMoney(Number(row.qty || 0) * Number(row.unitPrice || 0))
}

const applyPriceModeToRow = (row: any) => {
  if (row.priceSource === 'custom') {
    recomputeSubtotal(row)
    return
  }
  const base = getBasePrice(row, row.priceSource)
  let unitPrice = base * unitToBaseQty(row)
  if (form.priceMode === 'discount') {
    unitPrice = unitPrice * (Math.max(1, Math.min(100, Number(form.discountRate || 100))) / 100)
  }
  row.unitPrice = roundMoney(unitPrice)
  recomputeSubtotal(row)
}

const applyPriceModeToAllItems = () => {
  for (const row of form.items) {
    if (form.priceMode === 'custom') {
      row.priceSource = 'custom'
    } else {
      row.priceSource = getModePriceSource()
    }
    applyPriceModeToRow(row)
  }
}

const onUnitChange = (row: any) => {
  applyPriceModeToRow(row)
}

const onManualPriceChange = (row: any) => {
  row.priceSource = 'custom'
  recomputeSubtotal(row)
}

const buildUnitOptions = (product: any) => {
  const baseUnit = product.baseUnit || 'default'
  const options = [{ unit: baseUnit, toBaseQty: 1 }]
  for (const u of product.unitConversions || []) {
    if (!options.some((it) => it.unit === u.fromUnit)) {
      options.push({ unit: u.fromUnit, toBaseQty: Number(u.toBaseQty || 1) })
    }
  }
  return options
}

const onPickProduct = (p: any) => {
  const unitOptions = buildUnitOptions(p)
  const priceSource = form.priceMode === 'custom' ? 'custom' : getModePriceSource()
  const row = {
    _key: `${p.id}-${Date.now()}`,
    productId: p.id,
    productName: p.name,
    grade: p.grade,
    color: p.color,
    unitOptions,
    unit: p.baseUnit || 'default',
    baseQty: 1,
    qty: 1,
    defaultPrice: Number(p.defaultPrice) || 0,
    vipPrice: Number(p.vipPrice || 0) || null,
    wholesalePrice: Number(p.wholesalePrice || 0) || null,
    priceSource,
    unitPrice: 0,
    subtotal: 0,
    imageUrl: p.imageUrl || null,
  }
  row.unitPrice = roundMoney(getBasePrice(row, priceSource))
  applyPriceModeToRow(row)
  form.items.push(row)
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

const loadPromotions = async () => {
  loadingPromotions.value = true
  try {
    const { data }: any = await $fetch('/api/promotions', { query: { status: 'active' } })
    promotions.value = data?.list || []
  } catch {
    promotions.value = []
  } finally {
    loadingPromotions.value = false
  }
}

const onSubmit = () => {
  if (!form.receiverName || !form.receiverPhone) {
    message.error('请填写收货/取花人姓名和电话')
    return
  }
  if (form.fulfillmentType === 'delivery' && !form.deliveryAddress) {
    message.error('请填写配送地址')
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
  if (form.priceMode === 'promotion') {
    if (!form.promotionId) {
      message.error('请选择满减活动，或切换为其他价格模式')
      return
    }
    if (promotionReduction.value <= 0) {
      message.error('当前商品小计未达到满减门槛')
      return
    }
  }
  emit('submit', {
    customerId: form.customerId || null,
    sourceChannel: form.sourceChannel || null,
    fulfillmentType: form.fulfillmentType,
    receiverName: form.receiverName,
    receiverPhone: form.receiverPhone,
    deliveryAddress: form.deliveryAddress || null,
    deliveryTime: deliveryTime.value.toISOString(),
    priceMode: form.priceMode,
    discountRate: form.priceMode === 'discount' ? Number(form.discountRate) : null,
    promotionId: form.priceMode === 'promotion' ? form.promotionId : null,
    totalAmount: totalAmount.value,
    cardMessage: form.cardMessage || null,
    notes: form.notes || null,
    items: form.items.map((it: any) => ({
      productId: it.productId,
      unit: it.unit,
      qty: Number(it.qty),
      baseQty: Number(it.baseQty),
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      imageUrl: it.imageUrl,
      grade: it.grade,
      color: it.color,
      notes: it.priceSource === 'custom' ? '自定义价' : null,
    })),
  })
}

watch(
  () => props.initial,
  (v) => {
    if (!v) return
    form.customerId = v.customerId || null
    form.sourceChannel = v.sourceChannel || ''
    form.fulfillmentType = v.fulfillmentType || 'delivery'
    form.receiverName = v.receiverName || ''
    form.receiverPhone = v.receiverPhone || ''
    form.deliveryAddress = v.deliveryAddress || ''
    form.priceMode = v.priceMode || 'retail'
    form.discountRate = v.discountRate || 90
    form.promotionId = v.promotionId || null
    form.cardMessage = v.cardMessage || ''
    form.notes = v.notes || ''
    deliveryTime.value = v.deliveryTime ? dayjs(v.deliveryTime) : null
    form.items = (v.items || []).map((it: any, idx: number) => {
      const product = it.product || {}
      const unitOptions = buildUnitOptions({ ...product, baseUnit: product.baseUnit || it.unit })
      return {
        _key: `${it.productId}-${idx}`,
        productId: it.productId,
        productName: product.name || it.productName,
        grade: it.grade,
        color: it.color,
        unitOptions,
        unit: it.unit,
        baseQty: it.baseQty,
        qty: it.qty,
        defaultPrice: Number(product.defaultPrice || it.originalPrice || it.unitPrice || 0),
        vipPrice: Number(product.vipPrice || 0) || null,
        wholesalePrice: Number(product.wholesalePrice || 0) || null,
        priceSource: 'custom',
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
        imageUrl: it.imageUrl || product.imageUrl || null,
      }
    })
    if (v.customerId) onCustomerSearch('')
  },
  { immediate: true },
)

onMounted(() => {
  onCustomerSearch('')
  loadPromotions()
})
</script>
