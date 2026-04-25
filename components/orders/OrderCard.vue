<template>
  <a-card class="h-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm" :body-style="{ padding: '14px' }">
    <template #cover>
      <div class="relative h-44 bg-gray-100">
        <img
          v-if="order.coverImage"
          :src="order.coverImage"
          :alt="primaryProductName"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center text-gray-400">
          暂无图片
        </div>
        <div class="absolute left-3 top-3 flex gap-2">
          <a-tag v-if="order.isUrgent" color="red">加急</a-tag>
          <a-tag :color="order.fulfillmentType === 'pickup' ? 'blue' : 'green'">
            {{ order.fulfillmentType === 'pickup' ? '自提' : '配送' }}
          </a-tag>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="truncate text-base font-semibold text-gray-900">
            {{ order.receiverName || '散客' }}
          </div>
          <div class="mt-1 truncate text-xs text-gray-500">
            {{ primaryProductName }}
          </div>
        </div>
        <a-checkbox :checked="order.isMade" @change="emit('toggle-made', order)">
          已做好
        </a-checkbox>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div class="text-xs text-gray-500">配送日期</div>
          <div class="font-medium text-gray-900">{{ order.dateLabel || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">时间</div>
          <a-tag color="cyan" class="mt-1">{{ order.timeLabel || '-' }}</a-tag>
        </div>
        <div>
          <div class="text-xs text-gray-500">价格</div>
          <div class="font-medium text-gray-900">¥{{ Number(order.totalAmount || 0).toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">状态</div>
          <a-tag class="mt-1">{{ statusText }}</a-tag>
        </div>
      </div>

      <div class="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        <div class="mb-1 text-xs text-gray-500">地址及电话</div>
        <div class="line-clamp-2">
          {{ order.deliveryAddress || (order.fulfillmentType === 'pickup' ? '到店自提' : '未填写地址') }}
          <span v-if="order.receiverPhone"> {{ order.receiverPhone }}</span>
        </div>
      </div>

      <div v-if="order.cardMessage || order.notes" class="rounded-xl bg-amber-50 p-3 text-sm text-gray-700">
        <div class="mb-1 text-xs text-gray-500">备注/卡片内容</div>
        <div class="line-clamp-3">{{ order.cardMessage || order.notes }}</div>
      </div>

      <div class="flex items-center justify-between pt-1">
        <a-button size="small" @click="emit('toggle-urgent', order)">
          {{ order.isUrgent ? '取消加急' : '设为加急' }}
        </a-button>
        <a-button size="small" type="link" @click="emit('view-detail', order)">详情</a-button>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  order: any
}>()

const emit = defineEmits<{
  (e: 'toggle-made', order: any): void
  (e: 'toggle-urgent', order: any): void
  (e: 'view-detail', order: any): void
}>()

const primaryProductName = computed(() => props.order.items?.[0]?.productName || '未命名花束')

const statusMap: Record<string, string> = {
  pending_confirm: '待确认',
  confirmed: '已确认',
  in_production: '制作中',
  ready: '待取/待送',
  completed: '已完成',
  cancelled: '已取消',
}

const statusText = computed(() => statusMap[props.order.status] || props.order.status || '-')
</script>
