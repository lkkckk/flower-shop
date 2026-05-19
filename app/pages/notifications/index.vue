<template>
  <div>
    <a-card class="page-card" :body-style="{ padding: '16px' }">
      <div class="header-row">
        <h2 class="title">消息中心</h2>
        <a-space>
          <a-button v-if="isAdmin" @click="onRegenerate" :loading="regenerating">
            <ReloadOutlined /> 立即重新扫描
          </a-button>
          <a-button v-if="unreadCount > 0" type="primary" class="bg-pink-500 hover:bg-pink-600 border-none" @click="onMarkAllRead">
            全部已读 ({{ unreadCount }})
          </a-button>
        </a-space>
      </div>

      <a-tabs v-model:active-key="activeType" @change="onTabChange">
        <a-tab-pane key="all" tab="全部" />
        <a-tab-pane key="unread" tab="仅看未读" />
        <a-tab-pane key="low_stock" tab="低库存" />
        <a-tab-pane key="expiring_batch" tab="临期批次" />
        <a-tab-pane key="debt_overdue" tab="欠款逾期" />
        <a-tab-pane key="anomaly_order" tab="异常订单" />
      </a-tabs>

      <div class="filter-row">
        <a-select
          v-model:value="activeLevel"
          allow-clear
          placeholder="全部级别"
          class="level-filter"
          :options="levelOptions"
          @change="onLevelChange"
        />
      </div>

      <a-spin :spinning="loading">
        <a-empty v-if="!loading && list.length === 0" description="暂无通知" />
        <a-list v-else :data-source="list" item-layout="horizontal" class="notif-page-list">
          <template #renderItem="{ item }">
            <a-list-item :class="{ unread: !item.readAt }" class="notif-page-item" @click="onClickItem(item)">
              <a-list-item-meta>
                <template #avatar>
                  <div class="notif-page-icon">{{ typeIcon(item.type) }}</div>
                </template>
                <template #title>
                  <a-space :size="6">
                    <a-tag :color="levelColor(item.level)" class="notif-level">{{ levelLabel(item.level) }}</a-tag>
                    <a-tag color="default">{{ typeLabel(item.type) }}</a-tag>
                    <span class="font-medium">{{ item.title }}</span>
                    <a-badge v-if="!item.readAt" status="processing" />
                  </a-space>
                </template>
                <template #description>
                  <div class="notif-page-body">{{ item.body }}</div>
                  <div class="notif-page-time">{{ formatTime(item.createdAt) }}</div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>

      <div class="mt-4 flex justify-end">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-total="showTotal"
          @change="loadList"
          @show-size-change="loadList"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  useNotifications,
  NOTIFICATION_TYPES,
  NOTIFICATION_LEVELS,
} from '~/composables/useNotifications'

useHead({ title: '消息中心 - 花店管理系统' })

const router = useRouter()
const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

const { unreadCount, loading, fetchList, markRead, markAllRead, regenerate } = useNotifications()

const activeType = ref<string>('all')
const activeLevel = ref<string | undefined>(undefined)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(30)
const regenerating = ref(false)

const showTotal = (t: number) => `共 ${t} 条`
const levelOptions = computed(() =>
  Object.entries(NOTIFICATION_LEVELS).map(([value, item]) => ({ value, label: item.label })),
)

const loadList = async () => {
  try {
    const query: any = { page: page.value, pageSize: pageSize.value }
    if (activeType.value === 'unread') {
      query.onlyUnread = 'true'
    } else if (activeType.value !== 'all') {
      query.type = activeType.value
    }
    if (activeLevel.value) query.level = activeLevel.value
    const data = await fetchList(query)
    list.value = data.list
    total.value = data.total
  } catch (e: any) {
    message.error(e.message || '加载失败')
    list.value = []; total.value = 0
  }
}

const onTabChange = () => {
  page.value = 1
  loadList()
}

const onLevelChange = () => {
  page.value = 1
  loadList()
}

const onMarkAllRead = async () => {
  await markAllRead()
  message.success('已全部置为已读')
  loadList()
}

const onClickItem = async (item: any) => {
  if (!item.readAt) {
    await markRead(item.id)
    item.readAt = new Date().toISOString()
  }
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
}

const onRegenerate = async () => {
  regenerating.value = true
  try {
    await regenerate()
    message.success('扫描完成')
    loadList()
  } catch (e: any) {
    message.error(e.message || '扫描失败')
  } finally {
    regenerating.value = false
  }
}

const typeIcon = (t: string) => (NOTIFICATION_TYPES as any)[t]?.icon || '🔔'
const typeLabel = (t: string) => (NOTIFICATION_TYPES as any)[t]?.label || t
const levelColor = (l: string) => (NOTIFICATION_LEVELS as any)[l]?.color || 'default'
const levelLabel = (l: string) => (NOTIFICATION_LEVELS as any)[l]?.label || l

const formatTime = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm')

onMounted(() => loadList())
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.filter-row {
  display: flex;
  justify-content: flex-end;
  margin: -4px 0 12px;
}
.level-filter {
  width: 140px;
}

.notif-page-list :deep(.ant-list-item) {
  cursor: pointer;
  border-radius: 6px;
  padding: 12px;
  transition: background 0.15s ease;
}
.notif-page-list :deep(.ant-list-item:hover) {
  background: #fafafa;
}
.notif-page-item.unread :deep(.ant-list-item) {
  background: #fff7ed;
}

.notif-page-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.notif-page-body {
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 4px;
}
.notif-page-time {
  color: #9ca3af;
  font-size: 12px;
}

.notif-level {
  margin: 0;
}
</style>
