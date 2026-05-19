import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

/**
 * 采购建议
 *
 * 算法（最小可用版）：
 *   建议库存 = 近 7 天总销量 / 7 × 安全库存天数 N（来自 Setting.safetyStockDays，默认 5）
 *   缺口     = 建议库存 - 当前在库
 *   仅返回缺口 > 0 的活跃商品，按缺口降序
 */
export default defineEventHandler(async () => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'safetyStockDays' } })
    const safetyDays = Math.max(1, Number(setting?.value) || 5)

    const since = dayjs().subtract(7, 'day').startOf('day').toDate()

    const [activeProducts, sales, stockAgg] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, baseUnit: true, grade: true, imageUrl: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { createdAt: { gte: since }, status: { not: 'cancelled' } },
        },
        _sum: { baseQty: true },
      }),
      prisma.stockBatch.groupBy({
        by: ['productId'],
        where: { status: { in: ['in_stock', 'discounted'] } },
        _sum: { currentQty: true },
      }),
    ])

    const salesMap = new Map<number, number>()
    for (const r of sales) salesMap.set(r.productId, r._sum.baseQty ?? 0)
    const stockMap = new Map<number, number>()
    for (const r of stockAgg) stockMap.set(r.productId, r._sum.currentQty ?? 0)

    const suggestions = activeProducts
      .map((p) => {
        const weeklySales = salesMap.get(p.id) ?? 0
        const dailyAvg = weeklySales / 7
        const suggestedStock = Math.ceil(dailyAvg * safetyDays)
        const currentStock = stockMap.get(p.id) ?? 0
        const gap = Math.max(0, suggestedStock - Math.floor(currentStock))
        return {
          productId: p.id,
          productName: p.name,
          baseUnit: p.baseUnit,
          grade: p.grade,
          imageUrl: p.imageUrl,
          weeklySales,
          dailyAvg: Number(dailyAvg.toFixed(2)),
          currentStock,
          suggestedStock,
          gap,
        }
      })
      .filter((row) => row.gap > 0)
      .sort((a, b) => b.gap - a.gap)

    return {
      data: { list: suggestions, safetyDays },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取采购建议失败', code: 'FETCH_ERROR' },
    }
  }
})
