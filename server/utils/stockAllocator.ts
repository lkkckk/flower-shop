import { money, quantity, positive, decimal } from '../../shared/money'
import { normalBatchQuantity } from '../../shared/batchAvailability'
export interface AllocationItem {
  productId: number; unit: string; qty: any; baseQty: any; unitPrice: any; subtotal: any
  originalPrice?: any; imageUrl?: string | null; productName?: string; grade?: string | null
  color?: string | null; notes?: string | null; specialBatchId?: number
}

export async function allocateAndDeduct(tx: any, orderId: number, items: AllocationItem[], operator = 'system'): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(72410903)`
  const actor = Number(operator) || null
  for (const input of items) {
    const product = await tx.product.findUnique({ where: { id: input.productId }, include: { recipe: { include: { items: { include: { componentProduct: { include: { unitConversions: true } } } } } } } })
    if (!product || product.status !== 'active') throw new Error('商品不存在或已下架')
    const components = product.recipe?.enabled ? product.recipe.items : []
    const requirements = components.length ? components.map((c: any) => {
      const conversion = c.unit === c.componentProduct.baseUnit ? 1 : c.componentProduct.unitConversions.find((u: any) => u.fromUnit === c.unit)?.toBaseQty
      if (!conversion) throw new Error('配方单位换算缺失')
      return { productId: c.componentProductId, qty: decimal(input.baseQty).times(c.qty).times(conversion) }
    }) : [{ productId: input.productId, qty: positive(input.baseQty, 3) }]
    const { specialBatchId, productName, ...itemData } = input
    const row = await tx.orderItem.create({ data: { ...itemData, orderId, batchId: null } })
    for (const req of requirements) {
      if (req.qty.decimalPlaces() > 3) throw new Error('配方耗用量超过三位小数')
      let remaining = req.qty
      const batches = await tx.stockBatch.findMany({ where: {
        productId: req.productId, currentQty: { gt: 0 },
        ...(specialBatchId ? { id: specialBatchId, status: 'discounted', specialUntil: { gt: new Date() } } : { status: { in: ['in_stock','discounted'] } }),
      }, orderBy: [{ inboundDate: 'asc' }, { id: 'asc' }] })
      for (const batch of batches) {
        if (remaining.lte(0)) break
        const available = specialBatchId ? decimal(batch.currentQty).clamp(0, batch.specialQty) : normalBatchQuantity(batch)
        const take = remaining.lt(available) ? remaining : available
        if (take.lte(0)) continue
        const left = quantity(batch.currentQty).minus(take)
        const specialLeft = specialBatchId ? quantity(batch.specialQty).minus(take) : quantity(batch.specialQty)
        await tx.stockBatch.update({ where: { id: batch.id }, data: { currentQty: left.toFixed(3), status: left.isZero() ? 'sold_out' : specialLeft.isZero() || (batch.specialUntil && batch.specialUntil <= new Date()) ? 'in_stock' : batch.status, ...(specialBatchId ? { specialQty: specialLeft.toFixed(3) } : {}) } })
        await tx.stockMovement.create({ data: { batchId: batch.id, type: 'sale', qtyChange: take.neg().toFixed(3), relatedOrderId: orderId, operator, operatorUserId: actor } })
        await tx.orderCostAllocation.create({ data: { orderId, orderItemId: row.id, batchId: batch.id, baseQty: take.toFixed(3), unitCost: batch.costPrice, totalCost: money(take.times(batch.costPrice)).toFixed(2) } })
        if (!components.length && !row.batchId) { await tx.orderItem.update({ where: { id: row.id }, data: { batchId: batch.id } }); row.batchId = batch.id }
        remaining = remaining.minus(take)
      }
      if (remaining.gt(0)) throw Object.assign(new Error(`库存不足：${product.name}，缺少 ${remaining.toFixed(3)}`), { code: 'INSUFFICIENT_STOCK', shortages: [{ productId: req.productId, shortageQty: remaining.toFixed(3) }] })
    }
  }
}

export async function allocatePreorderItems(tx: any, orderId: number, operator = 'system') {
  if (await tx.orderCostAllocation.count({ where: { orderId } })) throw new Error('订单已经扣减库存')
  const rows = await tx.orderItem.findMany({ where: { orderId } })
  if (!rows.length) throw new Error('预售单没有商品')
  const items = rows.map(({ id, orderId, returnedQty, batchId, ...data }: any) => data)
  await tx.orderItem.deleteMany({ where: { orderId } })
  await allocateAndDeduct(tx, orderId, items, operator)
}
