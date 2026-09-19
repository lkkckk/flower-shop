import { decimal, sumMoney } from './money'

/** Amount is the whole line subtotal, never a unit price. */
export function parseRegistrationAmount(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
    throw new Error('金额必填，必须为非负数且最多保留两位小数')
  }
  const amount = decimal(String(value).trim())
  if (amount.isNegative() || amount.gt('9999999999.99')) throw new Error('金额必须在 0 至 9999999999.99 元之间')
  return amount.toFixed(2)
}

/** A missing historical line means the entire total is unknown. */
export function sumRegistrationAmounts(items: ReadonlyArray<{ amount?: unknown }>): string | null {
  if (items.some(item => item.amount === null || item.amount === undefined || item.amount === '')) return null
  return sumMoney(items.map(item => parseRegistrationAmount(item.amount))).toFixed(2)
}

export function formatRegistrationAmount(value: unknown): string {
  if (value === null || value === undefined || value === '') return '未填写'
  return `¥${decimal(value).toFixed(2)}`
}
