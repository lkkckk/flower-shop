import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const customerId = Number(query.customerId)
  if (!customerId) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '缺少 customerId 参数', code: 'INVALID_PARAMS' } }
  }

  const startDate = query.startDate
    ? dayjs(query.startDate as string).startOf('day').toDate()
    : dayjs().startOf('month').toDate()
  const endDate = query.endDate
    ? dayjs(query.endDate as string).endOf('day').toDate()
    : dayjs().endOf('month').toDate()

  try {
    const [customer, orders, payments, priorOrders, priorRepays] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),

      // 期间订单
      prisma.order.findMany({
        where: {
          customerId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              qty: true,
              unit: true,
              unitPrice: true,
              subtotal: true,
              product: { select: { name: true, baseUnit: true } },
            },
          },
        },
      }),

      // 期间还款流水（type=repay）
      prisma.payment.findMany({
        where: {
          customerId,
          type: 'repay',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 期初之前所有订单 owedAmount 之和
      prisma.order.aggregate({
        where: {
          customerId,
          createdAt: { lt: startDate },
        },
        _sum: { owedAmount: true },
      }),

      // 期初之前所有 repay 之和
      prisma.payment.aggregate({
        where: {
          customerId,
          type: 'repay',
          createdAt: { lt: startDate },
        },
        _sum: { amount: true },
      }),
    ])

    if (!customer) {
      setResponseStatus(event, 404)
      return { data: null, error: { message: '客户不存在', code: 'NOT_FOUND' } }
    }

    const openingBalance =
      (priorOrders._sum.owedAmount || 0) - (priorRepays._sum.amount || 0)

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0)
    const totalOwed = orders.reduce((sum, o) => sum + o.owedAmount, 0)
    const totalRepay = payments.reduce((sum, p) => sum + p.amount, 0)
    const closingBalance = openingBalance + totalOwed - totalRepay

    return {
      data: {
        customer,
        startDate,
        endDate,
        openingBalance,
        orders,
        payments,
        summary: {
          totalSales,
          totalPaid,
          totalOwed,
          totalRepay,
          closingBalance,
        },
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '生成对账单失败', code: 'STATEMENT_ERROR' },
    }
  }
})
