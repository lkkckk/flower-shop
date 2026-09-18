import { randomUUID } from 'node:crypto'
import { quoteOrder } from './orderPricing'
import { accountEntry, pointEntry, collectOrderPayment, awardOrderPoints } from './accounts'
import { allocateAndDeduct } from './stockAllocator'
import { snapshotPreorderImage } from './preorderImages'
import { money } from '../../shared/money'

export async function createSale(tx: any, actor: number, key: string, body: any, role: string, preorder = false) {
  const cart = preorder ? body : { ...body.cart, pointsToRedeem: body.pointsToRedeem ?? body.cart?.pointsToRedeem }
  const q = await quoteOrder(tx, cart, role)
  if (body.expectedTotal !== undefined && !money(body.expectedTotal).eq(q.total)) throw Object.assign(new Error('商品价格已变化，请刷新报价后结账'), { code: 'PRICE_CHANGED' })
  const payment = body.payment || (preorder ? { method: 'credit', paidAmount: 0 } : null)
  if (!payment || !['credit', 'cash', 'wechat', 'alipay', 'balance'].includes(payment.method)) throw new Error('请选择有效支付方式')
  const paid = payment.method === 'credit' ? money(0) : money(payment.paidAmount)
  if (paid.lt(0) || paid.gt(q.total)) throw new Error('收款金额不能为负数或超过应付金额')
  if (money(q.total).gt(paid) && !q.customer) throw new Error('挂账需要选择客户')
  const deliveryTime = preorder ? new Date(body.deliveryTime) : null
  if (preorder && (!body.deliveryTime || !Number.isFinite(deliveryTime!.getTime()))) throw new Error('请填写有效履约时间')
  const order = await tx.order.create({ data: {
    orderNo: `${preorder ? 'PO' : 'O'}${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date()).replaceAll('-', '')}${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    orderType: preorder ? 'preorder' : 'retail', customerId: q.customer?.id ?? null,
    totalAmount: q.total, paidAmount: 0, owedAmount: q.total,
    paymentStatus: money(q.total).isZero() ? 'paid' : 'unpaid',
    fulfillmentStatus: preorder ? 'pending' : 'completed', completedAt: preorder ? null : new Date(),
    status: preorder ? 'pending_confirm' : money(q.total).isZero() ? 'paid' : 'unpaid', paymentMethod: payment.method,
    priceMode: q.priceMode, priceReason: cart.priceReason || null, discountRate: cart.priceMode === 'discount' ? cart.discountRate : null,
    promotionId: cart.priceMode === 'promotion' ? Number(cart.promotionId) : null,
    pointsRedeemed: q.points, pointsDiscount: q.pointsDiscount, cashierId: actor,
    notes: cart.notes || null, deliveryTime, deliveryAddress: cart.deliveryAddress || null,
    fulfillmentType: cart.fulfillmentType === 'pickup' ? 'pickup' : 'delivery', receiverName: cart.receiverName || null,
    receiverPhone: cart.receiverPhone || null, cardMessage: cart.cardMessage || null, sourceChannel: cart.sourceChannel || null,
    isUrgent: Boolean(cart.isUrgent),
  } })
  if (q.customer && money(q.total).gt(0)) await accountEntry(tx, q.customer.id, 'receivable', q.total, 'sale', `${key}:sale`, actor, { orderId: order.id })
  if (q.points) await pointEntry(tx, q.customer!.id, -q.points, 'redeem', `${key}:redeem`, actor, { orderId: order.id })
  if (preorder) {
    for (const item of q.items) {
      const { productName, specialBatchId, ...data } = item
      if (specialBatchId) throw new Error('预售单不预订短期特价批次')
      await tx.orderItem.create({ data: { ...data, imageUrl: await snapshotPreorderImage(item.imageUrl), orderId: order.id } })
    }
  } else await allocateAndDeduct(tx, order.id, q.items as any, String(actor))
  if (paid.gt(0)) await collectOrderPayment(tx, order.id, paid, payment.method, actor, `${key}:payment`, cart.notes)
  if (q.customer) {
    const current = await tx.customer.findUnique({ where: { id: q.customer.id } })
    if (current.creditLimit !== null && money(current.receivableBalance).gt(current.creditLimit)) throw new Error('超过客户信用额度')
  }
  await awardOrderPoints(tx, order.id, actor)
  const updated = await tx.order.findUnique({ where: { id: order.id }, include: { items: true, payments: true, customer: true } })
  return { order: updated, total: q.total, subtotal: q.subtotal, reduction: q.reduction, pointsDiscount: q.pointsDiscount, priceSource: q.priceSource, priceMode: q.priceMode }
}
