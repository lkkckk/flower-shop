import { getCurrentUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { message: '未登录或凭证已过期', code: 'UNAUTHORIZED' },
    })
  }

  if (payload.type === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, role: true, status: true },
    })
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { message: '用户不存在', code: 'USER_NOT_FOUND' },
      })
    }
    if (user.status !== 'active') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        data: { message: '账号已被停用', code: 'USER_DISABLED' },
      })
    }
    return { data: { type: 'staff', user }, error: null }
  }

  // customer
  const customer = await prisma.customer.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      phone: true,
      level: true,
      balance: true,
      totalOwed: true,
      points: true,
      openid: true,
      nickname: true,
      avatarUrl: true,
    },
  })
  if (!customer) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { message: '顾客不存在', code: 'CUSTOMER_NOT_FOUND' },
    })
  }
  return { data: { type: 'customer', customer }, error: null }
})
