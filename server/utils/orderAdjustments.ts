import { money, decimal, positive, sumMoney } from '../../shared/money'
import { accountEntry, pointEntry, paymentRecord } from './accounts'
import { audit } from './businessTransaction'

export async function requestAdjustment(tx: any, orderId: number, body: any, actor: number) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order || order.fulfillmentStatus === 'cancelled') throw new Error('订单不存在或已取消')
  if (order.orderType === 'preorder' && ['pending','confirmed'].includes(order.fulfillmentStatus) && body.type !== 'void') throw new Error('尚未制作的预售单请提交整单作废退款；部分退货适用于已扣料订单')
  if (!['void', 'return', 'refund'].includes(body.type) || !String(body.reason || '').trim()) throw new Error('请选择纠错类型并填写原因')
  const inputs = body.type === 'void' ? order.items.filter((i: any) => decimal(i.qty).gt(i.returnedQty)).map((i: any) => ({ itemId: i.id, qty: decimal(i.qty).minus(i.returnedQty).toFixed(3), disposition: body.lines?.find((l: any) => Number(l.itemId) === i.id)?.disposition || body.disposition })) : body.lines
  if (!Array.isArray(inputs) || !inputs.length || new Set(inputs.map((l: any) => l.itemId)).size !== inputs.length) throw new Error('请提供不重复的退货明细')
  const lines = inputs.map((l: any) => {
    const item = order.items.find((i: any) => i.id === Number(l.itemId))
    const qty = positive(l.qty, 3)
    if (!item || qty.gt(decimal(item.qty).minus(item.returnedQty))) throw new Error('退货数量超过可退数量')
    const drink = item.productTypeSnapshot === 'drink'
    if (drink && !qty.isInteger()) throw new Error('饮品必须按整杯退货')
    if (!drink && !['restock', 'scrap'].includes(l.disposition)) throw new Error('每行必须选择重新入库或报损')
    return { itemId: item.id, qty: qty.toFixed(3), disposition: drink ? 'none' : l.disposition, amount: money(decimal(item.subtotal).times(qty).div(item.qty)).toFixed(2) }
  })
  return tx.orderAdjustment.create({ data: { orderId, type: body.type, reason: body.reason, lines, amount: sumMoney(lines.map((l: any) => l.amount)).toFixed(2), requestedBy: actor } })
}

