<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-4xl mx-auto mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        修改预售自由登记
        <span v-if="detail" class="text-sm text-gray-400 font-normal ml-2">#{{ detail.orderNo }} (v{{ detail.version }})</span>
      </h1>
      <p class="text-xs text-gray-500 mt-1">更新商品信息与照片，修改将自动进行并发冲突校验。</p>
    </div>

    <a-spin :spinning="loading">
      <PreorderRegistrationForm
        v-if="detail"
        :initial-data="detail"
        :is-edit="true"
        :saving="saving"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PreorderRegistrationForm from '~/components/preorders/PreorderRegistrationForm.vue'
import { usePreorderRegistrations } from '~/composables/usePreorderRegistrations'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

useHead({ title: '修改预售登记 - 花店管理系统' })

const { loading, saving, fetchRegistration, updateRegistration } = usePreorderRegistrations()
const detail = ref<any>(null)

async function loadDetail() {
  detail.value = await fetchRegistration(id)
}

const onSubmit = async (payload: any) => {
  const result = await updateRegistration(id, payload)
  if (result?.id) {
    router.replace(`/preorders/registrations/${id}`)
  }
}

const onCancel = () => router.push(`/preorders/registrations/${id}`)

onMounted(loadDetail)
</script>
