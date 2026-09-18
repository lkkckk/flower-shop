import { prisma } from '../../../utils/prisma'
import { requireStaff } from '../../../utils/auth'
import { audit } from '../../../utils/businessTransaction'
import { getRouterParam, createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const actor = requireStaff(event)
  if (actor.role !== 'admin') {
    throw createError({ statusCode: 403, message: '只有管理员可恢复历史预售' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的订单 ID' })

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.orderType !== 'preorder') {
    throw createError({ statusCode: 404, message: '历史预售单不存在' })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      trashedAt: null,
      trashedById: null,
    },
  })

  await audit(prisma, actor.sub, 'preorder.restore', 'Order', id, {
    orderNo: order.orderNo,
  })

  return { data: { success: true, id: updated.id }, error: null }
})
