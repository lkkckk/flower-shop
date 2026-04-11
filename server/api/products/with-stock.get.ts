import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = query.keyword as string | undefined
  const category = query.category as string | undefined

  const where: any = { status: 'active' }

  if (keyword) {
    where.name = { contains: keyword }
  }
  if (category) {
    where.category = category
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        unitConversions: true,
        stockBatches: {
          where: { status: 'in_stock', currentQty: { gt: 0 } },
          select: { currentQty: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 聚合库存
    const list = products.map((p) => {
      const totalStock = p.stockBatches.reduce((sum, batch) => sum + batch.currentQty, 0)
      const { stockBatches, ...rest } = p
      return {
        ...rest,
        totalStock,
      }
    })

    return {
      data: { list },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取带库存的商品失败', code: 'FETCH_ERROR' },
    }
  }
})