export async function approveAdjustment(tx: any, orderId: number, adjustmentId: number, body: any, actor: number, key: string) {
  const adjustment = await tx.orderAdjustment.findUnique({ where: { id: adjustmentId } })
  if (!adjustment || adjustment.orderId !== orderId || adjustment.status !== 'pending') throw new Error('申请不存在或已处理')
  if (body.decision === 'reject') {
    return tx.orderAdjustment.update({ where: { id: adjustmentId }, data: { status: 'rejected', approvedBy: actor, approvedAt: new Date() } })
  }
  if (body.decision !== 'approve') throw new Error('请选择批准或拒绝')
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { costAllocations: true } }, payments: true } })
  if (order.fulfillmentStatus === 'cancelled') throw new Error('订单已经取消')
  const lines = adjustment.lines as any[]
  if (body.lines) {
    if (!Array.isArray(body.lines) || body.lines.length !== lines.length || new Set(body.lines.map((l:any)=>Number(l.itemId))).size !== lines.length) throw new Error('审批明细必须与申请一致')
    for (const line of lines) {
      const approval = body.lines.find((l:any)=>Number(l.itemId)===line.itemId)
      const drink = order.items.find((i: any) => i.id === line.itemId)?.productTypeSnapshot === 'drink'
      if (!approval || !decimal(approval.qty).eq(line.qty) || (!drink && !['restock','scrap'].includes(approval.disposition))) throw new Error('审批数量必须与申请一致，请逐行选择库存去向')
      line.disposition=drink ? 'none' : approval.disposition
    }
  }
  if (body.refundMethod && body.refundMethod !== 'original') throw new Error('本期退款按原付款方式返还')
  let reduction = money(0)
  for (const l of lines) {
    const item = order.items.find((i: any) => i.id === l.itemId)
    if (!item || positive(l.qty, 3).gt(decimal(item.qty).minus(item.returnedQty))) throw new Error('可退数量已变化，请重新申请')
    const cumulative = decimal(item.returnedQty).plus(l.qty)
    // Cumulative differences prevent partial-return rounding drift.
    const before = money(decimal(item.subtotal).times(item.returnedQty).div(item.qty))
    const after = money(decimal(item.subtotal).times(cumulative).div(item.qty))
    l.amount = after.minus(before).toFixed(2)
    reduction = reduction.plus(after.minus(before))
    await tx.orderItem.update({ where: { id: item.id }, data: { returnedQty: cumulative.toFixed(3) } })
    if (item.productTypeSnapshot === 'drink') continue
    const originalCosts = new Map<number,any>()
    for (const allocation of item.costAllocations.filter((c:any)=>c.adjustmentId===null)) {
      const existing=originalCosts.get(allocation.batchId)
      originalCosts.set(allocation.batchId, existing ? {...existing,baseQty:decimal(existing.baseQty).plus(allocation.baseQty).toFixed(3),totalCost:money(existing.totalCost).plus(allocation.totalCost).toFixed(2)} : allocation)
    }
    for (const cost of originalCosts.values()) {
      const prior = item.costAllocations.filter((c: any) => c.adjustmentId !== null && c.batchId === cost.batchId)
      const returnedBase = sumMoney([]).plus(prior.reduce((s: any, c: any) => decimal(s).minus(c.baseQty), decimal(0)))
      const targetBase = decimal(cost.baseQty).times(cumulative).div(item.qty).toDecimalPlaces(3)
      const baseQty = targetBase.minus(returnedBase)
      const returnedCost = prior.reduce((s: any, c: any) => decimal(s).minus(c.totalCost), decimal(0))
      const amount = money(decimal(cost.totalCost).times(cumulative).div(item.qty)).minus(returnedCost)
      await tx.orderCostAllocation.create({ data: { orderId, orderItemId: item.id, batchId: cost.batchId, baseQty: baseQty.neg().toFixed(3), unitCost: cost.unitCost, totalCost: amount.neg().toFixed(2), adjustmentId } })
      if (l.disposition === 'restock') {
        const b = await tx.stockBatch.findUnique({ where: { id: cost.batchId } })
        await tx.stockBatch.update({ where: { id: b.id }, data: { currentQty: { increment: baseQty.toFixed(3) }, status: b.status === 'discounted' ? 'discounted' : 'in_stock' } })
      }
      await tx.stockMovement.create({ data: { batchId: cost.batchId, type: l.disposition === 'restock' ? 'return' : 'return_scrap', qtyChange: l.disposition === 'restock' ? baseQty.toFixed(3) : '0.000', relatedOrderId: orderId, operator: String(actor), operatorUserId: actor, notes: `纠错 #${adjustmentId}，${baseQty.toFixed(3)} 基础单位${l.disposition === 'scrap' ? '直接报损' : '入库'}` } })
    }
  }
  const debtReduction = reduction.lt(order.owedAmount) ? reduction : money(order.owedAmount)
  const refund = reduction.minus(debtReduction)
  if (refund.gt(money(order.paidAmount).minus(order.refundedAmount))) throw new Error('退款超过实际未退金额')
  if (order.customerId && debtReduction.gt(0)) await accountEntry(tx, order.customerId, 'receivable', debtReduction.neg(), 'refund', `${key}:debt`, actor, { orderId })
  if (refund.gt(0)) {
    const legacyAllocations = await tx.auditLog.findMany({where:{action:'migration.repay.allocate',entityType:'Order',entityId:String(orderId)}})
    const payments = [...order.payments.filter((p: any) => p.type === 'income'), ...legacyAllocations.map((log:any)=>({amount:log.details.amount,paymentMethod:log.details.paymentMethod}))]
    const methods = [...new Set(payments.map((p: any) => p.paymentMethod))]
    let remaining = refund
    for (const method of methods) {
      const received = sumMoney(payments.filter((p: any) => p.paymentMethod === method).map((p: any) => p.amount))
      const returned = sumMoney(order.payments.filter((p: any) => p.type === 'refund' && p.paymentMethod === method).map((p: any) => decimal(p.amount).abs()))
      const available = received.minus(returned)
      const part = remaining.lt(available) ? remaining : available
      if (part.lte(0)) continue
      if (['wechat', 'alipay'].includes(String(method)) && !String(body.externalReference || '').trim()) throw new Error('请先完成外部退款并填写退款凭证')
      if (method === 'balance') await accountEntry(tx, order.customerId, 'stored_value', part, 'refund', `${key}:stored`, actor, { orderId })
      await paymentRecord(tx, actor, `${key}:refund:${method}`, { orderId, customerId: order.customerId, amount: part.neg().toFixed(2), type: 'refund', paymentMethod: method, notes: body.externalReference || adjustment.reason })
      remaining = remaining.minus(part)
    }
    if (!remaining.isZero()) throw new Error('原付款流水不足，请先核对历史账务')
  }
  const alreadyReduced = order.items.reduce((s: any, i: any) => s.plus(money(decimal(i.subtotal).times(i.returnedQty).div(i.qty))), money(0))
  const cumulativeReduction = alreadyReduced.plus(reduction)
  const allReturned = order.items.every((i: any) => decimal(i.returnedQty).plus(lines.find((l: any) => l.itemId === i.id)?.qty || 0).eq(i.qty))
  if (order.customerId) {
    const earnedEntry = await tx.pointEntry.findUnique({ where: { sourceKey: `order:${orderId}:earn` } })
    const legacyPoints = earnedEntry ? null : await tx.auditLog.findFirst({where:{action:'migration.points.in_opening',entityId:String(orderId),entityType:'Order'}})
    const earned = earnedEntry || (legacyPoints ? {amount:Number(legacyPoints.details.earnedPoints)} : null)
    if (earned) {
      const prior = await tx.pointEntry.aggregate({ where: { orderId, type: 'refund_earn' }, _sum: { amount: true } })
      const desired = allReturned ? earned.amount : money(order.totalAmount).isZero() ? 0 : decimal(earned.amount).times(cumulativeReduction).div(order.totalAmount).floor().toNumber()
      await pointEntry(tx, order.customerId, -desired - (prior._sum.amount || 0), 'refund_earn', `${key}:earn`, actor, { orderId })
    }
    const prior = await tx.pointEntry.aggregate({ where: { orderId, type: 'refund_redeem' }, _sum: { amount: true } })
    const desired = allReturned ? order.pointsRedeemed : money(order.totalAmount).isZero() ? 0 : decimal(order.pointsRedeemed).times(cumulativeReduction).div(order.totalAmount).floor().toNumber()
    if (desired > (prior._sum.amount || 0)) await pointEntry(tx, order.customerId, desired - (prior._sum.amount || 0), 'refund_redeem', `${key}:redeem`, actor, { orderId })
  }
  const updated = await tx.order.update({ where: { id: orderId }, data: {
    owedAmount: money(order.owedAmount).minus(debtReduction).toFixed(2), refundedAmount: money(order.refundedAmount).plus(refund).toFixed(2),
    paymentStatus: allReturned ? 'refunded' : 'partially_refunded',
    ...(allReturned ? { status: 'cancelled', fulfillmentStatus: 'cancelled' } : {}),
  } })
  await tx.orderAdjustment.update({ where: { id: adjustmentId }, data: { status: 'approved', approvedBy: actor, approvedAt: new Date(), amount: reduction.toFixed(2), lines, externalReference: body.externalReference || null } })
  await audit(tx, actor, 'order.adjust.approve', 'Order', orderId, { adjustmentId, reduction: reduction.toFixed(2), refund: refund.toFixed(2) })
  return updated
}
