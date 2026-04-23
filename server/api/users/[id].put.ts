import { prisma } from '../../utils/prisma'
import { getCurrentUser, hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role !== 'admin') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '仅管理员可操作', code: 'FORBIDDEN' } }
  }

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { name, role, status, password } = body || {}

  const updateData: any = {}
  if (name?.trim()) updateData.name = name.trim()
  if (role && ['staff', 'cashier'].includes(role)) updateData.role = role
  if (status && ['active', 'inactive'].includes(status)) updateData.status = status
  if (password?.trim()) {
    updateData.passwordHash = await hashPassword(password.trim())
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true },
  })

  return { data: user, error: null }
})
