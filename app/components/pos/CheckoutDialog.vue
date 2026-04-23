<template>
  <a-modal
    :open="visible"
    title="结账付款"
    @cancel="$emit('update:visible', false)"
    :footer="null"
    width="640px"
    destroyOnClose
  >
    <div v-if="cart" class="p-4">
      <div class="text-center mb-6 mt-2">
        <div class="text-gray-500 mb-2 font-medium">应收金额</div>
        <div class="text-5xl font-bold text-pink-600 font-display tracking-tight">¥ {{ previewTotal.toFixed(2) }}</div>
        <div v-if="reduction > 0" class="text-sm text-gray-500 mt-1">
          原价 ¥{{ subtotal.toFixed(2) }} 已减免 ¥{{ reduction.toFixed(2) }}
        </div>
        <div v-else-if="priceMode === 'discount' && discountRate < 100" class="text-sm text-gray-500 mt-1">
          已按 {{ discountRate }}% 折扣
        </div>
      </div>

      <!-- 价格模式选择 -->
      <div class="mb-5 bg-pink-50 p-3 rounded-lg border border-pink-100">
        <div class="text-gray-600 mb-2 font-medium text-sm">价格模式</div>
        <a-radio-group v-model:value="priceMode" button-style="solid" class="w-full flex flex-wrap gap-1">
          <a-radio-button value="retail" class="flex-1 text-center">零售价</a-radio-button>
          <a-radio-button value="discount" class="flex-1 text-center">折扣价</a-radio-button>
          <a-radio-button value="promotion" class="flex-1 text-center">满减活动</a-radio-button>
        </a-radio-group>

        <div v-if="priceMode === 'discount'" class="mt-3 flex items-center gap-2">
          <span class="text-sm text-gray-600">折扣率：</span>
          <a-input-number
            v-model:value="discountRate"
            :min="1"
            :max="100"
            :step="1"
            :precision="0"
            class="w-28"
          />
          <span class="text-sm text-gray-500">%（例：85 表示八五折）</span>
        </div>

        <div v-if="priceMode === 'promotion'" class="mt-3">
          <a-select
            v-model:value="promotionId"
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
      </div>

      <div class="mb-5">
        <div class="text-gray-600 mb-2 font-medium text-sm">支付方式</div>
        <a-radio-group v-model:value="paymentMethod" button-style="solid" class="w-full flex flex-wrap gap-1">
          <a-radio-button value="wechat" class="flex-1 text-center justify-center flex items-center h-11">微信</a-radio-button>
          <a-radio-button value="alipay" class="flex-1 text-center justify-center flex items-center h-11">支付宝</a-radio-button>
          <a-radio-button value="cash" class="flex-1 text-center justify-center flex items-center h-11">现金</a-radio-button>
          <a-radio-button value="credit" class="flex-1 text-center justify-center flex items-center h-11">记账</a-radio-button>
          <a-radio-button
            value="balance"
            class="flex-1 text-center justify-center flex items-center h-11"
            :disabled="!cart.customerId || (cart.customerBalance ?? 0) <= 0"
          >
            扣预存
            <span v-if="cart.customerId && (cart.customerBalance ?? 0) > 0" class="text-xs ml-1 opacity-75">
              (¥{{ (cart.customerBalance ?? 0).toFixed(2) }})
            </span>
          </a-radio-button>
        </a-radio-group>
        <div v-if="paymentMethod === 'credit' && !cart.customerId" class="text-red-500 mt-2 text-sm text-center bg-red-50 p-2 rounded">
          ⚠️ 必须在左侧选择具体客户后才能使用"记账"功能
        </div>
        <div v-if="paymentMethod === 'balance' && !cart.customerId" class="text-red-500 mt-2 text-sm text-center bg-red-50 p-2 rounded">
          ⚠️ 必须在左侧选择具体客户后才能使用"扣预存"功能
        </div>
        <div v-if="paymentMethod === 'balance' && cart.customerId && (cart.customerBalance ?? 0) <= 0" class="text-orange-500 mt-2 text-sm text-center bg-orange-50 p-2 rounded">
          ⚠️ 该客户预存余额不足，无法使用扣预存
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <span class="text-lg text-gray-700">实收金额</span>
          <a-input-number
            v-model:value="paidAmount"
            :min="0"
            :disabled="paymentMethod === 'credit' || paymentMethod === 'balance'"
            class="text-right text-[28px] w-48 font-bold font-display tracking-tight text-gray-800"
            :controls="false"
            autofocus
            @pressEnter="handleConfirm"
          />
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-gray-200 border-dashed mt-4">
          <span class="text-gray-500 font-medium">找零</span>
          <span class="text-2xl font-bold text-sage-600 font-display tracking-tight">¥ {{ changeAmount.toFixed(2) }}</span>
        </div>
      </div>

      <div class="flex gap-4">
        <a-button size="large" class="flex-1 h-14 rounded-xl text-lg font-bold text-gray-600" @click="$emit('update:visible', false)">返回修改</a-button>
        <a-button
          type="primary"
          size="large"
          class="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 border-none h-14 text-xl font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 transition-transform"
          @click="handleConfirm"
          :loading="loading"
          :disabled="confirmDisabled"
        >
          确认收款 (Enter)
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useCartStore } from '~/stores/cart'
import { computeOrder, type PriceMode } from '~~/shared/priceMode'
import { useActiveCashier } from '~/composables/useActiveCashier'

interface PromotionRow {
  id: number
  name: string
  threshold: number
  reduction: number
  status: string
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'success'])

const cartStore = useCartStore()
const { currentCashier } = useActiveCashier()

