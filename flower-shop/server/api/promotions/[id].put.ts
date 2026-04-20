import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) return { data: null, error: { message: '参数错误', code: 'BAD_PARAMS' } }

  const body = await readBody<{
    name?: string
    threshold?: number
    reduction?: number
    status?: string
    startAt?: string | null
    endAt?: string | null
  }>(event)

  const data: any = {}
  if (body?.name !== undefined) data.name = String(body.name).trim()
  if (body?.threshold !== undefined) data.threshold = Number(body.threshold)
  if (body?.reduction !== undefined) data.reduction = Number(body.reduction)
  if (body?.status !== undefined) data.status = body.status === 'inactive' ? 'inactive' : 'active'
  if (body?.startAt !== undefined) data.startAt = body.startAt ? new Date(body.startAt) : null
  if (body?.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null

  if (data.threshold !== undefined && !(data.threshold > 0)) {
    return { data: null, error: { message: '门槛必须大于 0', code: 'BAD_PARAMS' } }
  }
  if (data.reduction !== undefined && !(data.reduction > 0)) {
    return { data: null, error: { message: '减免金额必须大于 0', code: 'BAD_PARAMS' } }
  }
  if (data.threshold !== undefined && data.reduction !== undefined && data.reduction >= data.threshold) {
    return { data: null, error: { message: '减免金额必须小于门槛', code: 'BAD_PARAMS' } }
  }

  try {
    const updated = await prisma.promotion.update({ where: { id }, data })
    return { data: updated, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '更新失败', code: 'UPDATE_ERROR' } }
  }
})
