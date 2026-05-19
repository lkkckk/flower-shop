import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: '无效的订单 ID' })
  }

  try {
    const [order, payments] = await Promise.all([
      prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          cashier: { select: { id: true, name: true, username: true } },
          promotion: { select: { id: true, name: true, threshold: true, reduction: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, baseUnit: true, imageUrl: true } },
              batch: { select: { id: true, batchNo: true } },
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { orderId: id },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    if (!order) {
      throw createError({ statusCode: 404, message: '订单不存在' })
    }

    return {
      data: { ...order, paymentLogs: payments },
      error: null,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    return {
      data: null,
      error: { message: error.message || '获取订单失败', code: 'FETCH_ERROR' },
    }
  }
})