const loading = ref(false)
const paymentMethod = ref<'cash' | 'wechat' | 'alipay' | 'credit' | 'balance'>('wechat')
const paidAmount = ref<number>(0)

// 价格模式相关
const priceMode = ref<PriceMode>('retail')
const discountRate = ref<number>(90)
const promotionId = ref<number | null>(null)
const promotions = ref<PromotionRow[]>([])
const loadingPromotions = ref(false)

const cart = computed(() => {
  return cartStore.carts.find(c => c.id === cartStore.activeCartId)
})

// 把购物车 items 转成 computeOrder 所需的格式
const computeInput = computed(() => {
  if (!cart.value) return null
  const items = cart.value.items.map((it) => {
    const p = (it as any)._prices || {}
    let toBaseQty = 1
    if (it.unit !== it.baseUnit) {
      const conv = it.unitConversions?.find((u: any) => u.fromUnit === it.unit)
      if (conv) toBaseQty = conv.toBaseQty
    }
    return {
      basis: {
        defaultPrice: p.defaultPrice ?? it.unitPrice,
      },
      qty: it.qty,
      toBaseQty,
    }
  })
  const promoList = Array.isArray(promotions.value) ? promotions.value : []
  const selectedPromo = promoList.find((p) => p.id === promotionId.value) || null
  return computeOrder({
    items,
    mode: priceMode.value,
    discountRate: discountRate.value,
    promotion: selectedPromo
      ? { threshold: selectedPromo.threshold, reduction: selectedPromo.reduction }
      : null,
  })
})

// 未减免前合计（供"满减未达标"提示用）
const subtotalBeforeReduction = computed(() => computeInput.value?.subtotal ?? 0)
const subtotal = computed(() => computeInput.value?.subtotal ?? 0)
const reduction = computed(() => computeInput.value?.reduction ?? 0)
const previewTotal = computed(() => computeInput.value?.total ?? 0)
const promotionApplicable = computed(() => computeInput.value?.promotionApplicable ?? false)

const confirmDisabled = computed(() => {
  if (paymentMethod.value === 'credit' && !cart.value?.customerId) return true
  if (paymentMethod.value === 'balance' && (!cart.value?.customerId || (cart.value?.customerBalance ?? 0) <= 0)) return true
  if (priceMode.value === 'promotion' && promotionId.value && !promotionApplicable.value) return true
  if (priceMode.value === 'promotion' && !promotionId.value) return true
  return false
})

watch(() => props.visible, async (val) => {
  if (!val) return
  priceMode.value = 'retail'
  promotionId.value = null
  discountRate.value = 90
  await loadPromotions()
  if (paymentMethod.value === 'credit' || paymentMethod.value === 'balance') {
    paidAmount.value = 0
  } else {
    paidAmount.value = previewTotal.value
  }
})

watch(paymentMethod, (val) => {
  if (val === 'credit') {
    paidAmount.value = 0
  } else if (val === 'balance') {
    paidAmount.value = Math.min(cart.value?.customerBalance ?? 0, previewTotal.value)
  } else {
    paidAmount.value = previewTotal.value
  }
})

watch(previewTotal, (val) => {
  if (paymentMethod.value === 'balance') {
    paidAmount.value = Math.min(cart.value?.customerBalance ?? 0, val)
  } else if (paymentMethod.value !== 'credit') {
    paidAmount.value = val
  }
})

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

const changeAmount = computed(() => {
  return Math.max(0, paidAmount.value - previewTotal.value)
})

const handleConfirm = async () => {
  if (!cart.value) return
  if (paymentMethod.value === 'credit' && !cart.value.customerId) {
    message.error('请先选择客户才能使用记账付款')
    return
  }
  if (paymentMethod.value === 'balance') {
    if (!cart.value.customerId) {
      message.error('请先选择客户才能使用扣预存')
      return
    }
    if ((cart.value.customerBalance ?? 0) <= 0) {
      message.error('客户预存余额不足')
      return
    }
  }
  if (priceMode.value === 'promotion') {
    if (!promotionId.value) {
      message.error('请选择一个满减活动，或切回其它价格模式')
      return
    }
    if (!promotionApplicable.value) {
      message.error('当前合计未达到满减门槛')
      return
    }
  }

  loading.value = true
  try {
    const totalNow = previewTotal.value
    const isBalance = paymentMethod.value === 'balance'
    const balancePaid = isBalance ? Math.min(cart.value.customerBalance ?? 0, totalNow) : 0
    const paymentInfo = {
      method: paymentMethod.value,
      paidAmount: isBalance ? balancePaid : Math.min(paidAmount.value, totalNow),
      owedAmount:
        paymentMethod.value === 'credit'
          ? totalNow
          : isBalance
          ? Math.max(0, totalNow - balancePaid)
          : Math.max(0, totalNow - paidAmount.value),
    }

    const { data, error }: any = await $fetch('/api/orders/checkout', {
      method: 'POST',
      body: {
        cart: {
          ...cart.value,
          priceMode: priceMode.value,
          discountRate: priceMode.value === 'discount' ? discountRate.value : undefined,
          promotionId: priceMode.value === 'promotion' ? promotionId.value : null,
        },
        payment: paymentInfo,
        cashierId: currentCashier.value?.id,
      },
    })

    if (error) {
      message.error(error.message || '结账失败')
    } else if (data) {
      message.success('结账成功！')
      emit('success', data.order.id)

      if (cart.value) {
        cartStore.clearCart(cart.value.id)
      }
      emit('update:visible', false)
    }
  } catch (e: any) {
    message.error(e.data?.error?.message || e.message || '系统错误')
  } finally {
    loading.value = false
  }
}
</script>
