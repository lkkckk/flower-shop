import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'
import { serializeRegistration } from '../../utils/preorderRegistrationAmounts'
import { getQuery, createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const keyword = (query.q as string | undefined)?.trim()
  const isTrash = query.trashed === 'true'

  const user = event.context.user
  if (isTrash && user?.role !== 'admin') {
    throw createError({ statusCode: 403, message: '只有管理员可查看回收站' })
  }

  const deliveryStart = query.deliveryStart
    ? dayjs(query.deliveryStart as string).startOf('day').toDate()
    : undefined
  const deliveryEnd = query.deliveryEnd
    ? dayjs(query.deliveryEnd as string).endOf('day').toDate()
    : undefined

  const where: any = {}

  if (isTrash) {
    where.trashedAt = { not: null }
  } else {
    where.trashedAt = null
  }

  if (deliveryStart || deliveryEnd) {
    where.deliveryTime = {}
    if (deliveryStart) where.deliveryTime.gte = deliveryStart
    if (deliveryEnd) where.deliveryTime.lte = deliveryEnd
  }

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: 'insensitive' } },
      { contactPhone: { contains: keyword } },
      { items: { some: { name: { contains: keyword, mode: 'insensitive' } } } },
    ]
  }

  try {
    const [rawList, total] = await Promise.all([
      prisma.preorderRegistration.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
          trashedBy: { select: { id: true, name: true, role: true } },
          items: {
            orderBy: { sort: 'asc' },
            include: {
              photos: { orderBy: { sort: 'asc' } },
            },
          },
        },
        orderBy: [
          { deliveryTime: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.preorderRegistration.count({ where }),
    ])

    const list = rawList.map(item => {
      const summary = item.items.map(i => `${i.name} × ${Number(i.qty)}`).join('，')
      const totalPhotos = item.items.reduce((acc, cur) => acc + cur.photos.length, 0)
      const previewPhotos = item.items.flatMap(i => i.photos.map(p => p.url)).slice(0, 4)
      return {
        ...serializeRegistration(item),
        summary,
        totalPhotos,
        previewPhotos,
      }
    })

    return {
      data: { list, total, page, pageSize },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取预售登记列表失败', code: 'FETCH_ERROR' },
    }
  }
})
