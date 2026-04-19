import { getRequestURL, getHeader } from 'h3'
import { verifyToken } from '../utils/auth'

/**
 * 全局鉴权中间件：
 * - 解析 Authorization: Bearer <token> → event.context.user
 * - 对白名单路径不强制要求登录
 * - 其余 /api/** 路径若无有效 token → 401
 * - 非 /api 的前端页面请求放行（由前端路由守卫处理）
 */

// 精确路径匹配（无参数）
const EXACT_PUBLIC = new Set<string>([
  '/api/health',
  '/api/auth/login',
  '/api/auth/wx-login',
])

// 前缀匹配（公开资源）
const PREFIX_PUBLIC: string[] = [
  '/api/public/',
]

const isPublicPath = (path: string): boolean => {
  if (EXACT_PUBLIC.has(path)) return true
  return PREFIX_PUBLIC.some((p) => path.startsWith(p))
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // 非 API 请求直接放行（前端 SSR/静态资源）
  if (!path.startsWith('/api/')) return

  // 预检请求放行（CORS 由 nitro routeRules 处理）
  if (event.method === 'OPTIONS') return

  // 读取 token
  const auth = getHeader(event, 'authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const payload = token ? verifyToken(token) : null

  if (payload) {
    event.context.user = payload
  }

  // 白名单直接通过（已附加 user 信息则透传）
  if (isPublicPath(path)) return

  // 非白名单要求已登录
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { message: '未登录或凭证已过期', code: 'UNAUTHORIZED' },
    })
  }
})
