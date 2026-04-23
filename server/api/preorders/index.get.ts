import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'
import { computeReminderStage } from '../../../shared/preorderReminder'

/**
 * 预售单列表
 *
 * 查询参数：
 *   - page, pageSize
 *   - status         预售状态（pending_confirm | booked | ...）
 *   - deliveryStart  履约日期范围 YYYY-MM-DD
 *   - deliveryEnd
 *   - q              搜索关键字（客户姓名 / 客户电话 / 收货人姓名 / 收货人电话 / 订单号）
 *   - reminderStage  提醒阶段筛选（d7 | d3 | due | overdue）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const status = query.status as string | undefined
  const reminderStage = query.reminderStage as string | undefined
  const keyword = (query.q as string | undefined)?.trim()

  const deliveryStart = query.deliveryStart
    ? dayjs(query.deliveryStart as string).startOf('day').toDate()
    : undefined
  const deliveryEnd = query.deliveryEnd
    ? dayjs(query.deliveryEnd as string).endOf('day').toDate()
    : undefined

  const where: any = { orderType: 'preorder' }
  if (status) where.status = status
  if (deliveryStart || deliveryEnd) {
    where.deliveryTime = {}
    if (deliveryStart) where.deliveryTime.gte = deliveryStart
    if (deliveryEnd) where.deliveryTime.lte = deliveryEnd
  }
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { receiverName: { contains: keyword } },
      { receiverPhone: { contains: keyword } },
      { customer: { is: { name: { contains: keyword } } } },
      { customer: { is: { phone: { contains: keyword } } } },
    ]
  }

  try {
    const [rawList, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, level: true } },
          items: {
            select: {
              id: true,
              productId: true,
              qty: true,
              unit: true,
              subtotal: true,
              imageUrl: true,
              product: { select: { name: true, imageUrl: true } },
            },
          },
        },
        orderBy: [{ deliveryTime: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ])

    const now = new Date()
    const list = rawList.map((o) => {
      const stage = computeReminderStage(o.deliveryTime, now)
      // 惰性写回：stage 变化时更新，避免每次查询都写
      if (stage !== o.reminderStage) {
        prisma.order
          .update({
            where: { id: o.id },
            data: { reminderStage: stage, reminderUpdatedAt: now },
          })
          .catch(() => {})
      }
      return { ...o, reminderStage: stage }
    })

    const filtered = reminderStage
      ? list.filter((o) => o.reminderStage === reminderStage)
      : list

    return {
      data: { list: filtered, total, page, pageSize },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取预售单列表失败', code: 'FETCH_ERROR' },
    }
  }
})
