import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              select: {
                id: true,
                productId: true,
                qty: true,
                unit: true,
                unitPrice: true,
                subtotal: true,
              },
            },
          },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      setResponseStatus(event, 404)
      return { data: null, error: { message: '客户不存在', code: 'NOT_FOUND' } }
    }

    return { data: customer, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取客户详情失败', code: 'FETCH_ERROR' },
    }
  }
})
