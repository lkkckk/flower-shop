import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const batchId = Number(body.batchId)
  const discountPrice = Number(body.discountPrice)
  const reason = body.reason ? String(body.reason) : null

  if (!batchId || isNaN(batchId)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的批次 ID', code: 'INVALID_PARAMS' } }
  }

  if (isNaN(discountPrice) || discountPrice < 0) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '折价金额不合法', code: 'INVALID_PARAMS' } }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('批次不存在')
      if (batch.status !== 'in_stock') throw new Error('该批次状态不允许折价')

      const updatedBatch = await tx.stockBatch.update({
        where: { id: batchId },
        data: {
          status: 'discounted',
        },
      })

      const movement = await tx.stockMovement.create({
        data: {
          batchId,
          type: 'discount',
          qtyChange: 0,
          notes: `折价至 ¥${discountPrice}${reason ? '：' + reason : ''}`,
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
      error: { message: error.message || '折价失败', code: 'DISCOUNT_FAILED' },
    }
  }
})
