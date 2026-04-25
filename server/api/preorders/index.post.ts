import { prisma } from '../../utils/prisma'
import { computeReminderStage } from '../../../shared/preorderReminder'

/**
 * 创建预售单
 *
 * 请求体：
 * {
 *   customerId?: number | null,
 *   receiverName?: string,
 *   receiverPhone?: string,
 *   deliveryAddress?: string,
 *   deliveryTime: ISOString,
 *   fulfillmentType?: 'delivery' | 'pickup',
 *   isUrgent?: boolean,
 *   priceMode?: 'retail' | 'vip' | 'wholesale' | 'discount' | 'promotion' | 'custom',
 *   discountRate?: number,
 *   promotionId?: number | null,
 *   totalAmount?: number,
 *   notes?: string,
 *   cardMessage?: string,
 *   sourceChannel?: string,
 *   items: [
 *     { productId, qty, baseQty, unit, unitPrice, subtotal, imageUrl?, notes? }
 *   ]
 * }
 *
 * 创建时 **不分配批次、不扣库存、不写 StockMovement**。
 * OrderItem.batchId 保持 null，直到状态推进到 in_production 时由 allocatePreorderItems 分配。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.deliveryTime) {
    throw createError({ statusCode: 400, message: '履约日期必填' })
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, message: '商品不能为空' })
  }

  const deliveryTime = new Date(body.deliveryTime)
  if (Number.isNaN(deliveryTime.getTime())) {
    throw createError({ statusCode: 400, message: '履约日期格式错误' })
  }

  const fulfillmentType = body.fulfillmentType === 'pickup' ? 'pickup' : 'delivery'
  const allowedPriceModes = new Set(['retail', 'vip', 'wholesale', 'discount', 'promotion', 'custom'])
  const priceMode = allowedPriceModes.has(body.priceMode) ? body.priceMode : 'retail'
  const discountRate = priceMode === 'discount' ? Number(body.discountRate || 100) : null
  const promotionId = priceMode === 'promotion' && body.promotionId ? Number(body.promotionId) : null

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 权威商品信息：商品必须存在；预售场景允许前端传入最终成交单价，服务端做基础校验与快照保存。
      const productIds: number[] = Array.from(
        new Set(body.items.map((i: any) => Number(i.productId)).filter(Boolean)),
      )
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          defaultPrice: true,
          imageUrl: true,
          grade: true,
          color: true,
        },
      })
      const productMap = new Map(products.map((p) => [p.id, p]))

      // 生成订单号：PO + yyyyMMdd + 序号
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayCount = await tx.order.count({
        where: { orderType: 'preorder', createdAt: { gte: todayStart } },
      })
      const orderNo = `PO${dateStr}${(todayCount + 1).toString().padStart(4, '0')}`

      let itemsSubtotal = 0
      const itemRows = body.items.map((it: any) => {
        const p = productMap.get(Number(it.productId))
        if (!p) throw new Error(`商品(id=${it.productId})不存在`)
        const unitPrice = Math.max(0, Number(it.unitPrice) || p.defaultPrice)
        const qty = Math.max(0, Number(it.qty) || 0)
        const baseQty = Math.max(0, Number(it.baseQty) || qty)
        const subtotal = Math.max(0, Number(it.subtotal) || unitPrice * qty)
        itemsSubtotal += subtotal
        return {
          productId: p.id,
          unit: it.unit || 'default',
          qty,
          baseQty,
          unitPrice,
          originalPrice: p.defaultPrice,
          subtotal,
          grade: it.grade ?? p.grade ?? null,
          color: it.color ?? p.color ?? null,
          notes: it.notes ?? null,
          imageUrl: it.imageUrl ?? p.imageUrl ?? null,
        }
      })

      let totalAmount = itemsSubtotal
      if (priceMode === 'promotion' && promotionId) {
        const promotion = await tx.promotion.findUnique({ where: { id: promotionId } })
        if (!promotion || promotion.status !== 'active') throw new Error('满减活动不存在或已停用')
        if (itemsSubtotal < promotion.threshold) throw new Error('当前商品小计未达到满减门槛')
        totalAmount = Math.max(0, itemsSubtotal - promotion.reduction)
      } else if (Number(body.totalAmount) >= 0) {
        totalAmount = Number(body.totalAmount)
      }

      const reminderStage = computeReminderStage(deliveryTime)

      const order = await tx.order.create({
        data: {
          orderNo,
          orderType: 'preorder',
          customerId: body.customerId || null,
          totalAmount,
          paidAmount: 0,
          owedAmount: 0,
          status: 'pending_confirm',
          fulfillmentType,
          isUrgent: Boolean(body.isUrgent),
          isMade: false,
          sortIndex: 0,
          priceMode,
          discountRate,
          promotionId,
          notes: body.notes || null,
          cardMessage: body.cardMessage || null,
          sourceChannel: body.sourceChannel || null,
          receiverName: body.receiverName || null,
          receiverPhone: body.receiverPhone || null,
          deliveryTime,
          deliveryAddress: body.deliveryAddress || null,
          reminderStage,
          reminderUpdatedAt: new Date(),
          items: { create: itemRows },
        },
        include: { items: true },
      })

      return order
    })

    return { data: result, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '创建预售单失败', code: error.code || 'CREATE_FAILED' },
    }
  }
})
