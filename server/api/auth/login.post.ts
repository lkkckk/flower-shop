import { signToken, verifyPassword } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string; scope?: 'admin' | 'pos' }>(event)
  const username = (body?.username || '').trim()
  const password = body?.password || ''

  if (!username || !password) {
    return { data: null, error: { message: '用户名和密码不能为空', code: 'BAD_PARAMS' } }
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return { data: null, error: { message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' } }
  }
  if (user.status !== 'active') {
    return { data: null, error: { message: '账号已被停用', code: 'USER_DISABLED' } }
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    return { data: null, error: { message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' } }
  }

  const token = signToken({ sub: user.id, type: 'staff', role: user.role })

  return {
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    },
    error: null,
  }
})
