import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

/**
 * 库存大盘
 *
 * 返回：
 *   - skuCount        在售商品总数（status=active）
 *   - totalValue      库存货值 = Σ currentQty × costPrice (in_stock + discounted)
 *   - expiringCount   3 天内（含今日）到期且仍有库存的批次数
 *   - outOfStockCount 在售商品中，总在库 = 0 的品种数
 */
export default defineEventHandler(async () => {
  try {
    const expiringThreshold = dayjs().add(3, 'day').endOf('day').toDate()
    const now = new Date()

    const [skuCount, batches, productsAgg, productsTotal] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.stockBatch.findMany({
        where: { status: { in: ['in_stock', 'discounted'] } },
        select: { currentQty: true, costPrice: true, expiryDate: true },
      }),
      prisma.stockBatch.groupBy({
        by: ['productId'],
        where: { status: { in: ['in_stock', 'discounted'] } },
        _sum: { currentQty: true },
      }),
      prisma.product.findMany({
        where: { status: 'active' },
        select: { id: true },
      }),
    ])

    let totalValue = 0
    let expiringCount = 0
    for (const b of batches) {
      const qty = b.currentQty ?? 0
      const price = b.costPrice ?? 0
      totalValue += qty * price
      if (qty > 0 && b.expiryDate && b.expiryDate >= now && b.expiryDate <= expiringThreshold) {
        expiringCount += 1
      }
    }

    const stockMap = new Map<number, number>()
    for (const a of productsAgg) {
      stockMap.set(a.productId, a._sum.currentQty ?? 0)
    }
    let outOfStockCount = 0
    for (const p of productsTotal) {
      if ((stockMap.get(p.id) ?? 0) <= 0) outOfStockCount += 1
    }

    return {
      data: {
        skuCount,
        totalValue,
        expiringCount,
        outOfStockCount,
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取库存大盘失败', code: 'FETCH_ERROR' },
    }
  }
})
