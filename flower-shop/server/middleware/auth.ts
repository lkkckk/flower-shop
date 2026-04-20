import { getRequestURL, getHeader } from 'h3'
import { verifyToken } from '../utils/auth'

/**
 * 全局鉴权中间件：
 * - 解析 Authorization: Bearer <token> → event.context.user
 * - 对白名单路径不强制要求登录
 * - 其余 /api/** 路径若无有效 token → 401
 * - 非 /api 的前端页面请求放行（由前端路由守卫处理）
 * - cashier 角色仅允许访问 POS 所需路径，其余 /api/* → 403
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

/**
 * 收银员（cashier）角色被允许访问的路径前缀
 * 仅 POS 所需：下单、商品列表（含库存）、客户搜索、盘点、促销查询、认证自查、低库存 settings
 */
const CASHIER_PREFIX_ALLOW: string[] = [
  '/api/auth/',
  '/api/orders',
  '/api/products/with-stock',
  '/api/customers/search',
  '/api/stocks/stocktake',
  '/api/promotions',
  '/api/settings', // 允许读 lowStockThreshold；写操作由 API 内部角色校验
]

const isPublicPath = (path: string): boolean => {
  if (EXACT_PUBLIC.has(path)) return true
  return PREFIX_PUBLIC.some((p) => path.startsWith(p))
}

const isCashierAllowed = (path: string): boolean => {
  return CASHIER_PREFIX_ALLOW.some((p) => path === p || path.startsWith(p))
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

  // cashier 角色路径限制
  if (payload.type === 'staff' && payload.role === 'cashier' && !isCashierAllowed(path)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: { message: '当前角色无权访问该资源', code: 'ROLE_FORBIDDEN' },
    })
  }
})
