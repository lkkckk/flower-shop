<template>
  <a-modal
    :open="open"
    title="选择商品"
    width="760px"
    :footer="null"
    @cancel="$emit('update:open', false)"
  >
    <a-input-search
      v-model:value="keyword"
      placeholder="搜索商品名称"
      allow-clear
      class="mb-3"
      @search="loadList"
      @change="onKeywordChange"
    />
    <a-table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 10 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'image'">
          <a-image
            v-if="record.imageUrl"
            :src="record.imageUrl"
            :width="48"
            :height="48"
            :preview="false"
            class="object-cover rounded"
          />
          <div v-else class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">无图</div>
        </template>
        <template v-else-if="column.key === 'name'">
          <div class="font-medium">{{ record.name }}</div>
          <div class="text-xs text-gray-400">
            <span v-if="record.grade">{{ record.grade }}</span>
            <span v-if="record.color"> · {{ record.color }}</span>
            <span v-if="record.specification"> · {{ record.specification }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'price'">
          <span class="text-pink-600 font-bold">¥{{ Number(record.defaultPrice).toFixed(2) }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="primary" size="small" @click="onPick(record)">选择</a-button>
        </template>
      </template>
    </a-table>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'pick', product: any): void
}>()

const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)

const columns = [
  { title: '图片', key: 'image', width: 60 },
  { title: '商品', key: 'name' },
  { title: '售价', key: 'price', width: 100 },
  { title: '操作', key: 'action', width: 80 },
]

const loadList = async () => {
  loading.value = true
  try {
    const res = await $fetch('/api/products', {
      query: { keyword: keyword.value || undefined, pageSize: 50, status: 'active' },
    }) as any
    list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

let debounceTimer: any = null
const onKeywordChange = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadList, 250)
}

const onPick = (product: any) => {
  emit('pick', product)
  emit('update:open', false)
}

watch(
  () => props.open,
  (v) => { if (v) loadList() },
)
</script>
