import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const body = await readBody(event)
  const { name, parentId, sort } = body || {}

  if (!name?.trim()) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '分类名称不能为空', code: 'VALIDATION_ERROR' } }
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      parentId: parentId ? Number(parentId) : null,
      sort: sort ? Number(sort) : 0,
    },
  })

  return { data: category, error: null }
})
