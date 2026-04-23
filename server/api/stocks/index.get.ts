import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  const isCashier = payload?.type === 'staff' && payload?.role === 'cashier'

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const view = (query.view as string) || 'by_batch'
  const productId = query.productId ? Number(query.productId) : undefined
  const status = query.status as string | undefined
  const expiringSoon = query.expiringSoon === 'true' || query.expiringSoon === '1'

  try {
    if (view === 'by_batch') {
      const where: any = {}
      if (productId) where.productId = productId
      if (status) where.status = status
      if (expiringSoon) {
        where.status = 'in_stock'
        where.currentQty = { gt: 0 }
        where.expiryDate = { lte: dayjs().add(3, 'day').endOf('day').toDate() }
      }

      const [list, total] = await Promise.all([
        prisma.stockBatch.findMany({
          where,
          include: { product: true },
          orderBy: { inboundDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.stockBatch.count({ where }),
      ])

      // 店员角色：隐藏进价
      const sanitized = isCashier
        ? list.map(({ costPrice: _c, ...rest }) => rest)
        : list

      return {
        data: { list: sanitized, total, page, pageSize },
        error: null,
      }
    }

    // view === 'by_product'
    const productWhere: any = {}
    if (productId) productWhere.id = productId

    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        stockBatches: {
          where: { status: 'in_stock', currentQty: { gt: 0 } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    let aggregated = products.map((p) => {
      const batches = p.stockBatches
      const totalStock = batches.reduce((sum, b) => sum + b.currentQty, 0)
      const batchCount = batches.length
      const earliestExpiry = batches.length > 0
        ? batches.reduce<Date | null>((min, b) => (min === null || b.expiryDate < min ? b.expiryDate : min), null)
        : null
      const { stockBatches, ...rest } = p
      return {
        ...rest,
        totalStock,
        batchCount,
        earliestExpiry,
      }
    })

    if (expiringSoon) {
      const threshold = dayjs().add(3, 'day').endOf('day').toDate()
      aggregated = aggregated.filter((p) => p.earliestExpiry !== null && p.earliestExpiry <= threshold && p.totalStock > 0)
    }

    const total = aggregated.length
    const list = aggregated.slice((page - 1) * pageSize, page * pageSize)

    return {
      data: { list, total, page, pageSize },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取库存失败', code: 'FETCH_ERROR' },
    }
  }
})
