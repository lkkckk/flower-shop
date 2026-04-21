<template>
  <a-card v-if="order" class="page-card" :title="`编辑预售单 ${order.orderNo}`">
    <PreorderForm
      :initial="order"
      submit-text="保存修改"
      :submitting="submitting"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </a-card>
  <div v-else class="text-center text-gray-400 p-10">加载中...</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PreorderForm from '~/components/preorders/PreorderForm.vue'
import { usePreorders } from '~/composables/usePreorders'

useHead({ title: '编辑预售单 - 花店管理系统' })

const route = useRoute()
const router = useRouter()
const { fetchOne, updatePreorder } = usePreorders()
const order = ref<any>(null)
const submitting = ref(false)

const load = async () => {
  const id = Number(route.params.id)
  order.value = await fetchOne(id)
}

const onSubmit = async (payload: any) => {
  submitting.value = true
  try {
    await updatePreorder(order.value.id, payload)
    message.success('已保存')
    router.replace(`/preorders/${order.value.id}`)
  } finally {
    submitting.value = false
  }
}

const onCancel = () => router.back()

onMounted(load)
</script>

<style scoped>
.page-card { border-radius: 8px; max-width: 980px; margin: 0 auto; }
</style>
