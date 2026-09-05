export interface SaleProduct {
  id: number
  baseUnit: string
  totalStock: number
  unitConversions?: { fromUnit: string; toBaseQty: number }[]
}

export function getSaleUnits(product: SaleProduct) {
  return [{ name: product.baseUnit, factor: 1 }, ...(product.unitConversions || [])
    .filter(u => u.fromUnit !== product.baseUnit && Number.isFinite(u.toBaseQty) && u.toBaseQty > 0)
    .map(u => ({ name: u.fromUnit, factor: u.toBaseQty }))]
}

export function getUnitFactor(product: SaleProduct, unit: string): number {
  const match = getSaleUnits(product).find(u => u.name === unit)
  if (!match) throw new Error('无效的销售单位')
  return match.factor
}

/** 同一清单中不同销售单位共用基础库存；其他终端的变动由结账事务最终校验。 */
export function remainingSaleQuantity(
  product: SaleProduct,
  unit: string,
  items: { id: string; productId: number; baseQty: number }[],
  excludeItemId?: string,
) {
  const selected = items.filter(i => i.productId === product.id && i.id !== excludeItemId).reduce((sum, i) => sum + i.baseQty, 0)
  return Math.max(0, Math.floor((product.totalStock - selected + 1e-8) / getUnitFactor(product, unit) * 100) / 100)
}
