import { getCurrentUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload) {
    return { data: null, error: { message: '未登录', code: 'UNAUTHORIZED' } }
  }

  if (payload.type === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, role: true, status: true, createdAt: true },
    })
    if (!user) return { data: null, error: { message: '用户不存在', code: 'NOT_FOUND' } }
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
  if (!customer) return { data: null, error: { message: '顾客不存在', code: 'NOT_FOUND' } }
  return { data: { type: 'customer', customer }, error: null }
})
