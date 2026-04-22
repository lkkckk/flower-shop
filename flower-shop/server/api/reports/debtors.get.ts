import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff') {
    setResponseStatus(event, 401)
    return { data: null, error: { message: '未登录', code: 'UNAUTHORIZED' } }
  }

  const customers = await prisma.customer.findMany({
    where: { totalOwed: { gt: 0 } },
    include: {
      orders: {
        where: { owedAmount: { gt: 0 }, status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        include: {
          payments: {
            where: { type: 'income' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    orderBy: { totalOwed: 'desc' },
  })

  return {
    data: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: c.balance,
      totalOwed: c.totalOwed,
      orders: c.orders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        owedAmount: o.owedAmount,
        createdAt: o.createdAt,
        payments: o.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt,
        })),
      })),
    })),
    error: null,
  }
})
