import { getCurrentUser } from './auth'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const stripWholesalePrice = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripWholesalePrice(item)) as T
  }

  if (!isPlainObject(value)) {
    return value
  }

  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === 'wholesalePrice') continue
    next[key] = stripWholesalePrice(child)
  }

  return next as T
}

export const isCashierRequest = (event: any): boolean => {
  const user = getCurrentUser(event)
  return user?.type === 'staff' && user.role === 'cashier'
}

export const hideWholesalePriceForCashier = <T>(event: any, value: T): T => {
  return isCashierRequest(event) ? stripWholesalePrice(value) : value
}
