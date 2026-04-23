import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role !== 'admin') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '仅管理员可操作', code: 'FORBIDDEN' } }
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return { data: users, error: null }
})
