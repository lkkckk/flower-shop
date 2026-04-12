import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  const body = await readBody(event)
  const amount = Number(body.amount)
  const paymentMethod = body.paymentMethod as string
  const notes = body.notes ? String(body.notes) : null

  if (!(amount > 0)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '充值金额必须大于 0', code: 'INVALID_PARAMS' } }
  }

  if (!['cash', 'wechat', 'alipay'].includes(paymentMethod)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '支付方式不合法', code: 'INVALID_PARAMS' } }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id } })
      if (!customer) throw new Error('客户不存在')

      const payment = await tx.payment.create({
        data: {
          customerId: id,
          amount,
          paymentMethod,
          type: 'recharge',
          notes,
          operator: 'system',
        },
      })

      const updated = await tx.customer.update({
        where: { id },
        data: {
          balance: { increment: amount },
          // 充值不影响 totalOwed
        },
      })

      return { customer: updated, payment }
    })

    return { data: result, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '充值失败', code: 'RECHARGE_ERROR' },
    }
  }
})
