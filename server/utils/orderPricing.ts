import { money, positive, decimal, sumMoney } from '../../shared/money'
import { pickBasePrice } from '../../shared/priceMode'
import { can } from '../../shared/permissions'
import { activeCustomer, loyaltyRules } from './accounts'

export async function quoteOrder(tx: any, cart: any, role: string) {
  if (!Array.isArray(cart.items) || !cart.items.length || cart.items.length > 200) throw new Error('请添加 1–200 行商品')
  const customer = cart.customerId ? await activeCustomer(tx, Number(cart.customerId)) : null
  const mode = cart.priceMode || 'retail'
  if (!['retail', 'member', 'vip', 'wholesale', 'discount', 'promotion'].includes(mode)) throw new Error('不支持该价格模式')
  const manualDiscount = money(cart.discount ?? 0)
  if (manualDiscount.lt(0)) throw new Error('优惠金额不能为负数')
  if (mode === 'discount' || manualDiscount.gt(0)) {
    if (!can(role, 'order.discount')) throw createError({ statusCode: 403, message: '当前角色不能手工改价' })
    if (!String(cart.priceReason || '').trim()) throw new Error('手工优惠必须填写原因')
  }
  const rate = mode === 'discount' ? decimal(cart.discountRate ?? 100) : decimal(100)
  if (rate.lt(0) || rate.gt(100)) throw new Error('折扣必须在 0–100 之间')
  const items = []
  for (const input of cart.items) {
    const p = await tx.product.findUnique({ where: { id: Number(input.productId) }, include: { unitConversions: true, recipe: true, drinkGroups: { include: { options: true }, orderBy: { sort: 'asc' } }, drinkVariants: true } })
    if (!p || p.status !== 'active') throw new Error('商品不存在或已下架')
    const qty = positive(input.qty, 3)
    const unit = input.unit || p.baseUnit
    const conversion = unit === p.baseUnit ? 1 : p.unitConversions.find((x: any) => x.fromUnit === unit)?.toBaseQty
    if (!conversion) throw new Error(`商品“${p.name}”的销售单位无效`)
    const baseQty = qty.times(conversion)
    if (baseQty.decimalPlaces() > 3) throw new Error('换算后的数量最多支持三位小数')
    let basePrice = money(pickBasePrice({ ...p, level: customer?.level }, 'retail'))
    let variantId: string | null = null, variantLabel: string | null = null
    if (p.productType === 'drink') {
      if (!qty.isInteger() || unit !== '杯' || input.specialBatchId) throw new Error('饮品按整杯销售，不支持单位换算或批次特价')
      const variant = p.drinkVariants.find((v: any) => v.id === input.variantId)
      if (!variant || !variant.enabled || variant.price === null) throw new Error(`饮品“${p.name}”规格不存在或已停售`)
      basePrice = money(variant.price)
      if (typeof input.expectedUnitPrice !== 'string' || !/^\d+\.\d{2}$/.test(input.expectedUnitPrice)) throw new Error('请确认饮品规格价格后结账')
      if (!decimal(input.expectedUnitPrice).eq(basePrice)) throw Object.assign(new Error(`饮品“${p.name}”价格已变化，请重新选择规格确认价格`), { code: 'PRICE_CHANGED', statusCode: 409 })
      const selections = variant.options as { groupId: string; optionId: string }[]
      variantLabel = p.drinkGroups.filter((g: any) => g.active !== false).map((g: any) => {
        const option = g.options.find((o: any) => o.id === selections.find(s => s.groupId === g.id)?.optionId && o.active !== false)
        if (!option) throw new Error('饮品规格已变化，请重新选择')
        return option.name
      }).join(' / ')
      variantId = variant.id
    } else if (input.variantId) throw new Error('普通商品不能选择饮品规格')
    let batchId: number | undefined
    if (input.specialBatchId) {
      const batch = await tx.stockBatch.findUnique({ where: { id: Number(input.specialBatchId) } })
      if (!batch || batch.productId !== p.id || batch.status !== 'discounted' || !batch.specialUntil || batch.specialUntil < new Date() || batch.specialPrice === null || baseQty.gt(batch.specialQty) || baseQty.gt(batch.currentQty)) throw new Error('特价批次已失效或数量不足')
      if (p.recipe?.enabled) throw new Error('配方商品不能使用批次特价')
      basePrice = money(batch.specialPrice)
      batchId = batch.id
    }
    const unitPrice = basePrice.times(conversion).times(rate).div(100).toDecimalPlaces(2)
    items.push({ productId: p.id, productName: p.name, productNameSnapshot: p.name, productTypeSnapshot: p.productType || 'standard', variantId, variantLabel, unit, qty: qty.toFixed(3), baseQty: baseQty.toFixed(3), unitPrice: unitPrice.toFixed(2), originalPrice: basePrice.times(conversion).toFixed(2), subtotal: unitPrice.times(qty).toFixed(2), specialBatchId: batchId, imageUrl: input.imageUrl === undefined ? p.imageUrl : input.imageUrl, grade: input.grade ?? p.grade, color: input.color ?? p.color, notes: input.notes ?? null })
  }
  const subtotal = sumMoney(items.map(x => x.subtotal))
  let reduction = manualDiscount
  if (mode === 'promotion') {
    const p = await tx.promotion.findUnique({ where: { id: Number(cart.promotionId) } })
    const now = new Date()
    if (!p || p.status !== 'active' || (p.startAt && p.startAt > now) || (p.endAt && p.endAt < now) || subtotal.lt(p.threshold)) throw new Error('促销活动不可用或未达到门槛')
    reduction = reduction.plus(p.reduction)
  }
  if (reduction.gt(subtotal)) throw new Error('优惠超过商品合计')
  const beforePoints = subtotal.minus(reduction)
  const points = Number(cart.pointsToRedeem || 0)
  if (!Number.isSafeInteger(points) || points < 0) throw new Error('抵扣积分必须为非负整数')
  const rules = await loyaltyRules(tx)
  const pointsDiscount = money(decimal(points).div(rules.pointsPerYuan))
  if (points && (!customer || customer.level === 'wholesale' || points > customer.availablePoints || pointsDiscount.gt(beforePoints.times(rules.maxPercent).div(100)))) throw new Error('积分不足、客户不参与积分或超过单笔抵扣上限')
  if (points && pointsDiscount.lte(0)) throw new Error('抵扣积分不足一分钱')
  const total = beforePoints.minus(pointsDiscount)
  // Largest-remainder allocation keeps every line nonnegative, including many one-cent lines.
  const totalCents=total.times(100)
  const shares=items.map((item,index)=>{
    const exact=subtotal.isZero()?decimal(0):decimal(item.subtotal).div(subtotal).times(totalCents)
    const cents=exact.floor()
    return {index,cents,remainder:exact.minus(cents)}
  })
  let remaining=totalCents.minus(shares.reduce((sum,share)=>sum.plus(share.cents),decimal(0))).toNumber()
  for(const share of [...shares].sort((a,b)=>b.remainder.comparedTo(a.remainder)||a.index-b.index)){
    if(remaining<=0)break
    share.cents=share.cents.plus(1);remaining--
  }
  for(const share of shares)items[share.index].subtotal=share.cents.div(100).toFixed(2)
  return { customer, items, subtotal: subtotal.toFixed(2), reduction: reduction.toFixed(2), total: total.toFixed(2), points, pointsDiscount: pointsDiscount.toFixed(2), priceSource: customer?.level || 'normal', priceMode: mode }
}
