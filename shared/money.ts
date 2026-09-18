import Decimal from 'decimal.js'

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP })
export { Decimal }
export function decimal(value: any = 0): Decimal {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') throw new Error('请输入有效数值')
  const d = new Decimal(String(value))
  if (!d.isFinite()) throw new Error('数值必须为有限值')
  return d
}
export const money = (value: any) => decimal(value).toDecimalPlaces(2)
export const quantity = (value: any) => decimal(value).toDecimalPlaces(3)
export const amountString = (value: any) => money(value).toFixed(2)
export function positive(value: any, scale = 2) {
  const n = decimal(value)
  if (n.lte(0) || n.decimalPlaces() > scale || n.abs().gte('1000000000')) throw new Error(`数值必须大于零且最多 ${scale} 位小数`)
  return n
}
export const sumMoney = (values: any[]) => values.reduce((s: Decimal, v) => s.plus(decimal(v)), new Decimal(0)).toDecimalPlaces(2)
