<template>
  <div>
    <DeliverySlipView
      v-if="slipData"
      :shop-name="shopName"
      :data="slipData"
    />
    <div v-else-if="loading" class="text-center p-12 text-gray-500">
      <a-spin />
      <div class="mt-2">正在加载历史预售单…</div>
    </div>
    <div v-else class="text-center p-12 text-red-500">
      加载预售单失败
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DeliverySlipView, { type SlipData } from '~/components/preorders/DeliverySlipView.vue'
import { usePreorders } from '~/composables/usePreorders'
import { resolveShopName } from '~~/shared/shopIdentity'

definePageMeta({ layout: false })

const route = useRoute()
const id = Number(route.params.id)

const { fetchOne, loading } = usePreorders()

const order = ref<any>(null)
const shopName = ref('花店')

const slipData = computed<SlipData | null>(() => {
  if (!order.value) return null
  return {
    orderNo: order.value.orderNo,
    contactPhone: order.value.receiverPhone || order.value.customer?.phone,
    deliveryTime: order.value.deliveryTime,
    notes: order.value.notes,
    cardMessage: order.value.cardMessage,
    totalAmount: order.value.totalAmount ?? undefined,
    items: (order.value.items || []).map((it: any) => ({
      name: it.product?.name || '鲜花商品',
      qty: Number(it.qty),
      amount: it.subtotal ?? null,
      unit: it.unit,
      photos: it.imageUrl ? [it.imageUrl] : [],
    })),
  }
})

useHead({
  title: computed(() => `配送单 - ${order.value?.orderNo || id}`),
})

onMounted(async () => {
  try {
    const [ord, settingsRes]: [any, any] = await Promise.all([
      fetchOne(id),
      $fetch('/api/settings').catch(() => ({ data: {} })),
    ])
    order.value = ord
    const settings = settingsRes?.data || settingsRes || {}
    shopName.value = resolveShopName(settings)
  } catch {}
})
</script>
