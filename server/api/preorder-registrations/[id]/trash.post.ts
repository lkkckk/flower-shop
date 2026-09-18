import { prisma } from '../../../utils/prisma'
import { requireStaff } from '../../../utils/auth'
import { audit } from '../../../utils/businessTransaction'
import { getRouterParam, createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const actor = requireStaff(event)
  if (actor.role !== 'admin') {
    throw createError({ statusCode: 403, message: '只有管理员可将预售登记移入回收站' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的登记 ID' })

  const registration = await prisma.preorderRegistration.findUnique({ where: { id } })
  if (!registration) {
    throw createError({ statusCode: 404, message: '预售登记不存在' })
  }

  const updated = await prisma.preorderRegistration.update({
    where: { id },
    data: {
      trashedAt: new Date(),
      trashedById: actor.sub,
    },
  })

  await audit(prisma, actor.sub, 'preorder_registration.trash', 'PreorderRegistration', id, {
    orderNo: registration.orderNo,
  })

  return { data: { success: true, id: updated.id, trashedAt: updated.trashedAt }, error: null }
})
