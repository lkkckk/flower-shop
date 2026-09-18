import { getRequestURL, getHeader, getCookie } from 'h3'
import { verifyToken } from '../utils/auth'
import { prisma } from '../utils/prisma'
import { can, routeAction } from '../../shared/permissions'

export default defineEventHandler(async event => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || event.method === 'OPTIONS') return
  if (['/api/health', '/api/auth/login', '/api/auth/wx-login'].includes(path) || (event.method === 'GET' && path.startsWith('/api/public/'))) return
  const header = getHeader(event, 'authorization') || ''
  const rawToken = header.startsWith('Bearer ') ? header.slice(7) : (getCookie(event, 'auth_token') || '')
  const payload = verifyToken(rawToken)
  if (!payload) throw createError({ statusCode: 401, message: '登录已过期' })
  if (payload.type !== 'staff') {
    if (path === '/api/auth/me') { event.context.user = payload; return }
    throw createError({ statusCode: 403, message: '需要员工权限' })
  }
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } })
  if (!user || user.status !== 'active') throw createError({ statusCode: 401, message: '账号已停用' })
  event.context.user = { ...payload, role: user.role }
  if (path === '/api/auth/me') return
  const action = routeAction(event.method, path)
  if (!action) throw createError({ statusCode: 404, message: '接口不存在' })
  if (!can(user.role, action)) throw createError({ statusCode: 403, message: '当前角色无权执行此操作' })
})
