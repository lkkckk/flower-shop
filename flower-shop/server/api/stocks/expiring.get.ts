import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  try {
    const now = dayjs()
    const todayStart = now.startOf('day').toDate()
    const threshold = now.add(3, 'day').endOf('day').toDate()

    // 临期：未过期但 ≤3天到期，仍在库
    const expiring = await prisma.stockBatch.findMany({
      where: {
        status: 'in_stock',
        currentQty: { gt: 0 },
        expiryDate: { gte: todayStart, lte: threshold },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    })

    // 已过期：expiryDate < 今天起点，且仍在库
    const expired = await prisma.stockBatch.findMany({
      where: {
        status: 'in_stock',
        currentQty: { gt: 0 },
        expiryDate: { lt: todayStart },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    })

    return {
      data: { expiring, expired },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取临期批次失败', code: 'FETCH_ERROR' },
    }
  }
})
