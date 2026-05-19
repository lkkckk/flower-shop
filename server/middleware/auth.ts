import { getRequestURL, getHeader } from 'h3'
import { verifyToken } from '../utils/auth'

/**
 * 全局鉴权中间件：
 * - 解析 Authorization: Bearer <token> → event.context.user
 * - 公开路径（白名单）无需登录
 * - 其余 /api/** 路径若无有效 token → 401
 * - 非 /api 的前端页面请求放行（由前端路由守卫处理）
 * - cashier 角色：仅允许访问 POS 所需路径，其余 → 403
 * - customer 类型 token（微信小程序顾客）：仅允许访问明确白名单，其余 → 403
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
  '/api/stocks/inbound',   // 允许店员录入库存
  '/api/stocks',           // 允许店员查看库存（costPrice 字段由 API 内部过滤）
  '/api/promotions',
  '/api/settings',         // 允许读 lowStockThreshold；写操作由 API 内部角色校验
]

/**
 * 顾客（customer，微信小程序登录后的用户）允许访问的路径前缀
 * 当前最严策略：仅自查身份 + 公开商品（公开商品另由 PREFIX_PUBLIC 处理）
 * 未来如需开放查询自己的订单 / 收藏，需在此显式加白名单 + API 内部校验 customerId === user.sub
 */
const CUSTOMER_PREFIX_ALLOW: string[] = [
  '/api/auth/me',
]

const isPublicPath = (path: string): boolean => {
  if (EXACT_PUBLIC.has(path)) return true
  return PREFIX_PUBLIC.some((p) => path.startsWith(p))
}

const isCashierAllowed = (path: string): boolean => {
  return CASHIER_PREFIX_ALLOW.some((p) => path === p || path.startsWith(p))
}

const isCustomerAllowed = (path: string): boolean => {
  return CUSTOMER_PREFIX_ALLOW.some((p) => path === p || path.startsWith(p))
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

  // customer 类型 token：白名单制
  if (payload.type === 'customer' && !isCustomerAllowed(path)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: { message: '当前账号无权访问该资源', code: 'ROLE_FORBIDDEN' },
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
