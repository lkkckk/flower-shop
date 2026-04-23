/**
 * 价格模式统一重算工具（前后端共用）
 * 放在 shared/ 下，前端 import 'shared/priceMode'，后端 import '../../../shared/priceMode'
 */

export type PriceMode = 'retail' | 'discount' | 'promotion'

export interface PriceBasis {
  defaultPrice: number
}

export interface LineInput {
  /** 基础单价来源（商品表字段） */
  basis: PriceBasis
  /** 销售数量（销售单位） */
  qty: number
  /** 销售单位 → 基础单位 的换算系数（默认 1） */
  toBaseQty: number
}

export interface PromotionRule {
  threshold: number
  reduction: number
}

export interface ComputeInput {
  items: LineInput[]
  mode: PriceMode
  /** 折扣率 0-100，例如 85 表示八五折；仅 mode=discount 时使用 */
  discountRate?: number
  /** 满减规则；仅 mode=promotion 时使用 */
  promotion?: PromotionRule | null
}

export interface ComputeResult {
  /** 每行单价（已含换算后的 per-sales-unit 价格，且 mode 已应用） */
  lineUnitPrices: number[]
  /** 每行小计（qty * unitPrice） */
  lineSubtotals: number[]
  /** 未减免前的合计（sum of lineSubtotals） */
  subtotal: number
  /** 减免金额（仅 promotion 有） */
  reduction: number
  /** 最终应收 */
  total: number
  /** 满减是否生效（subtotal 是否达到门槛） */
  promotionApplicable: boolean
}

function roundPrice(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100)
}

/** 挑选基础单价（所有模式均以 defaultPrice 为基础，discount/promotion 在合计层面调整） */
export function pickBasePrice(basis: PriceBasis, _mode: PriceMode): number {
  return basis.defaultPrice
}

export function computeOrder(input: ComputeInput): ComputeResult {
  const mode = input.mode
  const rate = mode === 'discount' ? Math.max(0, Math.min(100, input.discountRate ?? 100)) : 100

  const lineUnitPrices: number[] = []
  const lineSubtotals: number[] = []

  for (const item of input.items) {
    const base = pickBasePrice(item.basis, mode)
    // 换算到销售单位的基础价
    let unitPrice = base * (item.toBaseQty || 1)
    // 折扣模式：逐行按比例
    if (mode === 'discount') unitPrice = unitPrice * (rate / 100)
    unitPrice = roundPrice(unitPrice)
    lineUnitPrices.push(unitPrice)
    lineSubtotals.push(roundPrice(unitPrice * item.qty))
  }

  const subtotal = roundPrice(lineSubtotals.reduce((s, n) => s + n, 0))

  let reduction = 0
  let promotionApplicable = false
  if (mode === 'promotion' && input.promotion) {
    if (subtotal >= input.promotion.threshold) {
      reduction = roundPrice(input.promotion.reduction)
      promotionApplicable = true
    }
  }

  const total = roundPrice(Math.max(0, subtotal - reduction))
  return { lineUnitPrices, lineSubtotals, subtotal, reduction, total, promotionApplicable }
}
