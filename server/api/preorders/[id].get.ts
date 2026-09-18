import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { computeReminderStage, daysUntil } from '../../../shared/preorderReminder'

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, 'id')
  const id = Number(rawId)
  if (!id || !/^\d+$/.test(rawId || '')) throw createError({ statusCode: 404, message: '预售单不存在' })

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, baseUnit: true, grade: true, color: true, specification: true },
            },
            batch: { select: { id: true, batchNo: true, inboundDate: true } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!order || order.orderType !== 'preorder') {
      throw createError({ statusCode: 404, message: '预售单不存在' })
    }

    const stage = computeReminderStage(order.deliveryTime)
    const days = daysUntil(order.deliveryTime)

    return {
      data: { ...order, reminderStage: stage, daysUntil: days },
      error: null,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    return {
      data: null,
      error: { message: error.message || '获取预售单失败', code: 'FETCH_ERROR' },
    }
  }
})
