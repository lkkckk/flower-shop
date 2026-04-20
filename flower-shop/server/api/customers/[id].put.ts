import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的客户 ID', code: 'INVALID_PARAMS' } }
  }

  const body = await readBody(event)
  const name = (body.name || '').trim()
  const phone = body.phone ? String(body.phone).trim() : null
  const address = body.address ?? null
  const level = body.level || 'normal'
  const notes = body.notes ?? null

  if (!name) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '请填写客户姓名', code: 'INVALID_PARAMS' } }
  }

  if (!['normal', 'member', 'vip', 'wholesale'].includes(level)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '客户等级不合法', code: 'INVALID_PARAMS' } }
  }

  try {
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      setResponseStatus(event, 404)
      return { data: null, error: { message: '客户不存在', code: 'NOT_FOUND' } }
    }

    // 校验手机号唯一性（如果改了手机号）
    if (phone && phone !== existing.phone) {
      const conflict = await prisma.customer.findUnique({ where: { phone } })
      if (conflict && conflict.id !== id) {
        setResponseStatus(event, 400)
        return {
          data: null,
          error: { message: '该手机号已被其他客户使用', code: 'PHONE_EXISTS' },
        }
      }
    }

    // 显式排除 balance 和 totalOwed
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
        address,
        level,
        notes,
      },
    })

    return { data: updated, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '更新客户失败', code: 'UPDATE_ERROR' },
    }
  }
})
