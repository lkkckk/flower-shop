import { prisma } from '../../../utils/prisma'
import { allocatePreorderItems } from '../../../utils/stockAllocator'
import {
  canTransition,
  isStockDeducted,
  type PreorderStatus,
} from '../../../../shared/preorderStatus'

/**
 * 推进预售单状态。
 *
 * 请求体： { to: PreorderStatus }
 *
 * 关键逻辑：
 * - 合法性校验：必须是 `canTransition(from, to)` 允许的流转。
 * - 进入 `in_production` 时，调用 `allocatePreorderItems` 真正分配批次 + 扣库存 + 写 StockMovement。
 * - 取消（cancelled）：若已扣库存，本阶段返回 400，提示人工处理（留 TODO：补偿库存）。
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: '无效的订单 id' })
  const body = await readBody(event)
  const to = body?.to as PreorderStatus

  if (!to) throw createError({ statusCode: 400, message: '目标状态必填' })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } })
      if (!order || order.orderType !== 'preorder') {
        throw Object.assign(new Error('预售单不存在'), { statusCode: 404 })
      }
      const from = order.status as PreorderStatus
      if (!canTransition(from, to)) {
        throw Object.assign(new Error(`不允许从 ${from} 流转到 ${to}`), { statusCode: 400 })
      }

      // 已扣库存的预售单取消：按 OrderItem.batchId 反向回补 currentQty + 写 StockMovement
      if (to === 'cancelled' && isStockDeducted(from)) {
        const items = await tx.orderItem.findMany({
          where: { orderId: id },
          select: { id: true, batchId: true, baseQty: true },
        })
        for (const it of items) {
          if (!it.batchId || !(it.baseQty > 0)) continue
          const batch = await tx.stockBatch.findUnique({ where: { id: it.batchId } })
          if (!batch) {
            // 极端情况：批次已被删除，无法补偿，提示人工介入
            throw Object.assign(
              new Error(`关联批次(id=${it.batchId})已不存在，无法自动回补，请联系管理员`),
              { statusCode: 400, code: 'STOCK_REFUND_BATCH_MISSING' },
            )
          }
          await tx.stockBatch.update({
            where: { id: it.batchId },
            data: { currentQty: { increment: it.baseQty }, status: 'in_stock' },
          })
          await tx.stockMovement.create({
            data: {
              batchId: it.batchId,
              type: 'cancel_refund',
              qtyChange: it.baseQty,
              relatedOrderId: id,
              operator: 'system',
              notes: `预售单取消回补 OrderItem#${it.id}`,
            },
          })
        }
      }

      if (to === 'in_production' && !isStockDeducted(from)) {
        await allocatePreorderItems(tx, id, 'system')
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: to },
        include: { items: true, customer: true },
      })
      return updated
    })

    return { data: result, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message || '状态流转失败',
        code: error.code || 'ADVANCE_FAILED',
        shortages: error.shortages || undefined,
      },
    }
  }
})
