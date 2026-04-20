import { ref } from 'vue'
import { message } from 'ant-design-vue'

export const useReports = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchDashboard = async (params: { startDate?: string; endDate?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const res: any = await ($fetch as any)('/api/reports/dashboard', { query: params })
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (e: any) {
      error.value = e.message || '获取报表数据失败'
      message.error(error.value!)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchDashboard }
}
