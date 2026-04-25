import { prisma } from '../../../utils/prisma'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetDate = query.date ? new Date(String(query.date)) : new Date()
  if (Number.isNaN(targetDate.getTime())) {
    throw createError({ statusCode: 400, message: '日期格式错误' })
  }

  const orders = await prisma.order.findMany({
    where: {
      orderType: 'preorder',
      status: { not: 'cancelled' },
      deliveryTime: { gte: startOfDay(targetDate), lt: endOfDay(targetDate) },
    },
    include: {
      items: { include: { product: true } },
    },
  })

  const productMap = new Map<number, any>()
  let totalQty = 0
  let totalAmount = 0
  let unmadeCount = 0
  let deliveryCount = 0
  let pickupCount = 0

  for (const order of orders) {
    totalAmount += Number(order.totalAmount || 0)
    if (!order.isMade) unmadeCount += 1
    if (order.fulfillmentType === 'pickup') pickupCount += 1
    else deliveryCount += 1

    for (const item of order.items) {
      const current = productMap.get(item.productId) || {
        productId: item.productId,
        productName: item.product?.name || '未命名商品',
        imageUrl: item.imageUrl || item.product?.imageUrl || '',
        orderIds: new Set<number>(),
        orderCount: 0,
        totalQty: 0,
        totalAmount: 0,
      }
      current.orderIds.add(order.id)
      current.orderCount = current.orderIds.size
      current.totalQty += Number(item.qty || 0)
      current.totalAmount += Number(item.subtotal || 0)
      totalQty += Number(item.qty || 0)
      productMap.set(item.productId, current)
    }
  }

  const rows = Array.from(productMap.values())
    .map(({ orderIds, ...row }) => row)
    .sort((a, b) => b.totalQty - a.totalQty)

  return {
    data: rows,
    summary: {
      orderCount: orders.length,
      totalQty,
      totalAmount,
      unmadeCount,
      deliveryCount,
      pickupCount,
    },
    error: null,
  }
})
