import { money, positive, decimal, sumMoney } from '../../shared/money'
import { audit } from './businessTransaction'

export async function shiftCash(tx: any, shift: any) {
  const payments = await tx.payment.findMany({ where: { cashShiftId: shift.id, paymentMethod: 'cash' } })
  const movements = await tx.cashMovement.findMany({ where: { shiftId: shift.id } })
  return money(shift.openingCash).plus(sumMoney(payments.map((p: any) => p.amount))).plus(sumMoney(movements.map((m: any) => m.amount)))
}
export async function mutateShift(tx: any, actor: number, key: string, body: any, id?: number, action = 'open') {
  if (action === 'open') {
    if (money(body.openingCash).lt(0)) throw new Error('备用金不能为负数')
    if (await tx.cashShift.findFirst({ where: { userId: actor, status: 'open' } })) throw new Error('已有未结束班次')
    return tx.cashShift.create({ data: { userId: actor, openingCash: money(body.openingCash).toFixed(2), notes: body.notes } })
  }
  const shift = await tx.cashShift.findUnique({ where: { id } })
  if (!shift || (action !== 'reopen' && shift.userId !== actor)) throw new Error('只能操作自己的班次')
  if (action === 'reopen') {
    if (!String(body.notes || '').trim()) throw new Error('重开班次必须填写原因')
    if (shift.status !== 'closed' || await tx.cashShift.findFirst({ where: { userId: shift.userId, status: 'open' } })) throw new Error('班次不能重开')
    await audit(tx, actor, 'shift.reopen', 'CashShift', id, { previous: shift, reason: body.notes })
    return tx.cashShift.update({ where: { id }, data: { status: 'open', closedAt: null, notes: body.notes } })
  }
  if (shift.status !== 'open') throw new Error('班次已结束')
  if (action === 'movement') {
    if (!String(body.notes || '').trim()) throw new Error('现金支出必须填写用途')
    const amount = positive(body.amount).neg()
    if ((await shiftCash(tx, shift)).plus(amount).lt(0)) throw new Error('现金余额不足')
    return tx.cashMovement.create({ data: { shiftId: id, amount: amount.toFixed(2), type: 'expense', sourceKey: key, operatorUserId: actor, notes: body.notes } })
  }
  const counted = money(body.countedCash)
  if (counted.lt(0)) throw new Error('实盘现金不能为负数')
  const expected = await shiftCash(tx, shift)
  const variance = counted.minus(expected)
  if (!variance.isZero() && !String(body.notes || '').trim()) throw new Error('现金差异必须填写说明')
  return tx.cashShift.update({ where: { id }, data: { status: 'closed', closedAt: new Date(), countedCash: counted.toFixed(2), expectedCash: expected.toFixed(2), variance: variance.toFixed(2), notes: body.notes } })
}

export async function createPurchase(tx: any, actor: number, body: any) {
  const supplier = await tx.supplier.findUnique({ where: { id: Number(body.supplierId) } })
  if (!supplier?.active || !Array.isArray(body.items) || !body.items.length) throw new Error('请选择供应商并添加采购明细')
  const items = []
  for (const l of body.items) {
    const productId = Number(l.productId)
    if (!await tx.product.findUnique({ where: { id: productId } })) throw new Error('商品不存在')
    const unitCost = money(l.unitCost)
    if (unitCost.lt(0)) throw new Error('成本不能为负数')
    items.push({ productId, qty: positive(l.qty, 3).toFixed(3), unitCost: unitCost.toFixed(2) })
  }
  const expectedAt = body.expectedAt ? new Date(body.expectedAt) : null
  if (expectedAt && !Number.isFinite(expectedAt.getTime())) throw new Error('预计到货时间格式错误')
  return tx.purchaseOrder.create({ data: { supplierId: supplier.id, expectedAt, notes: body.notes, operatorUserId: actor, items: { create: items } }, include: { items: true, supplier: true } })
}

export async function receivePurchase(tx: any, actor: number, key: string, id: number, body: any) {
  const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
  if (!po || !['draft', 'partial'].includes(po.status)) throw new Error('采购单不存在或已完成')
  if (!Array.isArray(body.lines) || !body.lines.length || new Set(body.lines.map((l: any) => l.itemId)).size !== body.lines.length) throw new Error('请提供不重复的收货明细')
  let total = money(0)
  const lines = []
  for (const l of body.lines) {
    const item = po.items.find((i: any) => i.id === Number(l.itemId))
    const qty = positive(l.qty, 3)
    if (!item || qty.gt(decimal(item.qty).minus(item.receivedQty))) throw new Error('收货数量超过采购未收数量')
    const unitCost = money(l.unitCost)
    if (unitCost.lt(0)) throw new Error('实际成本不能为负数')
    const expiryDate = new Date(l.expiryDate)
    if (!Number.isFinite(expiryDate.getTime()) || expiryDate <= new Date()) throw new Error('请填写未来的有效期')
    const batch = await tx.stockBatch.create({ data: { productId: item.productId, batchNo: `PUR-${id}-${item.id}-${Date.now()}`, inboundDate: new Date(), expiryDate, inboundQty: qty.toFixed(3), currentQty: qty.toFixed(3), costPrice: unitCost.toFixed(2), notes: `采购 #${id}` } })
    await tx.stockMovement.create({ data: { batchId: batch.id, type: 'inbound', qtyChange: qty.toFixed(3), operatorUserId: actor, operator: String(actor), sourceKey: `${key}:${item.id}`, notes: `采购 #${id}` } })
    await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: { increment: qty.toFixed(3) } } })
    total = total.plus(money(qty.times(unitCost)))
    lines.push({ itemId: item.id, batchId: batch.id, qty: qty.toFixed(3), unitCost: unitCost.toFixed(2), costVariance: money(unitCost.minus(item.unitCost).times(qty)).toFixed(2) })
  }
  const receipt = await tx.goodsReceipt.create({ data: { purchaseOrderId: id, lines, totalAmount: total.toFixed(2), sourceKey: key, operatorUserId: actor } })
  await tx.supplierAccountEntry.create({ data: { supplierId: po.supplierId, amount: total.toFixed(2), type: 'receipt', receiptId: receipt.id, sourceKey: `${key}:payable`, operatorUserId: actor } })
  const updated = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } })
  await tx.purchaseOrder.update({ where: { id }, data: { status: updated.every((i: any) => decimal(i.receivedQty).eq(i.qty)) ? 'received' : 'partial' } })
  return receipt
}

export async function paySupplier(tx: any, actor: number, key: string, id: number, body: any) {
  const amount = positive(body.amount)
  if (!['cash', 'wechat', 'alipay', 'bank'].includes(body.paymentMethod)) throw new Error('付款方式不合法')
  const due = await tx.supplierAccountEntry.aggregate({ where: { supplierId: id }, _sum: { amount: true } })
  if (amount.gt(due._sum.amount || 0)) throw new Error('付款超过供应商应付')
  if (body.paymentMethod === 'cash') {
    const shift = await tx.cashShift.findFirst({ where: { userId: actor, status: 'open' } })
    if (!shift) throw new Error('现金付款前请开班')
    await mutateShift(tx, actor, `${key}:cash`, { amount: amount.toFixed(2), notes: `供应商付款 #${id}` }, shift.id, 'movement')
  }
  return tx.supplierAccountEntry.create({ data: { supplierId: id, amount: amount.neg().toFixed(2), type: 'payment', paymentMethod: body.paymentMethod, sourceKey: key, operatorUserId: actor, notes: body.notes } })
}
