import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  try {
    // Step 1: 按 productId 聚合该客户的 OrderItem
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { customerId: id },
      },
      _sum: {
        baseQty: true,
        subtotal: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 10,
    })

    if (grouped.length === 0) {
      return { data: [], error: null }
    }

    // Step 2: 获取商品详情
    const productIds = grouped.map((g) => g.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, baseUnit: true, grade: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Step 3: 合并结果
    const favorites = grouped.map((g) => {
      const product = productMap.get(g.productId)
      return {
        productId: g.productId,
        productName: product?.name || `#${g.productId}`,
        baseUnit: product?.baseUnit || '',
        grade: product?.grade || null,
        totalQty: g._sum.baseQty || 0,
        totalAmount: g._sum.subtotal || 0,
        orderCount: g._count.id || 0,
      }
    })

    return { data: favorites, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '获取常购花材失败', code: 'FAVORITES_ERROR' },
    }
  }
})
