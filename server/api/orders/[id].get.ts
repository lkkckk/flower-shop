import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    return { data: null, error: { message: '无效的订单 ID', code: 'INVALID_PARAMS' } }
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return { data: null, error: { message: '订单不存在', code: 'NOT_FOUND' } }
    }

    return {
      data: order,
      error: null
    }

  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取订单失败', code: 'FETCH_ERROR' }
    }
  }
})
