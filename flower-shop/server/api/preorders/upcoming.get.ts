import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'
import { computeReminderStage, daysUntil } from '../../../shared/preorderReminder'

/**
 * 首页/工作台"即将履约预售"卡片数据源。
 *
 * 返回未来 `days` 天内（默认 7 天）且未完成/未取消的预售单，按履约日期升序。
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days) || 7

  const start = dayjs().startOf('day').toDate()
  const end = dayjs().add(days, 'day').endOf('day').toDate()

  try {
    const list = await prisma.order.findMany({
      where: {
        orderType: 'preorder',
        status: { notIn: ['completed', 'cancelled'] },
        deliveryTime: { gte: start, lte: end },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { deliveryTime: 'asc' },
    })

    const now = new Date()
    return {
      data: list.map((o) => ({
        ...o,
        reminderStage: computeReminderStage(o.deliveryTime, now),
        daysUntil: daysUntil(o.deliveryTime, now),
      })),
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取即将履约预售单失败', code: 'FETCH_ERROR' },
    }
  }
})
