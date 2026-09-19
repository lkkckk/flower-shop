import { prisma } from '../../utils/prisma'
import { getRouterParam, createError, defineEventHandler } from 'h3'
import { serializeRegistration } from '../../utils/preorderRegistrationAmounts'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的登记 ID' })

  const registration = await prisma.preorderRegistration.findUnique({
    where: { id },
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
  })

  if (!registration) {
    throw createError({ statusCode: 404, message: '预售登记不存在' })
  }

  return {
    data: serializeRegistration(registration),
    error: null,
  }
})
