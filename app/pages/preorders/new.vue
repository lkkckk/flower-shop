<template>
  <a-card class="page-card" title="新建预售单">
    <PreorderForm
      submit-text="创建预售单"
      :submitting="submitting"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </a-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PreorderForm from '~/components/preorders/PreorderForm.vue'
import { usePreorders } from '~/composables/usePreorders'

useHead({ title: '新建预售单 - 花店管理系统' })

const router = useRouter()
const { createPreorder } = usePreorders()
const submitting = ref(false)

const onSubmit = async (payload: any) => {
  submitting.value = true
  try {
    const order = await createPreorder(payload)
    message.success(`预售单 ${order.orderNo} 创建成功`)
    router.replace(`/preorders/${order.id}`)
  } catch {
    // createPreorder already displays the server error.
  } finally {
    submitting.value = false
  }
}

const onCancel = () => router.back()
</script>

<style scoped>
.page-card { border-radius: 8px; max-width: 980px; margin: 0 auto; }
</style>
