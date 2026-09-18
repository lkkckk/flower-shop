import { message } from 'ant-design-vue'
import { createClientId } from '~~/shared/clientId'
export function useBusiness() {
  const busy = ref(false)
  const pending = new Map<string, string>()
  async function request(path: string, method = 'GET', payload?: any) {
    const signature = path + method + JSON.stringify(payload)
    if (method !== 'GET' && !pending.has(signature)) pending.set(signature, createClientId())
    busy.value = true
    try {
      const response: any = await ($fetch as any)(path, { method, ...(payload ? { body: { ...payload, idempotencyKey: pending.get(signature) } } : {}) })
      if (response.error) throw new Error(response.error.message)
      pending.delete(signature)
      return response.data
    } catch (e: any) {
      if (e.status >= 400 && e.status < 500) pending.delete(signature)
      message.error(e.data?.error?.message || e.data?.message || e.message)
      throw e
    } finally { busy.value = false }
  }
  return { request, busy }
}
