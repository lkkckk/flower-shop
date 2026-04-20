<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑客户' : '新增客户'"
    width="500px"
    :confirm-loading="submitting"
    destroy-on-close
    @ok="onSubmit"
    @cancel="onCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      class="mt-2"
    >
      <a-form-item label="姓名" name="name">
        <a-input v-model:value="form.name" placeholder="客户姓名" allow-clear />
      </a-form-item>

      <a-form-item label="手机号" name="phone" :validate-status="phoneError ? 'error' : ''" :help="phoneError || ''">
        <a-input v-model:value="form.phone" placeholder="选填，11 位手机号" allow-clear @change="phoneError = ''" />
      </a-form-item>

      <a-form-item label="客户等级" name="level">
        <a-radio-group v-model:value="form.level" button-style="solid">
          <a-radio-button value="normal">普通</a-radio-button>
          <a-radio-button value="member">会员</a-radio-button>
          <a-radio-button value="vip">VIP</a-radio-button>
          <a-radio-button value="wholesale">批发</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="地址" name="address">
        <a-textarea v-model:value="form.address" placeholder="选填" auto-size />
      </a-form-item>

      <a-form-item label="备注" name="notes">
        <a-textarea v-model:value="form.notes" placeholder="选填" :auto-size="{ minRows: 2, maxRows: 4 }" />
      </a-form-item>
    </a-form>
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
  (e: 'success', customer: any): void
}>()

const { createCustomer, updateCustomer } = useCustomers()

const formRef = ref<any>(null)
const submitting = ref(false)
const phoneError = ref<string>('')

const isEdit = computed(() => !!props.customer?.id)

interface FormState {
  name: string
  phone: string
  address: string
  level: string
  notes: string
}

const form = reactive<FormState>({
  name: '',
  phone: '',
  address: '',
  level: 'normal',
  notes: '',
})

const rules: Record<string, any> = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    {
      validator: (_rule: any, value: string) => {
        if (!value) return Promise.resolve()
        if (!/^1[3-9]\d{9}$/.test(value)) {
          return Promise.reject('请输入正确的手机号')
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  level: [{ required: true, message: '请选择客户等级', trigger: 'change' }],
}

const resetForm = (c?: any) => {
  form.name = c?.name || ''
  form.phone = c?.phone || ''
  form.address = c?.address || ''
  form.level = c?.level || 'normal'
  form.notes = c?.notes || ''
  phoneError.value = ''
  formRef.value?.clearValidate?.()
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      resetForm(props.customer || null)
    }
  }
)

const onCancel = () => {
  emit('update:visible', false)
}

const onSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  phoneError.value = ''
  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address || null,
      level: form.level,
      notes: form.notes || null,
    }

    let result: any
    if (isEdit.value) {
      result = await updateCustomer(props.customer.id, payload)
      message.success('客户已更新')
    } else {
      result = await createCustomer(payload)
      message.success('客户已创建')
    }

    emit('success', result)
    emit('update:visible', false)
  } catch (e: any) {
    if (e.code === 'PHONE_EXISTS') {
      phoneError.value = '该手机号已被其他客户使用'
    } else {
      message.error(e.message || '保存客户失败')
    }
  } finally {
    submitting.value = false
  }
}
</script>
