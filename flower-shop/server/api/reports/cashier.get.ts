import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff') {
    setResponseStatus(event, 401)
    return { data: null, error: { message: '未登录', code: 'UNAUTHORIZED' } }
  }

  const query = getQuery(event)
  const startDate = query.startDate as string
  const endDate = query.endDate as string
  const cashierId = query.cashierId ? Number(query.cashierId) : undefined

  const dateWhere: any = {}
  if (startDate) dateWhere.gte = new Date(startDate)
  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    dateWhere.lte = end
  }

  const orderWhere: any = { status: { not: 'cancelled' } }
  if (Object.keys(dateWhere).length) orderWhere.createdAt = dateWhere
  if (cashierId) orderWhere.cashierId = cashierId

  // 汇总每个收银员的订单
  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: {
      id: true,
      totalAmount: true,
      paidAmount: true,
      owedAmount: true,
      cashierId: true,
      cashier: { select: { id: true, name: true, username: true, role: true } },
      payments: { select: { amount: true, paymentMethod: true } },
    },
  })

  // 按收银员分组
  const map = new Map<number, any>()
  for (const o of orders) {
    const cid = o.cashierId ?? 0
    if (!map.has(cid)) {
      map.set(cid, {
        cashierId: cid,
        cashierName: o.cashier?.name || (cid === 0 ? '未记录' : `用户${cid}`),
        cashierUsername: o.cashier?.username || '',
        orderCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalOwed: 0,
        paymentBreakdown: {} as Record<string, number>,
      })
    }
    const row = map.get(cid)!
    row.orderCount++
    row.totalSales += o.totalAmount
    row.totalPaid += o.paidAmount
    row.totalOwed += o.owedAmount
    for (const p of o.payments) {
      row.paymentBreakdown[p.paymentMethod] = (row.paymentBreakdown[p.paymentMethod] || 0) + p.amount
    }
  }

  const result = Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales)

  return { data: result, error: null }
})
