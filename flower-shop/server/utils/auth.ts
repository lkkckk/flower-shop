import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export type TokenType = 'staff' | 'customer'

export interface TokenPayload {
  sub: number
  type: TokenType
  role?: string // staff | admin（仅 type=staff 有效）
}

const TOKEN_EXPIRES_IN = '7d'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET 未配置或长度不足 16 字符，请检查 .env')
  }
  return secret
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_EXPIRES_IN })
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload
  } catch {
    return null
  }
}

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, 10)
}

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash)
}

/**
 * 从 H3 event 中读取已解析的当前用户（由 auth 中间件注入）
 * 返回 null 表示未登录或鉴权失败
 */
export const getCurrentUser = (event: any): TokenPayload | null => {
  return event?.context?.user ?? null
}

/**
 * 要求当前请求为员工身份，否则抛出 401/403
 */
export const requireStaff = (event: any): TokenPayload => {
  const user = getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  if (user.type !== 'staff') {
    throw createError({ statusCode: 403, statusMessage: '需要员工权限' })
  }
  return user
}

/**
 * 要求当前请求为顾客身份
 */
export const requireCustomer = (event: any): TokenPayload => {
  const user = getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  if (user.type !== 'customer') {
    throw createError({ statusCode: 403, statusMessage: '需要顾客身份' })
  }
  return user
}
