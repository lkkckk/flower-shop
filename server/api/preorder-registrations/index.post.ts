import { createHash } from 'node:crypto'
import { prisma } from '../../utils/prisma'
import { requireStaff } from '../../utils/auth'
import { audit } from '../../utils/businessTransaction'
import { preorderImagePath } from '../../utils/preorderImages'
import { validateRegistrationAmount, serializeRegistration } from '../../utils/preorderRegistrationAmounts'
import { readBody, createError, defineEventHandler } from 'h3'

function validateQty(val: any): string {
  const s = String(val ?? '').trim()
  if (!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(s)) {
    throw createError({ statusCode: 400, message: '商品数量必须大于零且最多保留三位小数' })
  }
  const n = parseFloat(s)
  if (n <= 0 || !Number.isFinite(n)) {
    throw createError({ statusCode: 400, message: '商品数量必须大于零' })
  }
  return s
}

export default defineEventHandler(async (event) => {
  const actor = requireStaff(event).sub
  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: '无效的请求体' })
  }

  const orderNo = String(body.orderNo || '').trim()
  if (!orderNo) {
    throw createError({ statusCode: 400, message: '请填写订单编号' })
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    throw createError({ statusCode: 400, message: '至少需要添加一项商品' })
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const name = String(it.name || '').trim()
    if (!name) {
      throw createError({ statusCode: 400, message: `第 ${i + 1} 项商品请填写商品名称` })
    }
    validateQty(it.qty)
    validateRegistrationAmount(it.amount, i)
    const photos = Array.isArray(it.photos) ? it.photos : []
    for (const p of photos) {
      if (!p.url || typeof p.url !== 'string' || !p.url.startsWith('/preorder-images/')) {
        throw createError({ statusCode: 400, message: '存在无效的照片地址' })
      }
      const filename = p.url.slice('/preorder-images/'.length)
      const absPath = preorderImagePath(filename)
      if (!absPath) {
        throw createError({ statusCode: 400, message: '照片文件名格式非法' })
      }
    }
  }

  const key = body.idempotencyKey
  if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
    throw createError({ statusCode: 400, message: '请提供 8–128 字符的 idempotencyKey' })
  }

  const action = 'preorder_registration.create'
  const opId = `${actor}:${action}:${key}`
  const requestHash = createHash('sha256').update(JSON.stringify({ path: '/api/preorder-registrations', body })).digest('hex')

  const deliveryTime = body.deliveryTime ? new Date(body.deliveryTime) : null
  if (deliveryTime && isNaN(deliveryTime.getTime())) {
    throw createError({ statusCode: 400, message: '取花/送花时间格式无效' })
  }

  try {
    return await prisma.$transaction(async (tx: any) => {
      const previous = await tx.operation.findUnique({ where: { id: opId } })
      if (previous) {
        if (previous.requestHash !== requestHash) {
          throw createError({ statusCode: 409, message: '该幂等键已用于不同请求' })
        }
        return { data: previous.result, error: null }
      }

      const created = await tx.preorderRegistration.create({
        data: {
          orderNo,
          contactPhone: body.contactPhone ? String(body.contactPhone).trim() : null,
          deliveryTime,
          notes: body.notes ? String(body.notes) : null,
          cardMessage: body.cardMessage ? String(body.cardMessage) : null,
          version: 1,
          createdById: actor,
          updatedById: actor,
          items: {
            create: items.map((it: any, idx: number) => ({
              name: String(it.name).trim(),
              qty: validateQty(it.qty),
              amount: validateRegistrationAmount(it.amount, idx),
              sort: Number(it.sort) || idx,
              photos: {
                create: (Array.isArray(it.photos) ? it.photos : []).map((p: any, pIdx: number) => ({
                  url: String(p.url),
                  sort: Number(p.sort) || pIdx,
                })),
              },
            })),
          },
        },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
          items: {
            orderBy: { sort: 'asc' },
            include: {
              photos: { orderBy: { sort: 'asc' } },
            },
          },
        },
      })

      const result = JSON.parse(JSON.stringify(serializeRegistration(created)))
      await tx.operation.create({
        data: {
          id: opId,
          action,
          requestHash,
          result,
          operatorUserId: actor,
        },
      })
      await audit(tx, actor, action, 'PreorderRegistration', created.id, {
        orderNo: created.orderNo,
        itemCount: created.items.length,
      })

      return { data: result, error: null }
    })
  } catch (err: any) {
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint failed')) {
      const finished = await prisma.operation.findUnique({ where: { id: opId } })
      if (finished) {
        if (finished.requestHash !== requestHash) {
          throw createError({ statusCode: 409, message: '该幂等键已用于不同请求' })
        }
        return { data: finished.result, error: null }
      }
    }
    throw err
  }
})
