import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的订单 id' })

  const body = await readBody(event)

  const existing = await prisma.order.findUnique({ where: { id } })
  if (!existing || existing.orderType !== 'preorder') {
    throw createError({ statusCode: 404, message: '预售单不存在' })
  }

  const order = await prisma.order.update({
    where: { id },
    data: { isMade: Boolean(body?.isMade) },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  })

  return { data: order, error: null }
})
