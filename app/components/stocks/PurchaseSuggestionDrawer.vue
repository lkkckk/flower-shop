<template>
  <a-drawer
    :open="open"
    width="640"
    title="采购建议"
    placement="right"
    @update:open="$emit('update:open', $event)"
  >
    <a-alert
      type="info"
      show-icon
      class="mb-3"
      :message="`安全库存天数：${safetyDays} 天 · 建议库存 = 近 7 天日均销量 × 安全天数`"
    />
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && list.length === 0" description="当前所有商品库存都很健康" />
      <a-table
        v-else
        :columns="columns"
        :data-source="list"
        :pagination="false"
        size="small"
        row-key="productId"
        :scroll="{ y: 480 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'productName'">
            <div class="flex flex-col">
              <span class="font-medium">{{ record.productName }}</span>
              <span class="text-xs text-gray-400">
                <template v-if="record.grade">{{ record.grade }} · </template>
                7 天销量 {{ record.weeklySales }} {{ record.baseUnit }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'currentStock'">
            <span :class="record.currentStock <= 0 ? 'text-red-600 font-bold' : 'text-gray-700'">
              {{ record.currentStock }} {{ record.baseUnit }}
            </span>
          </template>
          <template v-else-if="column.key === 'suggestedStock'">
            <span class="text-gray-700">{{ record.suggestedStock }} {{ record.baseUnit }}</span>
          </template>
          <template v-else-if="column.key === 'gap'">
            <b class="text-pink-600">{{ record.gap }} {{ record.baseUnit }}</b>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="goInbound(record)">去入库</a-button>
          </template>
        </template>
      </a-table>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const safetyDays = ref(5)

const columns = [
  { title: '商品', key: 'productName' },
  { title: '当前库存', key: 'currentStock', width: 120, align: 'right' as const },
  { title: '建议库存', key: 'suggestedStock', width: 120, align: 'right' as const },
  { title: '缺口', key: 'gap', width: 100, align: 'right' as const },
  { title: '', key: 'action', width: 70, align: 'center' as const },
]

const load = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/stocks/purchase-suggestion')
    if (res.error) {
      message.error(res.error.message)
      list.value = []
    } else {
      list.value = res.data.list || []
      safetyDays.value = res.data.safetyDays || 5
    }
  } catch (e: any) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const goInbound = (record: any) => {
  router.push({
    path: '/stocks/inbound',
    query: { productId: String(record.productId), suggestQty: String(record.gap) },
  })
  emit('update:open', false)
}

watch(
  () => props.open,
  (v) => {
    if (v) load()
  },
)
</script>
