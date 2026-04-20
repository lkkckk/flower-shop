import { ref } from 'vue'
import { message } from 'ant-design-vue'

export interface CustomerListParams {
  page?: number
  pageSize?: number
  keyword?: string
  level?: string
}

export interface CustomerInput {
  name: string
  phone?: string | null
  address?: string | null
  level: string
  notes?: string | null
}

export interface RepayPayload {
  amount: number
  paymentMethod: 'cash' | 'wechat' | 'alipay'
  notes?: string
}

export const useCustomers = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 用 any 包装 $fetch 以规避 Nuxt 路由模式匹配的过深类型推导
  const fetchAny: any = $fetch

  const handle = async <T>(fn: () => Promise<any>, fallbackMsg: string, silent = false): Promise<T> => {
    loading.value = true
    error.value = null
    try {
      const res: any = await fn()
      if (res?.error) {
        error.value = res.error.message || fallbackMsg
        if (!silent) message.error(error.value!)
        // 把 error 抛出，让调用方拿到 code
        const e: any = new Error(error.value!)
        e.code = res.error.code
        throw e
      }
      return res?.data as T
    } catch (e: any) {
      if (!error.value) {
        error.value = e.message || fallbackMsg
        if (!silent) message.error(error.value!)
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchCustomers = (params: CustomerListParams = {}) =>
    handle<{ list: any[]; total: number; page: number; pageSize: number }>(
      () => fetchAny('/api/customers', { query: params }),
      '获取客户列表失败'
    )

  const fetchCustomer = (id: number) =>
    handle<any>(() => fetchAny(`/api/customers/${id}`), '获取客户详情失败')

  const createCustomer = (data: CustomerInput) =>
    handle<any>(
      () => fetchAny('/api/customers', { method: 'POST', body: data }),
      '创建客户失败',
      true // 让调用方自己 handle PHONE_EXISTS
    )

  const updateCustomer = (id: number, data: CustomerInput) =>
    handle<any>(
      () => fetchAny(`/api/customers/${id}`, { method: 'PUT', body: data }),
      '更新客户失败',
      true
    )

  const deleteCustomer = (id: number) =>
    handle<{ success: boolean }>(
      () => fetchAny(`/api/customers/${id}`, { method: 'DELETE' }),
      '删除客户失败',
      true
    )

  const repayCustomer = (id: number, payload: RepayPayload) =>
    handle<{ customer: any; payment: any }>(
      () => fetchAny(`/api/customers/${id}/repay`, { method: 'POST', body: payload }),
      '还款失败'
    )

  const rechargeCustomer = (id: number, payload: RepayPayload) =>
    handle<{ customer: any; payment: any }>(
      () => fetchAny(`/api/customers/${id}/recharge`, { method: 'POST', body: payload }),
      '充值失败'
    )

  const fetchCustomerFavorites = (id: number) =>
    handle<any[]>(
      () => fetchAny(`/api/customers/${id}/favorites`),
      '获取常购花材失败',
      true
    )

  const searchCustomers = (keyword: string) =>
    handle<{ list: any[] }>(
      () => fetchAny('/api/customers/search', { query: { keyword } }),
      '搜索客户失败',
      true
    )

  return {
    loading,
    error,
    fetchCustomers,
    fetchCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    repayCustomer,
    rechargeCustomer,
    fetchCustomerFavorites,
    searchCustomers,
  }
}
