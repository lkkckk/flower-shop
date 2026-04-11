import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const customerId = query.customerId ? Number(query.customerId) : undefined
  const status = query.status as string | undefined
  const startDate = query.startDate ? dayjs(query.startDate as string).startOf('day').toDate() : undefined
  const endDate = query.endDate ? dayjs(query.endDate as string).endOf('day').toDate() : undefined

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (status) where.status = status
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  try {
    const [list, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, level: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ])

    return {
      data: { list, total, page, pageSize },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取订单列表失败', code: 'FETCH_ERROR' },
    }
  }
})
