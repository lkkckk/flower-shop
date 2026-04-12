import { ref } from 'vue'
import { message } from 'ant-design-vue'

export interface OrderListParams {
  page?: number
  pageSize?: number
  customerId?: number
  status?: string
  startDate?: string
  endDate?: string
}

export const useOrders = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchOrders = async (params: OrderListParams = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/orders', { query: params as any })
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data as { list: any[]; total: number; page: number; pageSize: number }
    } catch (e: any) {
      error.value = e.message || '获取订单列表失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchOrder = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch(`/api/orders/${id}`)
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = e.message || '获取订单详情失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchOrders,
    fetchOrder,
  }
}
