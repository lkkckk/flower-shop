import { ref } from 'vue'
import { message } from 'ant-design-vue'
import type { Product, UnitConversion } from '@prisma/client'

export type ProductWithRelations = Product & {
  unitConversions: UnitConversion[]
}

export const useProducts = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProducts = async (params: { page?: number; pageSize?: number; keyword?: string; category?: string; categoryId?: number; status?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/products', {
        query: params,
      })
      
      const res = response as any 
      if (res.error) {
        throw new Error(res.error.message)
      }
      return res.data as { list: ProductWithRelations[]; total: number; page: number; pageSize: number }
    } catch (e: any) {
      error.value = e.message || '获取商品列表失败'
      message.error(error.value)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchProduct = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch(`/api/products/${id}`)
      
      const res = response as any
      if (res.error) {
        throw new Error(res.error.message)
      }
      return res.data as ProductWithRelations
    } catch (e: any) {
      error.value = e.message || '获取商品详情失败'
      message.error(error.value)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createProduct = async (data: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/products', {
        method: 'POST',
        body: data,
      })
      
      const res = response as any
      if (res.error) {
        throw new Error(res.error.message)
      }
      message.success('商品创建成功')
      return res.data as ProductWithRelations
    } catch (e: any) {
      error.value = e.message || '创建商品失败'
      message.error(error.value)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (id: number, data: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: data,
      })
      
      const res = response as any
      if (res.error) {
        throw new Error(res.error.message)
      }
      message.success('商品更新成功')
      return res.data as ProductWithRelations
    } catch (e: any) {
      error.value = e.message || '更新商品失败'
      message.error(error.value)
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })

      const res = response as any
      if (res.error) {
        throw new Error(res.error.message)
      }
      message.success('商品已删除')
    } catch (e: any) {
      error.value = e.message || '删除商品失败'
      message.error(error.value)
      throw e
    } finally {
      loading.value = false
    }
  }

  const uploadProductImage = async (id: number, file: File): Promise<string | null> => {
    const form = new FormData()
    form.append('file', file)
    try {
      const res: any = await $fetch(`/api/products/${id}/image`, {
        method: 'POST',
        body: form,
      })
      if (res.error) throw new Error(res.error.message)
      return res.data?.imageUrl ?? null
    } catch (e: any) {
      message.error(e.message || '图片上传失败')
      return null
    }
  }

  return {
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    loading,
    error,
  }
}
