import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const batchId = Number(body.batchId)
  const qty = Number(body.qty)
  const reason = body.reason ? String(body.reason) : null

  if (!batchId || isNaN(batchId)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的批次 ID', code: 'INVALID_PARAMS' } }
  }

  if (!(qty > 0)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '报损数量必须大于 0', code: 'INVALID_PARAMS' } }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('批次不存在')
      if (batch.status !== 'in_stock') throw new Error('该批次状态不允许报损')
      if (qty > batch.currentQty) throw new Error(`报损数量不能超过当前库存 (${batch.currentQty})`)

      const newQty = batch.currentQty - qty
      const updatedBatch = await tx.stockBatch.update({
        where: { id: batchId },
        data: {
          currentQty: newQty,
          status: newQty <= 0 ? 'scrapped' : 'in_stock',
        },
      })

      const movement = await tx.stockMovement.create({
        data: {
          batchId,
          type: 'scrap',
          qtyChange: -qty,
          notes: reason,
          operator: 'system',
        },
      })

      return { batch: updatedBatch, movement }
    })

    return { data: result, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '报损失败', code: 'SCRAP_FAILED' },
    }
  }
})
