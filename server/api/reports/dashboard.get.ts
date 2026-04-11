import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const startDate = query.startDate
    ? dayjs(query.startDate as string).startOf('day').toDate()
    : dayjs().startOf('day').toDate()
  const endDate = query.endDate
    ? dayjs(query.endDate as string).endOf('day').toDate()
    : dayjs().endOf('day').toDate()

  try {
    // 一次性拉取期间订单 + items + batch（用于成本/毛利）
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: {
            batch: { select: { costPrice: true } },
            product: { select: { id: true, name: true, baseUnit: true } },
          },
        },
      },
    })

    // 支付流水（用于按方式分组）
    const payments = await prisma.payment.findMany({
      where: {
        type: 'income',
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    // ===== 核心汇总 =====
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const orderCount = orders.length
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0)
    const totalOwed = orders.reduce((sum, o) => sum + o.owedAmount, 0)

    let totalCost = 0
    // 商品聚合
    const productMap = new Map<number, { productId: number; productName: string; baseUnit: string; qty: number; amount: number; profit: number }>()

    for (const order of orders) {
      for (const item of order.items) {
        const itemCost = (item.batch?.costPrice || 0) * item.baseQty
        totalCost += itemCost
        const profit = item.subtotal - itemCost

        const pid = item.productId
        const existing = productMap.get(pid)
        if (existing) {
          existing.qty += item.baseQty
          existing.amount += item.subtotal
          existing.profit += profit
        } else {
          productMap.set(pid, {
            productId: pid,
            productName: item.product?.name || `#${pid}`,
            baseUnit: item.product?.baseUnit || '',
            qty: item.baseQty,
            amount: item.subtotal,
            profit,
          })
        }
      }
    }

    const grossProfit = totalSales - totalCost
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0

    // ===== 畅销榜 TOP 10 =====
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // ===== 支付方式分组 =====
    const methodMap = new Map<string, { method: string; count: number; amount: number }>()
    for (const p of payments) {
      const m = p.paymentMethod || 'unknown'
      const existing = methodMap.get(m)
      if (existing) {
        existing.count += 1
        existing.amount += p.amount
      } else {
        methodMap.set(m, { method: m, count: 1, amount: p.amount })
      }
    }
    const paymentMethods = Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount)

    // ===== 每日趋势 =====
    const dayMap = new Map<string, { date: string; amount: number; orderCount: number; cost: number }>()
    for (const order of orders) {
      const d = dayjs(order.createdAt).format('YYYY-MM-DD')
      const existing = dayMap.get(d)
      const orderCost = order.items.reduce((s, i) => s + (i.batch?.costPrice || 0) * i.baseQty, 0)
      if (existing) {
        existing.amount += order.totalAmount
        existing.orderCount += 1
        existing.cost += orderCost
      } else {
        dayMap.set(d, { date: d, amount: order.totalAmount, orderCount: 1, cost: orderCost })
      }
    }

    // 填充空日期
    const dailyTrend: Array<{ date: string; amount: number; orderCount: number; profit: number }> = []
    let cursor = dayjs(startDate).startOf('day')
    const finalDay = dayjs(endDate).startOf('day')
    const maxDays = 90
    let i = 0
    while (cursor.valueOf() <= finalDay.valueOf() && i < maxDays) {
      const key = cursor.format('YYYY-MM-DD')
      const entry = dayMap.get(key)
      dailyTrend.push({
        date: key,
        amount: entry?.amount || 0,
        orderCount: entry?.orderCount || 0,
        profit: entry ? entry.amount - entry.cost : 0,
      })
      cursor = cursor.add(1, 'day')
      i++
    }

    // ===== 滞销商品：近 7 天销售 < 5 单的在售商品 =====
    let slowProducts: Array<{ productId: number; productName: string; lastSoldAt: Date | null; currentStock: number; soldCount: number }> = []
    try {
      const sevenDaysAgo = dayjs().subtract(7, 'day').startOf('day').toDate()
      const activeProducts = await prisma.product.findMany({
        where: { status: 'active' },
        include: {
          stockBatches: {
            where: { status: 'in_stock', currentQty: { gt: 0 } },
            select: { currentQty: true },
          },
          orderItems: {
            where: { order: { createdAt: { gte: sevenDaysAgo } } },
            select: { id: true, order: { select: { createdAt: true } } },
          },
        },
      })

      slowProducts = activeProducts
        .map((p) => {
          const soldCount = p.orderItems.length
          const currentStock = p.stockBatches.reduce((s, b) => s + b.currentQty, 0)
          const lastSoldAt = p.orderItems.length > 0
            ? p.orderItems.reduce<Date | null>((latest, oi) => {
                const d = oi.order?.createdAt
                if (!d) return latest
                if (!latest || d > latest) return d
                return latest
              }, null)
            : null
          return {
            productId: p.id,
            productName: p.name,
            lastSoldAt,
            currentStock,
            soldCount,
          }
        })
        .filter((p) => p.soldCount < 5 && p.currentStock > 0)
        .sort((a, b) => a.soldCount - b.soldCount)
        .slice(0, 20)
    } catch (e) {
      slowProducts = []
    }

    return {
      data: {
        startDate,
        endDate,
        summary: {
          totalSales,
          orderCount,
          avgOrderValue,
          totalCost,
          grossProfit,
          grossMargin,
          totalPaid,
          totalOwed,
        },
        paymentMethods,
        topProducts,
        slowProducts,
        dailyTrend,
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取报表失败', code: 'REPORT_ERROR' },
    }
  }
})
