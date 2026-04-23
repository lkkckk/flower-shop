import { prisma } from '../../utils/prisma'
import { computeReminderStage } from '../../../shared/preorderReminder'
import { isStockDeducted, type PreorderStatus } from '../../../shared/preorderStatus'

/**
 * 编辑预售单基础信息（不含状态流转，状态流转走 advance.post）。
 *
 * 修改履约日期时会同步重算 reminderStage。
 * 已扣库存的订单（in_production 及以后）不允许修改商品清单，只能改配送/备注字段。
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的订单 id' })
  const body = await readBody(event)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, include: { items: true } })
      if (!existing || existing.orderType !== 'preorder') {
        throw Object.assign(new Error('预售单不存在'), { statusCode: 404 })
      }
      const status = existing.status as PreorderStatus
      const stockLocked = isStockDeducted(status) || status === 'cancelled'

      const update: any = {}
      if ('receiverName' in body) update.receiverName = body.receiverName || null
      if ('receiverPhone' in body) update.receiverPhone = body.receiverPhone || null
      if ('deliveryAddress' in body) update.deliveryAddress = body.deliveryAddress || null
      if ('notes' in body) update.notes = body.notes || null
      if ('cardMessage' in body) update.cardMessage = body.cardMessage || null
      if ('sourceChannel' in body) update.sourceChannel = body.sourceChannel || null
      if ('customerId' in body) update.customerId = body.customerId || null

      if ('deliveryTime' in body) {
        const t = new Date(body.deliveryTime)
        if (Number.isNaN(t.getTime())) throw new Error('履约日期格式错误')
        update.deliveryTime = t
        update.reminderStage = computeReminderStage(t)
        update.reminderUpdatedAt = new Date()
      }

      // 商品行修改：仅在未扣库存前允许
      if (Array.isArray(body.items)) {
        if (stockLocked) {
          throw Object.assign(new Error('该状态下不允许修改商品清单'), { statusCode: 400 })
        }
        await tx.orderItem.deleteMany({ where: { orderId: id } })
        const productIds = Array.from(new Set(body.items.map((i: any) => Number(i.productId))))
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, defaultPrice: true, imageUrl: true, grade: true, color: true },
        })
        const productMap = new Map(products.map((p) => [p.id, p]))

        let totalAmount = 0
        for (const it of body.items) {
          const p = productMap.get(Number(it.productId))
          if (!p) throw new Error(`商品(id=${it.productId})不存在`)
          const unitPrice = Number(it.unitPrice) > 0 ? Number(it.unitPrice) : p.defaultPrice
          const qty = Number(it.qty) || 0
          const subtotal = Number(it.subtotal) > 0 ? Number(it.subtotal) : unitPrice * qty
          totalAmount += subtotal
          await tx.orderItem.create({
            data: {
              orderId: id,
              productId: p.id,
              unit: it.unit || 'default',
              qty,
              baseQty: Number(it.baseQty) || qty,
              unitPrice,
              originalPrice: p.defaultPrice,
              subtotal,
              grade: it.grade ?? p.grade ?? null,
              color: it.color ?? p.color ?? null,
              notes: it.notes ?? null,
              imageUrl: it.imageUrl ?? p.imageUrl ?? null,
            },
          })
        }
        update.totalAmount = totalAmount
      }

      const updated = await tx.order.update({
        where: { id },
        data: update,
        include: { items: true, customer: true },
      })
      return updated
    })

    return { data: result, error: null }
  } catch (error: any) {
    const code = error.statusCode || 400
    setResponseStatus(event, code)
    return {
      data: null,
      error: { message: error.message || '更新预售单失败', code: 'UPDATE_FAILED' },
    }
  }
})
