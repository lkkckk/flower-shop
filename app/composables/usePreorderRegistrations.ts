import { ref } from 'vue'
import { message } from 'ant-design-vue'

export interface PreorderItemPhoto {
  id?: number
  url: string
  previewUrl?: string
  sort?: number
  uid?: string
  status?: 'uploading' | 'done' | 'error'
  file?: File
}

export interface PreorderRegistrationItemData {
  id?: number
  name: string
  qty: string | number
  amount: string | null
  sort?: number
  photos: PreorderItemPhoto[]
}

export interface PreorderRegistrationData {
  id?: number
  orderNo: string
  contactPhone?: string | null
  deliveryTime?: string | Date | null
  notes?: string | null
  cardMessage?: string | null
  version?: number
  createdById?: number
  updatedById?: number
  createdAt?: string
  updatedAt?: string
  trashedAt?: string | null
  createdBy?: { id: number; name: string; role: string }
  updatedBy?: { id: number; name: string; role: string }
  trashedBy?: { id: number; name: string; role: string }
  items: PreorderRegistrationItemData[]
}

export function usePreorderRegistrations() {
  const loading = ref(false)
  const saving = ref(false)

  async function fetchRegistrations(params: {
    page?: number
    pageSize?: number
    q?: string
    deliveryStart?: string
    deliveryEnd?: string
    trashed?: boolean
  }) {
    loading.value = true
    try {
      const res: any = await $fetch('/api/preorder-registrations', {
        query: {
          ...params,
          trashed: params.trashed ? 'true' : 'false',
        },
      })
      return res?.data || { list: [], total: 0, page: 1, pageSize: 20 }
    } catch (err: any) {
      message.error(err?.data?.message || err?.message || '加载预售登记失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchRegistration(id: number) {
    loading.value = true
    try {
      const res: any = await $fetch(`/api/preorder-registrations/${id}`)
      return res?.data || null
    } catch (err: any) {
      message.error(err?.data?.message || err?.message || '获取登记详情失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createRegistration(payload: any) {
    saving.value = true
    try {
      const res: any = await $fetch('/api/preorder-registrations', {
        method: 'POST',
        body: payload,
      })
      message.success('预售登记保存成功')
      return res?.data
    } catch (err: any) {
      message.error(err?.data?.message || err?.message || '保存预售登记失败')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function updateRegistration(id: number, payload: any) {
    saving.value = true
    try {
      const res: any = await $fetch(`/api/preorder-registrations/${id}`, {
        method: 'PUT',
        body: payload,
      })
      message.success('预售登记修改成功')
      return res?.data
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.data?.statusCode === 409) {
        message.error('该登记已被其他人修改，请刷新后重新编辑！', 4)
      } else {
        message.error(err?.data?.message || err?.message || '修改预售登记失败')
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  async function trashRegistration(id: number) {
    try {
      const res: any = await $fetch(`/api/preorder-registrations/${id}/trash`, {
        method: 'POST',
      })
      message.success('已移入回收站')
      return res?.data
    } catch (err: any) {
      message.error(err?.data?.message || err?.message || '移入回收站失败')
      throw err
    }
  }

  async function restoreRegistration(id: number) {
    try {
      const res: any = await $fetch(`/api/preorder-registrations/${id}/restore`, {
        method: 'POST',
      })
      message.success('已从回收站恢复')
      return res?.data
    } catch (err: any) {
      message.error(err?.data?.message || err?.message || '恢复失败')
      throw err
    }
  }

  async function uploadRegistrationImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res: any = await $fetch('/api/preorder-registrations/images', {
      method: 'POST',
      body: formData,
    })
    return res.data.imageUrl
  }

  return {
    loading,
    saving,
    fetchRegistrations,
    fetchRegistration,
    createRegistration,
    updateRegistration,
    trashRegistration,
    restoreRegistration,
    uploadRegistrationImage,
  }
}
