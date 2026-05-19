import { getHeader, getRequestIP } from 'h3'
import { signToken, verifyPassword } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

// 进程内简单限流：每 IP 每 15 分钟最多 10 次失败尝试
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
type Bucket = { failed: number; resetAt: number }
const buckets: Map<string, Bucket> = (globalThis as any).__loginRateLimit
  ?? ((globalThis as any).__loginRateLimit = new Map<string, Bucket>())

function getClientKey(event: any) {
  const xff = getHeader(event, 'x-forwarded-for')
  return (xff?.split(',')[0]?.trim()) || getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

function readBucket(key: string): Bucket {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    const fresh = { failed: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, fresh)
    return fresh
  }
  return b
}

export default defineEventHandler(async (event) => {
  const clientKey = getClientKey(event)
  const bucket = readBucket(clientKey)
  if (bucket.failed >= MAX_FAILS) {
    return {
      data: null,
      error: {
        message: '登录失败次数过多，请稍后再试',
        code: 'RATE_LIMITED',
        retryAfterSec: Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
      },
    }
  }

  const body = await readBody<{ username?: string; password?: string; scope?: 'admin' | 'pos' }>(event)
  const username = (body?.username || '').trim()
  const password = body?.password || ''

  if (!username || !password) {
    return { data: null, error: { message: '用户名和密码不能为空', code: 'BAD_PARAMS' } }
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    bucket.failed += 1
    return { data: null, error: { message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' } }
  }
  if (user.status !== 'active') {
    return { data: null, error: { message: '账号已被停用', code: 'USER_DISABLED' } }
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    bucket.failed += 1
    return { data: null, error: { message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' } }
  }

  // 登录成功，重置该 IP 的失败计数
  buckets.delete(clientKey)

  const token = signToken({ sub: user.id, type: 'staff', role: user.role })

  return {
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    },
    error: null,
  }
})
