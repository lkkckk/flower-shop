import type { Prisma } from '@prisma/client'

/**
 * 单个待分配的商品行
 */
export interface AllocationItem {
  productId: number
  unit: string
  /** 下单单位的数量（如 5 扎） */
  qty: number
  /** 换算到基础单位的数量（用于扣库存） */
  baseQty: number
  /** 权威成交单价（已应用 priceMode 重算） */
  unitPrice: number
  /** 该行合计（已应用促销摊销） */
  subtotal: number
  /** 审计用原价 */
  originalPrice?: number | null
  /** 商品参考图快照（预售场景） */
  imageUrl?: string | null
  /** 展示用商品名（仅错误文案使用，可选） */
  productName?: string
  grade?: string | null
  color?: string | null
  notes?: string | null
}

/**
 * 按 FIFO（最早入库日期）从 StockBatch 扣减库存，为订单创建 OrderItem + StockMovement。
 *
 * 单行 qty 若跨多个批次，会按比例拆成多条 OrderItem（与原 checkout 行为一致）。
 *
 * 必须在 `prisma.$transaction` 内调用。
 *
 * @throws 库存不足时抛错，由调用方事务回滚。
 */
export async function allocateAndDeduct(
  tx: Prisma.TransactionClient,
  orderId: number,
  items: AllocationItem[],
  operator: string = 'system',
): Promise<void> {
  for (const item of items) {
    let remaining = Number(item.baseQty)
    const totalBase = remaining
    if (totalBase <= 0) continue

    const batches = await tx.stockBatch.findMany({
      where: { productId: item.productId, status: 'in_stock', currentQty: { gt: 0 } },
      orderBy: { inboundDate: 'asc' },
    })

    for (const batch of batches) {
      if (remaining <= 0) break
      const take = Math.min(batch.currentQty, remaining)
      remaining -= take

      const newQty = batch.currentQty - take
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQty: newQty,
          status: newQty <= 0 ? 'sold_out' : 'in_stock',
        },
      })

      await tx.stockMovement.create({
        data: {
          batchId: batch.id,
          type: 'sale',
          qtyChange: -take,
          relatedOrderId: orderId,
          operator,
        },
      })

      const proportion = take / totalBase
      await tx.orderItem.create({
        data: {
          orderId,
          productId: item.productId,
          batchId: batch.id,
          unit: item.unit,
          qty: Number(item.qty) * proportion,
          baseQty: take,
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice ?? null,
          subtotal: item.subtotal * proportion,
          grade: item.grade ?? null,
          color: item.color ?? null,
          notes: item.notes ?? null,
          imageUrl: item.imageUrl ?? null,
        },
      })
    }

    if (remaining > 0) {
      throw Object.assign(
        new Error(
          `商品【${item.productName || item.productId}】库存不足（还缺 ${remaining} 基础单位）`,
        ),
        { code: 'INSUFFICIENT_STOCK' },
      )
    }
  }
}

/**
 * 把预售单的占位 OrderItem（batchId=null）转换为已分配批次的实销 OrderItem。
 *
 * 流程：读出该订单所有 batchId=null 的 OrderItem → 删除 → 调用 allocateAndDeduct 重建。
 *
 * 必须在 `prisma.$transaction` 内调用。
 */
export async function allocatePreorderItems(
  tx: Prisma.TransactionClient,
  orderId: number,
  operator: string = 'system',
): Promise<void> {
  const placeholders = await tx.orderItem.findMany({
    where: { orderId, batchId: null },
    include: { product: { select: { name: true } } },
  })
  if (placeholders.length === 0) return

  const items: AllocationItem[] = placeholders.map((row) => ({
    productId: row.productId,
    unit: row.unit,
    qty: row.qty,
    baseQty: row.baseQty,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
    originalPrice: row.originalPrice,
    imageUrl: row.imageUrl,
    productName: row.product?.name,
    grade: row.grade,
    color: row.color,
    notes: row.notes,
  }))

  await tx.orderItem.deleteMany({ where: { orderId, batchId: null } })
  await allocateAndDeduct(tx, orderId, items, operator)
}
