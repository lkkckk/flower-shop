import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: '无效的订单 ID' })
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
      throw createError({ statusCode: 404, message: '订单不存在' })
    }

    return {
      data: order,
      error: null
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    return {
      data: null,
      error: { message: error.message || '获取订单失败', code: 'FETCH_ERROR' }
    }
  }
})
