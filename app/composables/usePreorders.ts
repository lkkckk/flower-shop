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

  const createPreorder = async (payload: any) => {
    loading.value = true
    try {
      const res = await $fetch('/api/preorders', { method: 'POST', body: payload }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '创建预售单失败')
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updatePreorder = async (id: number, payload: any) => {
    loading.value = true
    try {
      const res = await $fetch(`/api/preorders/${id}`, { method: 'PUT', body: payload }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '更新预售单失败')
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const advance = async (id: number, to: string) => {
    loading.value = true
    try {
      const res = await $fetch(`/api/preorders/${id}/advance`, {
        method: 'POST',
        body: { to },
      }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '状态流转失败')
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const setMade = async (id: number, isMade: boolean) => {
    loading.value = true
    try {
      const res = await $fetch(`/api/preorders/${id}/made`, {
        method: 'PATCH',
        body: { isMade },
      }) as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = normalizeError(e, '更新制作状态失败')
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

  return { loading, error, fetchList, fetchOne, createPreorder, updatePreorder, advance, setMade, fetchUpcoming }
}
