<template>
  <a-modal
    :open="visible"
    title="客户充值"
    width="480px"
    :confirm-loading="submitting"
    destroy-on-close
    @ok="onSubmit"
    @cancel="onCancel"
  >
    <div v-if="customer" class="py-2">
      <!-- 客户信息 -->
      <div class="bg-gray-50 rounded-lg p-3 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg">{{ customer.name }}</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ customer.phone || '—' }}</div>
          </div>
          <a-tag :color="getLevelColor(customer.level)">{{ getLevelName(customer.level) }}</a-tag>
        </div>
        <div class="mt-3 pt-3 border-t border-dashed border-gray-200 flex items-center justify-between">
          <span class="text-sm text-gray-500">当前账户余额</span>
          <span :class="balanceClass">
            <template v-if="customer.balance < 0">欠款 ¥{{ Math.abs(customer.balance).toFixed(2) }}</template>
            <template v-else-if="customer.balance > 0">预存 ¥{{ customer.balance.toFixed(2) }}</template>
            <template v-else>¥0.00</template>
          </span>
        </div>
      </div>

      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="充值金额" name="amount">
          <a-input-number
            v-model:value="form.amount"
            :min="0.01"
            :precision="2"
            class="w-full text-2xl font-bold"
            size="large"
            prefix="¥"
            placeholder="请输入充值金额"
            autofocus
          />
          <div class="mt-2 flex gap-2">
            <a-button size="small" v-for="preset in [100, 200, 500, 1000]" :key="preset" @click="form.amount = preset">
              ¥{{ preset }}
            </a-button>
          </div>
        </a-form-item>

        <a-form-item label="支付方式" name="paymentMethod">
          <a-radio-group v-model:value="form.paymentMethod" button-style="solid">
            <a-radio-button value="cash">现金</a-radio-button>
            <a-radio-button value="wechat">微信</a-radio-button>
            <a-radio-button value="alipay">支付宝</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="备注" name="notes">
          <a-textarea v-model:value="form.notes" :auto-size="{ minRows: 2, maxRows: 4 }" placeholder="选填" />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useCustomers } from '~/composables/useCustomers'

const props = defineProps<{
  visible: boolean
  customer?: any | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success', payload: { customer: any; payment: any }): void
}>()

const { rechargeCustomer } = useCustomers()

const formRef = ref<any>(null)
const submitting = ref(false)

interface FormState {
  amount: number | undefined
  paymentMethod: 'cash' | 'wechat' | 'alipay'
  notes: string
}

const form = reactive<FormState>({
  amount: undefined,
  paymentMethod: 'cash',
  notes: '',
})

const rules: Record<string, any> = {
  amount: [
    { required: true, message: '请输入充值金额', trigger: 'blur' },
    {
      validator: (_rule: any, value: number) => {
        if (value === undefined || value === null || isNaN(value)) return Promise.reject('请输入充值金额')
        if (value <= 0) return Promise.reject('金额必须大于 0')
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

const balanceClass = computed(() => {
  if (!props.customer) return ''
  if (props.customer.balance < 0) return 'text-red-600 font-bold text-lg'
  if (props.customer.balance > 0) return 'text-green-600 font-bold text-lg'
  return 'text-gray-400'
})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.amount = undefined
      form.paymentMethod = 'cash'
      form.notes = ''
      formRef.value?.clearValidate?.()
    }
  }
)

const onCancel = () => emit('update:visible', false)

const onSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (!props.customer?.id) return

  submitting.value = true
  try {
    const result = await rechargeCustomer(props.customer.id, {
      amount: form.amount!,
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
    })
    message.success(`已充值 ¥${form.amount!.toFixed(2)}`)
    emit('success', result)
    emit('update:visible', false)
  } catch {
    // composable 已 message.error
  } finally {
    submitting.value = false
  }
}

const getLevelName = (level: string) => {
  const map: Record<string, string> = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || '普通'
}

const getLevelColor = (level: string) => {
  const map: Record<string, string> = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}
</script>
