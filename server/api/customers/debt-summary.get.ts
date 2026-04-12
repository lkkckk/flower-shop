import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  try {
    const customers = await prisma.customer.findMany({
      where: { balance: { lt: 0 } },
      orderBy: { balance: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        level: true,
        balance: true,
        totalOwed: true,
      },
    })

    return {
      data: { list: customers, total: customers.length },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取欠款汇总失败', code: 'DEBT_SUMMARY_ERROR' },
    }
  }
})
