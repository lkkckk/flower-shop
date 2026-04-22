import { prisma } from '../../utils/prisma'
import { getCurrentUser, hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role !== 'admin') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '仅管理员可操作', code: 'FORBIDDEN' } }
  }

  const body = await readBody(event)
  const { username, name, role, password } = body || {}

  if (!username?.trim() || !name?.trim() || !password?.trim()) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '用户名、姓名、密码不能为空', code: 'VALIDATION_ERROR' } }
  }
  if (!['staff', 'cashier'].includes(role)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '角色无效', code: 'VALIDATION_ERROR' } }
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { username: username.trim(), name: name.trim(), role, passwordHash, status: 'active' },
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true },
  })

  return { data: user, error: null }
})
