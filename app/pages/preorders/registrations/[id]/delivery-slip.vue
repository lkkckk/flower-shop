<template>
  <div>
    <DeliverySlipView
      v-if="slipData"
      :shop-name="shopName"
      :data="slipData"
    />
    <div v-else-if="loading" class="text-center p-12 text-gray-500">
      <a-spin />
      <div class="mt-2">正在加载预售登记数据…</div>
    </div>
    <div v-else class="text-center p-12 text-red-500">
      加载预售登记失败
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DeliverySlipView, { type SlipData } from '~/components/preorders/DeliverySlipView.vue'
import { usePreorderRegistrations } from '~/composables/usePreorderRegistrations'
import { resolveShopName } from '~~/shared/shopIdentity'

definePageMeta({ layout: false })

const route = useRoute()
const id = Number(route.params.id)

const { fetchRegistration, loading } = usePreorderRegistrations()

const rawData = ref<any>(null)
const shopName = ref('花店')

const slipData = computed<SlipData | null>(() => {
  if (!rawData.value) return null
  return {
    orderNo: rawData.value.orderNo,
    contactPhone: rawData.value.contactPhone,
    deliveryTime: rawData.value.deliveryTime,
    notes: rawData.value.notes,
    cardMessage: rawData.value.cardMessage,
    items: (rawData.value.items || []).map((it: any) => ({
      name: it.name,
      qty: Number(it.qty),
      photos: (it.photos || []).map((p: any) => p.url),
    })),
  }
})

useHead({
  title: computed(() => `配送单 - ${rawData.value?.orderNo || id}`),
})

onMounted(async () => {
  try {
    const [reg, settingsRes]: [any, any] = await Promise.all([
      fetchRegistration(id),
      $fetch('/api/settings').catch(() => ({ data: {} })),
    ])
    rawData.value = reg
    const settings = settingsRes?.data || settingsRes || {}
    shopName.value = resolveShopName(settings)
  } catch {}
})
</script>
