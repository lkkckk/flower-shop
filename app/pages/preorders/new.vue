<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-4xl mx-auto mb-4">
      <h1 class="text-xl font-bold text-gray-800">新建预售登记</h1>
      <p class="text-xs text-gray-500 mt-1">独立于商品与库存，直接输入商品与多图，保存即可打印配送单。</p>
    </div>
    <PreorderRegistrationForm
      :saving="saving"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import PreorderRegistrationForm from '~/components/preorders/PreorderRegistrationForm.vue'
import { usePreorderRegistrations } from '~/composables/usePreorderRegistrations'

useHead({ title: '新建预售登记 - 花店管理系统' })

const router = useRouter()
const { createRegistration, saving } = usePreorderRegistrations()

const onSubmit = async (payload: any) => {
  const result = await createRegistration(payload)
  if (result?.id) {
    router.replace(`/preorders/registrations/${result.id}`)
  }
}

const onCancel = () => router.push('/preorders')
</script>
