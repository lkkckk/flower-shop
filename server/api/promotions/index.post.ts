import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

/**
 * 新建促销活动（满 X 减 Y）
 */
export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const body = await readBody<{
    name?: string
    threshold?: number
    reduction?: number
    status?: string
    startAt?: string | null
    endAt?: string | null
  }>(event)

  const name = (body?.name || '').trim()
  const threshold = Number(body?.threshold)
  const reduction = Number(body?.reduction)

  if (!name) return { data: null, error: { message: '活动名称必填', code: 'BAD_PARAMS' } }
  if (!(threshold > 0)) return { data: null, error: { message: '门槛必须大于 0', code: 'BAD_PARAMS' } }
  if (!(reduction > 0)) return { data: null, error: { message: '减免金额必须大于 0', code: 'BAD_PARAMS' } }
  if (reduction >= threshold) {
    return { data: null, error: { message: '减免金额必须小于门槛', code: 'BAD_PARAMS' } }
  }

  try {
    const created = await prisma.promotion.create({
      data: {
        name,
        type: 'full_reduction',
        threshold,
        reduction,
        status: body?.status === 'inactive' ? 'inactive' : 'active',
        startAt: body?.startAt ? new Date(body.startAt) : null,
        endAt: body?.endAt ? new Date(body.endAt) : null,
      },
    })
    return { data: created, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '创建失败', code: 'CREATE_ERROR' } }
  }
})
