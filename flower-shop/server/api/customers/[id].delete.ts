import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  try {
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      setResponseStatus(event, 404)
      return { data: null, error: { message: '客户不存在', code: 'NOT_FOUND' } }
    }

    const orderCount = await prisma.order.count({ where: { customerId: id } })
    if (orderCount > 0) {
      setResponseStatus(event, 400)
      return {
        data: null,
        error: {
          message: `该客户有 ${orderCount} 笔历史订单，无法删除`,
          code: 'HAS_ORDERS',
        },
      }
    }

    // 同步清理 payments（避免外键悬空）
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { customerId: id } })
      await tx.customer.delete({ where: { id } })
    })

    return { data: { success: true }, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '删除客户失败', code: 'DELETE_ERROR' },
    }
  }
})
