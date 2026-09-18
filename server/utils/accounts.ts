import { money, positive, decimal } from '../../shared/money'

export async function activeCustomer(tx: any, id: number) {
  const customer = await tx.customer.findUnique({ where: { id } })
  if (!customer || customer.status !== 'active') throw new Error('客户不存在或已停用/合并')
  return customer
}

export async function accountEntry(tx: any, customerId: number, account: 'stored_value' | 'receivable', amount: any, type: string, sourceKey: string, actor: number | null, extra: any = {}) {
  const c = await activeCustomer(tx, customerId)
  const field = account === 'stored_value' ? 'storedValueBalance' : 'receivableBalance'
  const change = money(amount)
  const after = money(c[field]).plus(change)
  if (after.lt(0)) throw new Error(account === 'stored_value' ? '预存余额不足' : '还款超过应收欠款')
  await tx.customerAccountEntry.create({ data: { customerId, account, amount: change.toFixed(2), balanceAfter: after.toFixed(2), type, sourceKey, operatorUserId: actor, ...extra } })
  return tx.customer.update({ where: { id: customerId }, data: { [field]: after.toFixed(2), [account === 'stored_value' ? 'balance' : 'totalOwed']: after.toFixed(2) } })
}

export async function pointEntry(tx: any, customerId: number, amount: number, type: string, sourceKey: string, actor: number | null, extra: any = {}) {
  if (!Number.isSafeInteger(amount)) throw new Error('积分必须是整数')
  const c = await activeCustomer(tx, customerId)
  const after = c.availablePoints + amount
  if (!Number.isSafeInteger(after) || Math.abs(after) > 2147483647) throw new Error('积分超出范围')
  if (type === 'redeem' && after < 0) throw new Error('可用积分不足')
  await tx.pointEntry.create({ data: { customerId, amount, balanceAfter: after, type, sourceKey, operatorUserId: actor, ...extra } })
  await tx.customer.update({ where: { id: customerId }, data: { availablePoints: after, points: after } })
}

export async function loyaltyRules(tx: any) {
  const stored = await tx.setting.findUnique({ where: { key: 'loyaltyRules' } })
  return { earnPerYuan: 1, pointsPerYuan: 100, maxPercent: 20, ...(stored ? JSON.parse(stored.value) : {}) }
}

export async function awardOrderPoints(tx: any, orderId: number, actor: number) {
  const o = await tx.order.findUnique({ where: { id: orderId }, include: { customer: true } })
  if (!o.customer || o.customer.level === 'wholesale' || o.fulfillmentStatus !== 'completed' || !money(o.owedAmount).isZero()) return
  const sourceKey = `order:${orderId}:earn`
  if (await tx.pointEntry.findUnique({ where: { sourceKey } })) return
  if(await tx.auditLog.findFirst({where:{action:'migration.points.in_opening',entityType:'Order',entityId:String(orderId)}}))return
  const rules = await loyaltyRules(tx)
  const earned = money(o.paidAmount).minus(o.refundedAmount).times(rules.earnPerYuan).floor().toNumber()
  await pointEntry(tx, o.customerId, Math.max(0, earned), 'earn', sourceKey, actor, { orderId })
}

export async function paymentRecord(tx: any, actor: number, key: string, data: any) {
  const shift = await tx.cashShift.findFirst({ where: { userId: actor, status: 'open' } })
  if (data.paymentMethod === 'cash' && !shift) throw new Error('现金收付款前请先开班')
  return tx.payment.create({ data: { ...data, sourceKey: key, operator: String(actor), operatorUserId: actor, cashShiftId: shift?.id ?? null } })
}

export async function collectOrderPayment(tx: any, orderId: number, amount: any, method: string, actor: number, key: string, notes?: string) {
  const value = positive(amount)
  if (!['cash', 'wechat', 'alipay', 'balance'].includes(method)) throw new Error('支付方式不合法')
  const order = await tx.order.findUnique({ where: { id: orderId } })
  if (!order || order.fulfillmentStatus === 'cancelled') throw new Error('订单不存在或已取消')
  if (value.gt(order.owedAmount)) throw new Error('补款超过订单应收金额')
  if (method === 'balance') {
    if (!order.customerId) throw new Error('预存支付需要客户')
    await accountEntry(tx, order.customerId, 'stored_value', value.neg(), 'consume', `${key}:stored`, actor, { orderId })
  }
  const payment = await paymentRecord(tx, actor, key, { orderId, customerId: order.customerId, amount: value.toFixed(2), type: 'income', paymentMethod: method, notes })
  if (order.customerId) await accountEntry(tx, order.customerId, 'receivable', value.neg(), 'collect', `${key}:receivable`, actor, { orderId, paymentId: payment.id })
  const owed = money(order.owedAmount).minus(value)
  const paid = money(order.paidAmount).plus(value)
  const hasRefund = await tx.orderAdjustment.count({where:{orderId,status:'approved'}})
  const paymentStatus = hasRefund ? 'partially_refunded' : owed.isZero() ? 'paid' : 'partial'
  const updated = await tx.order.update({ where: { id: orderId }, data: { paidAmount: paid.toFixed(2), owedAmount: owed.toFixed(2), paymentStatus, ...(order.orderType === 'retail' ? { status: paymentStatus } : {}) } })
  await awardOrderPoints(tx, orderId, actor)
  return { order: updated, payment }
}

export async function recharge(tx: any, customerId: number, body: any, actor: number, key: string) {
  const value = positive(body.amount)
  if (!['cash', 'wechat', 'alipay'].includes(body.paymentMethod)) throw new Error('充值支付方式不合法')
  await activeCustomer(tx, customerId)
  const payment = await paymentRecord(tx, actor, key, { customerId, amount: value.toFixed(2), type: 'recharge', paymentMethod: body.paymentMethod, notes: body.notes })
  const customer = await accountEntry(tx, customerId, 'stored_value', value, 'recharge', `${key}:stored`, actor, { paymentId: payment.id, notes: body.notes })
  return { customer, payment }
}

export async function repayCustomer(tx: any, customerId: number, body: any, actor: number, key: string) {
  const value = positive(body.amount)
  const c = await activeCustomer(tx, customerId)
  if (value.gt(c.receivableBalance)) throw new Error('还款超过客户应收，请将多余金额单独充值')
  const orders = await tx.order.findMany({ where: { customerId, owedAmount: { gt: 0 }, fulfillmentStatus: { not: 'cancelled' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
  let remaining = value
  const payments = []
  for (const order of orders) {
    if (remaining.isZero()) break
    const part = decimal(order.owedAmount).lt(remaining) ? money(order.owedAmount) : remaining
    payments.push(await collectOrderPayment(tx, order.id, part, body.paymentMethod, actor, `${key}:${order.id}`, body.notes))
    remaining = remaining.minus(part)
  }
  if (!remaining.isZero()) throw new Error('客户账本与订单应收不一致，请管理员核对')
  return { customer: await activeCustomer(tx, customerId), payments }
}
