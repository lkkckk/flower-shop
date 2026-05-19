<template>
  <a-dropdown
    v-model:open="panelOpen"
    trigger="click"
    placement="bottomRight"
    :overlay-style="{ minWidth: '360px' }"
  >
    <a-badge :count="unreadCount" :overflow-count="99" :offset="[-4, 4]">
      <a-button type="text" shape="circle" class="bell-btn" @click="onTrigger">
        <BellOutlined />
      </a-button>
    </a-badge>
    <template #overlay>
      <div class="notif-panel">
        <div class="notif-header">
          <span class="notif-title">消息中心</span>
          <a-button v-if="unreadCount > 0" type="link" size="small" @click="onMarkAllRead">全部已读</a-button>
        </div>
        <a-tabs v-model:active-key="activeTab" size="small" class="notif-tabs" @change="onTabChange">
          <a-tab-pane key="unread" :tab="`未读 (${unreadCount})`" />
          <a-tab-pane key="all" tab="全部" />
        </a-tabs>
        <a-spin :spinning="loading">
          <div v-if="!loading && list.length === 0" class="notif-empty">
            <span>🎉 没有新通知</span>
          </div>
          <div v-else class="notif-list">
            <div
              v-for="item in list"
              :key="item.id"
              class="notif-item"
              :class="{ unread: !item.readAt }"
              @click="onClickItem(item)"
            >
              <div class="notif-icon">{{ typeIcon(item.type) }}</div>
              <div class="notif-body">
                <div class="notif-row">
                  <a-tag :color="levelColor(item.level)" class="notif-level">{{ levelLabel(item.level) }}</a-tag>
                  <span class="notif-item-title">{{ item.title }}</span>
                </div>
                <div class="notif-desc">{{ item.body }}</div>
                <div class="notif-time">{{ relativeTime(item.createdAt) }}</div>
              </div>
            </div>
          </div>
        </a-spin>
        <div class="notif-footer">
          <a-button type="link" block @click="goAll">查看全部</a-button>
        </div>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BellOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  useNotifications,
  NOTIFICATION_TYPES,
  NOTIFICATION_LEVELS,
  type NotificationItem,
} from '~/composables/useNotifications'

const router = useRouter()
const { unreadCount, loading, fetchUnreadCount, fetchList, markRead, markAllRead } = useNotifications()

const panelOpen = ref(false)
const activeTab = ref<'unread' | 'all'>('unread')
const list = ref<NotificationItem[]>([])

const loadList = async () => {
  try {
    const data = await fetchList({
      onlyUnread: activeTab.value === 'unread' ? 'true' : undefined,
      pageSize: 30,
    } as any)
    list.value = data.list
  } catch {
    list.value = []
  }
}

const onTrigger = async () => {
  // 第一次点击时立即拉一次
  if (panelOpen.value === false) {
    await loadList()
  }
}

watch(panelOpen, async (v) => {
  if (v) await loadList()
})

const onTabChange = async () => {
  await loadList()
}

const onMarkAllRead = async () => {
  await markAllRead()
  await loadList()
}

const onClickItem = async (item: NotificationItem) => {
  if (!item.readAt) await markRead(item.id)
  // 跳到对应位置
  switch (item.refType) {
    case 'product':
      router.push(`/stocks?productId=${item.refId}`)
      break
    case 'batch':
      router.push(`/stocks?batchId=${item.refId}`)
      break
    case 'customer':
      router.push(`/customers/${item.refId}`)
      break
    case 'order':
      router.push(item.refId ? `/orders?orderId=${item.refId}` : '/orders')
      break
  }
  panelOpen.value = false
}

const goAll = () => {
  panelOpen.value = false
  router.push('/notifications')
}

const typeIcon = (t: string) => (NOTIFICATION_TYPES as any)[t]?.icon || '🔔'
const levelColor = (l: string) => (NOTIFICATION_LEVELS as any)[l]?.color || 'default'
const levelLabel = (l: string) => (NOTIFICATION_LEVELS as any)[l]?.label || l

const relativeTime = (d: string) => {
  const t = dayjs(d)
  const diff = Date.now() - t.valueOf()
  if (diff < 60_000) return '刚刚'
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return t.format('MM-DD HH:mm')
}

// 轮询：每 60 秒拉一次未读数
let timer: any = null
onMounted(() => {
  fetchUnreadCount()
  timer = setInterval(() => fetchUnreadCount(), 60_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.bell-btn {
  font-size: 18px;
  color: #4b5563;
}
.bell-btn:hover {
  color: #ec4899;
}

.notif-panel {
  width: 380px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 0 16px;
}
.notif-title {
  font-weight: 600;
  font-size: 14px;
}

.notif-tabs {
  padding: 0 12px;
}
:deep(.notif-tabs .ant-tabs-nav) {
  margin-bottom: 0;
}

.notif-empty {
  padding: 36px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.notif-list {
  max-height: 420px;
  overflow-y: auto;
}

.notif-item {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
}
.notif-item:hover {
  background: #fafafa;
}
.notif-item.unread {
  background: #fff7ed;
}
.notif-item.unread:hover {
  background: #ffedd5;
}

.notif-icon {
  font-size: 18px;
  flex: 0 0 auto;
  line-height: 1.4;
}

.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.notif-level {
  margin: 0;
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
}
.notif-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notif-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 4px;
}
.notif-time {
  font-size: 11px;
  color: #9ca3af;
}

.notif-footer {
  border-top: 1px solid #f3f4f6;
}
</style>
