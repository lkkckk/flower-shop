import { ref } from 'vue'
import { message } from 'ant-design-vue'

export interface StockQueryParams {
  page?: number
  pageSize?: number
  view?: 'by_product' | 'by_batch'
  productId?: number
  status?: string
  expiringSoon?: boolean
}

export interface CreateInboundPayload {
  productId: number
  inboundDate: string | Date
  inboundQty: number
  costPrice: number
  expiryDate?: string | Date
  notes?: string
}

export const useStocks = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchStocks = async (params: StockQueryParams = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/stocks', { query: params as any })
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data as { list: any[]; total: number; page: number; pageSize: number }
    } catch (e: any) {
      error.value = e.message || '获取库存失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchExpiring = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/stocks/expiring')
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data as { expiring: any[]; expired: any[] }
    } catch (e: any) {
      error.value = e.message || '获取临期批次失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createInbound = async (payload: CreateInboundPayload) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/stocks/inbound', {
        method: 'POST',
        body: payload,
      })
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = e.message || '入库失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchProductsWithStock = async (params: { keyword?: string; category?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/products/with-stock', { query: params as any })
      const res = response as any
      if (res.error) throw new Error(res.error.message)
      return res.data as { list: any[] }
    } catch (e: any) {
      error.value = e.message || '获取商品库存失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchStocks,
    fetchExpiring,
    createInbound,
    fetchProductsWithStock,
  }
}
