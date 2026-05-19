import { prisma } from '../../../utils/prisma'

/**
 * 订单补款：把欠款单的 owedAmount 减少、paidAmount 增加，并写一笔 Payment 流水
 *
 * Body: { amount, paymentMethod, notes? }
 *   - paymentMethod: 'cash' | 'wechat' | 'alipay'（balance 应在结账时走，这里仅外部支付方式）
 *   - amount 必须 > 0 且不超过当前 owedAmount
 *
 * 副作用：
 *   - 若结清 → status = 'paid'
 *   - 若部分付 → status = 'partial'
 *   - 若有 customerId → customer.totalOwed 同步减少
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    return { data: null, error: { message: '无效的订单 ID', code: 'INVALID_PARAMS' } }
  }

  const body = await readBody(event)
  const amount = Number(body?.amount)
  const paymentMethod = String(body?.paymentMethod || '')
  const notes = body?.notes ? String(body.notes) : null

  if (!(amount > 0)) {
    return { data: null, error: { message: '补款金额必须大于 0', code: 'INVALID_PARAMS' } }
  }
  if (!['cash', 'wechat', 'alipay'].includes(paymentMethod)) {
    return { data: null, error: { message: '支付方式不合法', code: 'INVALID_PARAMS' } }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } })
      if (!order) throw new Error('订单不存在')
      if (order.owedAmount <= 0) throw new Error('该订单已无欠款')
      if (amount > order.owedAmount + 1e-6) {
        throw new Error(`补款金额 ¥${amount.toFixed(2)} 超过当前欠款 ¥${order.owedAmount.toFixed(2)}`)
      }

      const newPaid = order.paidAmount + amount
      const newOwed = Math.max(0, order.owedAmount - amount)
      const newStatus = newOwed <= 1e-6 ? 'paid' : 'partial'

      const updated = await tx.order.update({
        where: { id },
        data: { paidAmount: newPaid, owedAmount: newOwed, status: newStatus },
      })

      const payment = await tx.payment.create({
        data: {
          orderId: id,
          customerId: order.customerId,
          amount,
          paymentMethod,
          type: 'income',
          notes,
          operator: 'system',
        },
      })

      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalOwed: { decrement: amount } },
        })
      }

      return { order: updated, payment }
    })

    return { data: result, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '补款失败', code: 'REPAY_ERROR' },
    }
  }
})
