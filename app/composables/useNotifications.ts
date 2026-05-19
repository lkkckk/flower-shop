import { ref } from 'vue'

export interface NotificationItem {
  id: number
  type: 'low_stock' | 'expiring_batch' | 'debt_overdue' | 'anomaly_order'
  level: 'info' | 'warn' | 'urgent'
  title: string
  body: string
  refType: 'product' | 'batch' | 'customer' | 'order' | null
  refId: number | null
  readAt: string | null
  dedupeKey: string
  createdAt: string
}

export interface NotificationListParams {
  onlyUnread?: string
  type?: string
  page?: number
  pageSize?: number
}

export const NOTIFICATION_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  low_stock: { label: '低库存', color: 'red', icon: '📦' },
  expiring_batch: { label: '临期批次', color: 'orange', icon: '⏰' },
  debt_overdue: { label: '欠款逾期', color: 'volcano', icon: '💰' },
  anomaly_order: { label: '异常订单', color: 'magenta', icon: '⚠️' },
}

export const NOTIFICATION_LEVELS: Record<string, { color: string; label: string }> = {
  info: { color: 'blue', label: '提示' },
  warn: { color: 'orange', label: '警告' },
  urgent: { color: 'red', label: '紧急' },
}

export const useNotifications = () => {
  const loading = ref(false)
  const unreadCount = ref(0)

  const fetchUnreadCount = async () => {
    try {
      const res: any = await $fetch('/api/notifications/unread-count')
      if (!res.error) unreadCount.value = res.data?.count ?? 0
    } catch {
      // 静默
    }
  }

  const fetchList = async (params: NotificationListParams = {}) => {
    loading.value = true
    try {
      const res: any = await $fetch('/api/notifications', { query: params as any })
      if (res.error) throw new Error(res.error.message)
      if (typeof res.data?.unreadCount === 'number') unreadCount.value = res.data.unreadCount
      return res.data as {
        list: NotificationItem[]
        total: number
        page: number
        pageSize: number
        unreadCount: number
      }
    } finally {
      loading.value = false
    }
  }

  const markRead = async (id: number) => {
    try {
      const res: any = await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (!res.error) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {
      // 静默
    }
  }

  const markAllRead = async () => {
    try {
      const res: any = await $fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.error) unreadCount.value = 0
    } catch {
      // 静默
    }
  }

  const regenerate = async () => {
    try {
      const res: any = await $fetch('/api/notifications/regenerate', { method: 'POST' })
      if (res.error) throw new Error(res.error.message)
      await fetchUnreadCount()
    } catch (e: any) {
      throw e
    }
  }

  return {
    loading,
    unreadCount,
    fetchUnreadCount,
    fetchList,
    markRead,
    markAllRead,
    regenerate,
  }
}
