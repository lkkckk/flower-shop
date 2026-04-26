<template>
  <article class="order-card" :class="{ urgent: order.isUrgent, made: order.isMade }">
    <div class="order-cover">
      <img v-if="order.coverImage" :src="order.coverImage" :alt="primaryProductName" />
      <div v-else class="cover-empty">花</div>
      <div class="badges">
        <a-tag v-if="order.isUrgent" color="red">加急</a-tag>
        <a-tag :color="order.fulfillmentType === 'pickup' ? 'blue' : 'green'">
          {{ order.fulfillmentType === 'pickup' ? '自提' : '配送' }}
        </a-tag>
      </div>
    </div>

    <div class="order-body">
      <div class="order-head">
        <div class="min-w-0">
          <div class="receiver">{{ order.receiverName || '散客' }}</div>
          <div class="product">{{ primaryProductName }}</div>
        </div>
        <a-checkbox :checked="order.isMade" @change="emit('toggle-made', order)">已做好</a-checkbox>
      </div>

      <div class="facts">
        <div>
          <span>履约日期</span>
          <b>{{ order.dateLabel || '-' }}</b>
        </div>
        <div>
          <span>时间</span>
          <b>{{ order.timeLabel || '-' }}</b>
        </div>
        <div>
          <span>金额</span>
          <b>¥{{ Number(order.totalAmount || 0).toFixed(2) }}</b>
        </div>
        <div>
          <span>状态</span>
          <a-tag>{{ statusText }}</a-tag>
        </div>
      </div>

      <div class="note-block">
        <div class="note-label">地址及电话</div>
        <div class="note-text">
          {{ order.deliveryAddress || (order.fulfillmentType === 'pickup' ? '到店自提' : '未填写地址') }}
          <span v-if="order.receiverPhone"> {{ order.receiverPhone }}</span>
        </div>
      </div>

      <div v-if="order.cardMessage || order.notes" class="note-block warm">
        <div class="note-label">备注/卡片内容</div>
        <div class="note-text">{{ order.cardMessage || order.notes }}</div>
      </div>

      <div class="order-actions">
        <a-button size="small" @click="emit('toggle-urgent', order)">
          {{ order.isUrgent ? '取消加急' : '设为加急' }}
        </a-button>
        <a-button size="small" type="link" @click="emit('view-detail', order)">详情</a-button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ order: any }>()

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

<style scoped>
.order-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper-3);
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.order-card:hover {
  border-color: var(--avo-200);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.order-card.urgent {
  border-color: rgba(184, 90, 61, 0.36);
}

.order-card.made {
  opacity: 0.78;
}

.order-cover {
  position: relative;
  height: 128px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--avo-50), var(--avo-100));
}

.order-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--avo-700);
  font-size: 30px;
  font-weight: 800;
}

.badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}

.order-body {
  padding: 15px;
}

.order-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.receiver {
  overflow: hidden;
  color: var(--ink-900);
  font-size: 16px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product {
  overflow: hidden;
  margin-top: 3px;
  color: var(--ink-500);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.facts div {
  min-width: 0;
}

.facts span,
.note-label {
  display: block;
  color: var(--ink-400);
  font-size: 11px;
}

.facts b {
  display: block;
  margin-top: 3px;
  color: var(--ink-900);
  font-size: 13px;
}

.note-block {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--paper-2);
}

.note-block.warm {
  background: rgba(200, 154, 58, 0.12);
}

.note-text {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 3px;
  color: var(--ink-700);
  font-size: 13px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.order-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
</style>
