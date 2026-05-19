import { prisma } from '../../../utils/prisma'
import { respondWithPrismaError } from '../../../utils/prismaError'
import { requireStaff } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireStaff(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  const body = await readBody(event)
  const amount = Number(body.amount)
  const paymentMethod = body.paymentMethod as string
  const notes = body.notes ? String(body.notes) : null

  if (!(amount > 0)) {
    return { data: null, error: { message: '还款金额必须大于 0', code: 'INVALID_PARAMS' } }
  }

  if (!['cash', 'wechat', 'alipay'].includes(paymentMethod)) {
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
          type: 'repay',
          notes,
          operator: 'system',
        },
      })

      const updated = await tx.customer.update({
        where: { id },
        data: {
          balance: { increment: amount },
          // totalOwed 不变（业务规则：只增不减）
        },
      })

      return { customer: updated, payment }
    })

    return { data: result, error: null }
  } catch (error) {
    return respondWithPrismaError(event, error, '还款失败')
  }
})
