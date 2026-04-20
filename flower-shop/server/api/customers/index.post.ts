import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = (body.name || '').trim()
  const phone = body.phone ? String(body.phone).trim() : null
  const address = body.address || null
  const level = body.level || 'normal'
  const notes = body.notes || null

  if (!name) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: '请填写客户姓名', code: 'INVALID_PARAMS' },
    }
  }

  if (!['normal', 'member', 'vip', 'wholesale'].includes(level)) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: '客户等级不合法', code: 'INVALID_PARAMS' },
    }
  }

  try {
    if (phone) {
      const exists = await prisma.customer.findUnique({ where: { phone } })
      if (exists) {
        setResponseStatus(event, 400)
        return {
          data: null,
          error: { message: '该手机号已被其他客户使用', code: 'PHONE_EXISTS' },
        }
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        level,
        notes,
      },
    })

    return { data: customer, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '创建客户失败', code: 'CREATE_ERROR' },
    }
  }
})
