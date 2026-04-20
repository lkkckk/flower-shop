import { signToken, verifyPassword } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string; scope?: 'admin' | 'pos' }>(event)
  const username = (body?.username || '').trim()
  const password = body?.password || ''
  const scope: 'admin' | 'pos' = body?.scope === 'pos' ? 'pos' : 'admin'

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

  // 作用域校验：
  // - scope=admin：仅 staff / admin 可登录（cashier 被拒）
  // - scope=pos  ：staff / admin / cashier 都可登录
  if (scope === 'admin' && user.role === 'cashier') {
    return {
      data: null,
      error: { message: '收银员账号请使用 POS 登录入口', code: 'WRONG_SCOPE' },
    }
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
