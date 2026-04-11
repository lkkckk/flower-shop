<template>
  <a-modal
    :open="visible"
    title="结账付款"
    @cancel="$emit('update:visible', false)"
    :footer="null"
    width="600px"
    destroyOnClose
  >
    <div v-if="cart" class="p-4">
      <div class="text-center mb-8 mt-4">
        <div class="text-gray-500 mb-2 font-medium">应收金额</div>
        <div class="text-6xl font-bold text-pink-600 font-display tracking-tight">¥ {{ total.toFixed(2) }}</div>
      </div>

      <div class="mb-6">
        <div class="text-gray-600 mb-2 font-medium">支付方式</div>
        <a-radio-group v-model:value="paymentMethod" button-style="solid" class="w-full flex">
          <a-radio-button value="wechat" class="flex-1 text-center justify-center flex items-center h-12 text-lg">微信</a-radio-button>
          <a-radio-button value="alipay" class="flex-1 text-center justify-center flex items-center h-12 text-lg">支付宝</a-radio-button>
          <a-radio-button value="cash" class="flex-1 text-center justify-center flex items-center h-12 text-lg">现金</a-radio-button>
          <a-radio-button value="credit" class="flex-1 text-center justify-center flex items-center h-12 text-lg">记账</a-radio-button>
        </a-radio-group>
        <div v-if="paymentMethod === 'credit' && !cart.customerId" class="text-red-500 mt-2 text-sm text-center bg-red-50 p-2 rounded">
          ⚠️ 必须在左侧选择具体客户后才能使用"记账"功能
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <span class="text-lg text-gray-700">实收金额</span>
          <a-input-number
            v-model:value="paidAmount"
            :min="0"
            :disabled="paymentMethod === 'credit'"
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
          :disabled="paymentMethod === 'credit' && !cart.customerId"
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

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'success'])

const cartStore = useCartStore()

const loading = ref(false)
const paymentMethod = ref<'cash' | 'wechat' | 'alipay' | 'credit'>('wechat')
const paidAmount = ref<number>(0)

const cart = computed(() => {
  return cartStore.carts.find(c => c.id === cartStore.activeCartId)
})

const total = computed(() => {
  if (!cart.value) return 0
  return cartStore.cartTotal(cart.value.id)
})

// 当支付方式改变，自动调整实收金额
watch(paymentMethod, (val) => {
  if (val === 'credit') {
    paidAmount.value = 0
  } else {
    paidAmount.value = total.value
  }
})

// 打开弹窗时初始化实收金额
watch(() => props.visible, (val) => {
  if (val) {
    if (paymentMethod.value !== 'credit') {
       paidAmount.value = total.value
    } else {
       paidAmount.value = 0
    }
  }
})

const changeAmount = computed(() => {
  return Math.max(0, paidAmount.value - total.value)
})

const handleConfirm = async () => {
  if (paymentMethod.value === 'credit' && !cart.value?.customerId) {
    message.error('请先选择客户才能使用记账付款')
    return
  }

  loading.value = true
  try {
    const paymentInfo = {
      method: paymentMethod.value,
      paidAmount: Math.min(paidAmount.value, total.value), // 不存找零部分
      owedAmount: paymentMethod.value === 'credit' ? total.value : Math.max(0, total.value - paidAmount.value)
    }

    const { data, error }: any = await $fetch('/api/orders/checkout', {
      method: 'POST',
      body: {
        cart: cart.value,
        payment: paymentInfo
      }
    })

    if (error) {
      message.error(error.message || '结账失败')
    } else if (data) {
      message.success('结账成功！')
      emit('success', data.order.id)
      
      // 清空当前购物车里的商品
      if (cart.value) {
        cartStore.clearCart(cart.value.id)
      }
      emit('update:visible', false)
    }
  } catch (e: any) {
    message.error(e.message || '系统错误')
  } finally {
    loading.value = false
  }
}
</script>
