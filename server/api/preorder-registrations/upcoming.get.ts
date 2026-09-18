import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'
import { getQuery, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days) || 7
  const now = dayjs().startOf('day').toDate()
  const end = dayjs().add(days, 'day').endOf('day').toDate()

  try {
    const list = await prisma.preorderRegistration.findMany({
      where: {
        trashedAt: null,
        deliveryTime: {
          gte: now,
          lte: end,
        },
      },
      include: {
        items: {
          orderBy: { sort: 'asc' },
          include: {
            photos: { orderBy: { sort: 'asc' } },
          },
        },
      },
      orderBy: { deliveryTime: 'asc' },
      take: 20,
    })

    const formatted = list.map(item => {
      const target = item.deliveryTime ? dayjs(item.deliveryTime).startOf('day') : null
      const today = dayjs().startOf('day')
      const daysUntil = target ? target.diff(today, 'day') : null
      const summary = item.items.map(i => `${i.name} × ${Number(i.qty)}`).join('，')
      const firstPhoto = item.items.flatMap(i => i.photos.map(p => p.url))[0] || null
      return {
        id: item.id,
        orderNo: item.orderNo,
        contactPhone: item.contactPhone,
        deliveryTime: item.deliveryTime,
        daysUntil,
        summary,
        firstPhoto,
        itemCount: item.items.length,
      }
    })

    return { data: formatted, error: null }
  } catch (error: any) {
    return { data: [], error: { message: error.message } }
  }
})
