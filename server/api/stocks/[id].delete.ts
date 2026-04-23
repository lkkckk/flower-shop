import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的批次 ID', code: 'INVALID_ID' } }
  }

  try {
    // 检查是否有销售关联
    const orderItemCount = await prisma.orderItem.count({ where: { batchId: id } })
    if (orderItemCount > 0) {
      setResponseStatus(event, 409)
      return {
        data: null,
        error: { message: `该批次已有 ${orderItemCount} 条销售记录，不能删除`, code: 'HAS_ORDER_ITEMS' },
      }
    }

    // 在事务中删除 StockMovement 再删除 StockBatch
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { batchId: id } })
      await tx.stockBatch.delete({ where: { id } })
    })

    return { data: { success: true }, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '删除失败', code: 'DELETE_ERROR' },
    }
  }
})
