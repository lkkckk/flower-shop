import { ref } from 'vue'
import { message } from 'ant-design-vue'

export interface PreorderListParams {
  page?: number
  pageSize?: number
  status?: string
  deliveryStart?: string
  deliveryEnd?: string
  q?: string
  reminderStage?: string
}

export const usePreorders = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const normalizeError = (e: any, fallback: string) =>
    e?.data?.error?.message || e?.data?.message || e?.message || fallback

  const fetchList = async (params: PreorderListParams = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch('/api/preorders', { query: params as any }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data as { list: any[]; total: number; page: number; pageSize: number }
    } catch (e: any) {
      error.value = normalizeError(e, '获取预售单列表失败')
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: number) => {
    loading.value = true
    try {
      const res = await $fetch(`/api/preorders/${id}`) as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '获取预售单失败')
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchUpcoming = async (days: number = 7) => {
    try {
      const res = await $fetch('/api/preorders/upcoming', { query: { days } }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data as any[]
    } catch {
      return []
    }
  }

  const trashPreorder = async (id: number) => {
    try {
      const res = await $fetch(`/api/preorders/${id}/trash`, { method: 'POST' }) as any
      if (res.error) throw new Error(res.error.message)
      message.success('历史预售已移入回收站')
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '移入回收站失败')
      message.error(error.value!)
      throw e
    }
  }

  const restorePreorder = async (id: number) => {
    try {
      const res = await $fetch(`/api/preorders/${id}/restore`, { method: 'POST' }) as any
      if (res.error) throw new Error(res.error.message)
      message.success('历史预售已从回收站恢复')
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '恢复失败')
      message.error(error.value!)
      throw e
    }
  }

  return { loading, error, fetchList, fetchOne, fetchUpcoming, trashPreorder, restorePreorder }
}
