import { prisma } from '../../utils/prisma'
import { allocateAndDeduct, type AllocationItem } from '../../utils/stockAllocator'
import { computeOrder, type PriceMode } from '../../../shared/priceMode'

/**
 * 结算接口
 *
 * 请求体：
 *   {
 *     cart: {
 *       customerId?: number | null,
 *       notes?: string,
 *       priceMode?: 'retail' | 'vip' | 'wholesale' | 'discount' | 'promotion',
 *       discountRate?: number,      // 0-100，仅 priceMode='discount' 时使用
 *       promotionId?: number | null,// 仅 priceMode='promotion' 时使用
 *       discount?: number,          // 兼容：手工折扣金额（额外减免）
 *       items: [
 *         { productId, qty, baseQty, unit, unitPrice, subtotal, productName?, ...}
 *       ]
 *     },
 *     payment: { method, paidAmount, owedAmount }
 *   }
 *
 * 服务端会根据 priceMode + 数据库中的商品权威价格 **重新计算** 每行单价与总额，
 * 不信任前端传来的 unitPrice（防篡改），再落单。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cart = body?.cart
  const payment = body?.payment

  if (!cart || !payment) {
    throw createError({ statusCode: 400, message: '无效的请求数据' })
  }
  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    throw createError({ statusCode: 400, message: '购物车为空' })
  }

  const priceMode: PriceMode = (
    ['retail', 'vip', 'wholesale', 'discount', 'promotion'].includes(cart.priceMode)
      ? cart.priceMode
      : 'retail'
  ) as PriceMode

  const discountRate: number | undefined =
    priceMode === 'discount' && typeof cart.discountRate === 'number'
      ? cart.discountRate
      : undefined

  const promotionId: number | null =
    priceMode === 'promotion' && cart.promotionId ? Number(cart.promotionId) : null

  try {
    const result = await prisma.$transaction(async (tx) => {
      // === 1. 拉取权威商品价格 + 促销规则 ===
      const productIds: number[] = Array.from(
        new Set(cart.items.map((i: any) => Number(i.productId)).filter(Boolean)),
      )
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          defaultPrice: true,
          vipPrice: true,
          wholesalePrice: true,
          baseUnit: true,
          unitConversions: { select: { fromUnit: true, toBaseQty: true } },
        },
      })
      const productMap = new Map(products.map((p) => [p.id, p]))

      let promotion: { id: number; threshold: number; reduction: number } | null = null
      if (promotionId) {
        const p = await tx.promotion.findUnique({ where: { id: promotionId } })
        if (!p || p.status !== 'active') {
          throw new Error('促销活动不存在或已停用')
        }
        const now = new Date()
        if (p.startAt && p.startAt > now) throw new Error('促销活动尚未开始')
        if (p.endAt && p.endAt < now) throw new Error('促销活动已过期')
        promotion = { id: p.id, threshold: p.threshold, reduction: p.reduction }
      }

      // === 2. 构造重算输入 ===
      const lineInputs = cart.items.map((it: any) => {
        const p = productMap.get(Number(it.productId))
        if (!p) throw new Error(`商品(id=${it.productId})不存在`)
        let toBaseQty = 1
        if (it.unit && it.unit !== p.baseUnit) {
          const conv = p.unitConversions.find((u) => u.fromUnit === it.unit)
          if (conv) toBaseQty = conv.toBaseQty
        }
        return {
          basis: {
            defaultPrice: p.defaultPrice,
            vipPrice: p.vipPrice,
            wholesalePrice: p.wholesalePrice,
          },
          qty: Number(it.qty),
          toBaseQty,
        }
      })

      const priceResult = computeOrder({
        items: lineInputs,
        mode: priceMode,
        discountRate,
        promotion,
      })

      if (priceMode === 'promotion' && !priceResult.promotionApplicable) {
        throw Object.assign(new Error('当前合计未达到满减门槛'), {
          code: 'PROMOTION_NOT_APPLICABLE',
        })
      }

      // 额外手工整单折扣（历史字段，保留兼容）
      const extraDiscount = Math.max(0, Number(cart.discount) || 0)
      const totalAmount = Math.max(0, priceResult.total - extraDiscount)

      // === 3. 生成订单号 ===
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const orderCount = await tx.order.count({
        where: { createdAt: { gte: todayStart } },
      })
      const orderNo = `O${dateStr}${(orderCount + 1).toString().padStart(4, '0')}`

      // === 4. 订单状态 ===
      let status = 'pending'
      if (payment.paidAmount >= totalAmount && totalAmount > 0) status = 'paid'
      else if (payment.paidAmount > 0) status = 'partial'
      if (payment.method === 'credit' || payment.owedAmount === totalAmount) status = 'unpaid'
      if (payment.paidAmount >= totalAmount) status = 'paid'

      // === 5. 创建主订单 ===
      const order = await tx.order.create({
        data: {
          orderNo,
          orderType: priceMode === 'wholesale' ? 'wholesale' : 'retail',
          customerId: cart.customerId || null,
          totalAmount,
          paidAmount: payment.paidAmount,
          owedAmount: payment.owedAmount,
          status,
          notes: cart.notes,
          priceMode,
          discountRate: priceMode === 'discount' ? discountRate ?? null : null,
          promotionId: promotion?.id ?? null,
        },
      })

      // === 6. 扣库存 + 写 OrderItem + 写 StockMovement（统一走 stockAllocator） ===
      const allocInputs: AllocationItem[] = cart.items.map((item: any, idx: number) => ({
        productId: Number(item.productId),
        unit: item.unit,
        qty: Number(item.qty),
        baseQty: Number(item.baseQty),
        unitPrice: priceResult.lineUnitPrices[idx],
        subtotal: priceResult.lineSubtotals[idx],
        originalPrice: productMap.get(Number(item.productId))?.defaultPrice ?? null,
        productName: item.productName,
      }))
      await allocateAndDeduct(tx, order.id, allocInputs, 'system')

      // === 7. 客户余额/欠款/积分 ===
      if (cart.customerId) {
        const customerUpdate: any = {}
        if (payment.owedAmount > 0) {
          customerUpdate.balance = { decrement: payment.owedAmount }
          customerUpdate.totalOwed = { increment: payment.owedAmount }
        }
        const earnedPoints = Math.floor(totalAmount)
        if (earnedPoints > 0) customerUpdate.points = { increment: earnedPoints }
        if (Object.keys(customerUpdate).length > 0) {
          await tx.customer.update({ where: { id: cart.customerId }, data: customerUpdate })
        }
      }

      // === 8. 收款流水 ===
      if (payment.paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            customerId: cart.customerId || null,
            amount: payment.paidAmount,
            paymentMethod: payment.method,
            type: 'income',
            operator: 'system',
          },
        })
      }

      return { order, priceResult, totalAmount }
    })

    return {
      data: {
        order: result.order,
        total: result.totalAmount,
        subtotal: result.priceResult.subtotal,
        reduction: result.priceResult.reduction,
        priceMode,
        message: '结账成功',
      },
      error: null,
    }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '结账失败', code: error.code || 'CHECKOUT_FAILED' },
    }
  }
})
