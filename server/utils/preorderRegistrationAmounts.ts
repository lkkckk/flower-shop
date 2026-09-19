import { createError } from 'h3'
import { parseRegistrationAmount } from '../../shared/preorderMoney'

export function validateRegistrationAmount(value: unknown, index: number): string {
  try {
    return parseRegistrationAmount(value)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: `第 ${index + 1} 项商品：${error.message}` })
  }
}

/** Prisma Decimal JSON drops trailing zeros; keep the registration API fixed-point. */
export function serializeRegistration<T extends { items: Array<{ amount?: unknown }> }>(registration: T) {
  return {
    ...registration,
    items: registration.items.map(item => ({ ...item, amount: item.amount == null ? null : parseRegistrationAmount(String(item.amount)) })),
  }
}
