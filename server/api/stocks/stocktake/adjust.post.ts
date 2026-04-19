import { prisma } from '../../../utils/prisma'
import { getCurrentUser } from '../../../utils/auth'

/**
 * 盘点差额调整
 * body: { productId: number, actualQty: number, reason?: string }
 *
 * 行为：
 *   - 汇总当前商品所有 in_stock 批次的 currentQty = systemQty
 *   - delta = actualQty - systemQty
 *   - delta < 0（系统多、实际少）：从最新批次 FIFO 反向扣减，写 StockMovement(type='stocktake_loss')
 *   - delta > 0（系统少、实际多）：新建"盘盈"批次 batchNo=STK-<productId>-<timestamp>，写 StockMovement(type='stocktake_gain')
 *   - delta = 0：无动作
 * $transaction 保证原子
 */
export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload) return { data: null, error: { message: '未登录', code: 'UNAUTHORIZED' } }

  const body = await readBody<{ productId?: number; actualQty?: number; reason?: string }>(event)
  const productId = Number(body?.productId)
  const actualQty = Number(body?.actualQty)
  const reason = (body?.reason || '').trim() || '盘点调整'

  if (!productId) return { data: null, error: { message: '商品 ID 必填', code: 'BAD_PARAMS' } }
  if (!(actualQty >= 0)) {
    return { data: null, error: { message: '实际数量必须 >= 0', code: 'BAD_PARAMS' } }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('商品不存在')

      const batches = await tx.stockBatch.findMany({
        where: { productId, status: 'in_stock', currentQty: { gt: 0 } },
        orderBy: { inboundDate: 'desc' }, // 盘亏从新批次倒扣（避免动老批次的可追溯效期）
      })
      const systemQty = batches.reduce((s, b) => s + b.currentQty, 0)
      const delta = actualQty - systemQty

      if (Math.abs(delta) < 1e-6) {
        return {
          productId,
          systemQty,
          actualQty,
          delta: 0,
          message: '系统库存与实际一致，无需调整',
        }
      }

      const operator = payload.sub ? `user#${payload.sub}` : undefined

      if (delta < 0) {
        // 盘亏：倒扣
        let remaining = -delta
        for (const b of batches) {
          if (remaining <= 0) break
          const take = Math.min(b.currentQty, remaining)
          const newQty = b.currentQty - take
          await tx.stockBatch.update({
            where: { id: b.id },
            data: {
              currentQty: newQty,
              status: newQty <= 0 ? 'sold_out' : b.status,
            },
          })
          await tx.stockMovement.create({
            data: {
              batchId: b.id,
              type: 'stocktake_loss',
              qtyChange: -take,
              operator,
              notes: reason,
            },
          })
          remaining -= take
        }
      } else {
        // 盘盈：新建批次
        const batchNo = `STK-${productId}-${Date.now()}`
        const now = new Date()
        const expiryDate = new Date(now)
        expiryDate.setDate(expiryDate.getDate() + (product.shelfLifeDays || 7))
        const batch = await tx.stockBatch.create({
          data: {
            productId,
            batchNo,
            inboundDate: now,
            expiryDate,
            inboundQty: delta,
            currentQty: delta,
            costPrice: 0,
            status: 'in_stock',
            notes: `[盘盈] ${reason}`,
          },
        })
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: 'stocktake_gain',
            qtyChange: delta,
            operator,
            notes: reason,
          },
        })
      }

      return { productId, systemQty, actualQty, delta }
    })

    return { data: result, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '盘点调整失败', code: 'ADJUST_ERROR' } }
  }
})
