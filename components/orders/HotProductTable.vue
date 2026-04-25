<template>
  <a-table
    :columns="columns"
    :data-source="dataSource"
    :pagination="false"
    row-key="productId"
    bordered
    size="middle"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'rank'">
        <a-tag :color="index < 3 ? 'red' : 'default'">第 {{ index + 1 }} 名</a-tag>
      </template>
      <template v-else-if="column.key === 'product'">
        <div class="flex items-center gap-3">
          <a-avatar shape="square" :size="52" :src="record.imageUrl" />
          <div>
            <div class="font-medium text-gray-900">{{ record.productName }}</div>
            <div class="text-xs text-gray-500">商品 ID：{{ record.productId }}</div>
          </div>
        </div>
      </template>
      <template v-else-if="column.key === 'totalAmount'">
        ¥{{ Number(record.totalAmount || 0).toFixed(2) }}
      </template>
    </template>
  </a-table>
</template>

<script setup lang="ts">
defineProps<{
  dataSource: any[]
}>()

const columns = [
  { title: '排名', key: 'rank', width: 100 },
  { title: '花束款式', key: 'product' },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 120 },
  { title: '总数量', dataIndex: 'totalQty', key: 'totalQty', width: 120 },
  { title: '总金额', key: 'totalAmount', width: 140 },
]
</script>
