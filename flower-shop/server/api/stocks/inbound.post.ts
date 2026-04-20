import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const productId = Number(body.productId)
  const inboundQty = Number(body.inboundQty)
  const costPrice = Number(body.costPrice)
  const notes = body.notes as string | undefined
  const inboundDateRaw = body.inboundDate

  if (!productId || !inboundDateRaw || !(inboundQty > 0) || costPrice < 0 || Number.isNaN(costPrice)) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: '入库参数不合法', code: 'INVALID_PARAMS' },
    }
  }

  try {
    const batch = await prisma.$transaction(async (tx) => {
      // 1. 查商品 + 拿 shelfLifeDays
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('商品不存在')

      const inboundDate = dayjs(inboundDateRaw).startOf('day').toDate()

      // 计算到期日（如果 body 有 expiryDate 则用，否则用商品的 shelfLifeDays 算）
      const expiryDate = body.expiryDate
        ? dayjs(body.expiryDate).startOf('day').toDate()
        : dayjs(inboundDate).add(product.shelfLifeDays, 'day').toDate()

      // 2. 生成批次号 B + yyyyMMdd + 3位日内序号
      const dayStart = dayjs(inboundDate).startOf('day').toDate()
      const dayEnd = dayjs(inboundDate).endOf('day').toDate()

      const todayCount = await tx.stockBatch.count({
        where: {
          inboundDate: { gte: dayStart, lte: dayEnd },
        },
      })

      const dateStr = dayjs(inboundDate).format('YYYYMMDD')
      const batchNo = `B${dateStr}${(todayCount + 1).toString().padStart(3, '0')}`

      // 3. 创建批次
      const created = await tx.stockBatch.create({
        data: {
          productId,
          batchNo,
          inboundDate,
          expiryDate,
          inboundQty,
          currentQty: inboundQty,
          costPrice,
          status: 'in_stock',
          notes: notes || null,
        },
        include: {
          product: true,
        },
      })

      // 4. 创建一条入库流水
      await tx.stockMovement.create({
        data: {
          batchId: created.id,
          type: 'inbound',
          qtyChange: inboundQty,
          operator: 'system',
          notes: notes || null,
        },
      })

      return created
    })

    return {
      data: batch,
      error: null,
    }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '入库失败', code: 'INBOUND_FAILED' },
    }
  }
})
