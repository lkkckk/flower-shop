import { prisma } from '../../../utils/prisma'

/**
 * 盘点汇总 + 低库存汇总
 * 返回：
 *   {
 *     items: [{ id, name, baseUnit, totalStock, threshold, isLow, oldestExpiry }],
 *     lowStockCount: number,
 *     threshold: number
 *   }
 */
export default defineEventHandler(async () => {
  try {
    const [setting, products] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'lowStockThreshold' } }),
      prisma.product.findMany({
        where: { status: 'active' },
        include: {
          stockBatches: {
            where: { status: 'in_stock', currentQty: { gt: 0 } },
            select: { currentQty: true, expiryDate: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ])

    const threshold = Number(setting?.value ?? 20) || 20

    const items = products.map((p) => {
      const totalStock = p.stockBatches.reduce((s, b) => s + b.currentQty, 0)
      const oldestExpiry = p.stockBatches.reduce<Date | null>((min, b) => {
        if (!min) return b.expiryDate
        return b.expiryDate < min ? b.expiryDate : min
      }, null)
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        baseUnit: p.baseUnit,
        specification: p.specification,
        imageUrl: p.imageUrl,
        totalStock,
        threshold,
        isLow: totalStock < threshold,
        oldestExpiry,
      }
    })

    const lowStockCount = items.filter((it) => it.isLow).length

    return { data: { items, lowStockCount, threshold }, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '获取盘点数据失败', code: 'FETCH_ERROR' } }
  }
})
