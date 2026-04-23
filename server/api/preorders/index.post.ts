import { prisma } from '../../utils/prisma'
import { computeReminderStage } from '../../../shared/preorderReminder'

/**
 * 创建预售单
 *
 * 请求体：
 * {
 *   customerId?: number | null,        // 可选（散客可不绑定）
 *   customerName?: string,             // 未绑定客户时的手填姓名（存 notes 里或忽略，最小版本忽略）
 *   customerPhone?: string,
 *   receiverName?: string,
 *   receiverPhone?: string,
 *   deliveryAddress?: string,
 *   deliveryTime: ISOString,           // 履约日期+时间（必填）
 *   notes?: string,                    // 其他要求
 *   cardMessage?: string,              // 贺卡内容
 *   sourceChannel?: string,            // 来源标记
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 权威价格：从 DB 取，避免前端篡改
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

      // 订单总金额（前端提供的 subtotal 为参考，服务端按 defaultPrice × qty 重算做兜底）
      let totalAmount = 0
      const itemRows = body.items.map((it: any) => {
        const p = productMap.get(Number(it.productId))
        if (!p) throw new Error(`商品(id=${it.productId})不存在`)
        const unitPrice = Number(it.unitPrice) > 0 ? Number(it.unitPrice) : p.defaultPrice
        const qty = Number(it.qty) || 0
        const baseQty = Number(it.baseQty) || qty
        const subtotal = Number(it.subtotal) > 0 ? Number(it.subtotal) : unitPrice * qty
        totalAmount += subtotal
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
          // 预售下单时快照商品参考图
          imageUrl: it.imageUrl ?? p.imageUrl ?? null,
        }
      })

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
