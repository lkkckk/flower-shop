import { prisma } from '../../utils/prisma'

const MS_PER_DAY = 24 * 60 * 60 * 1000

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

function parseBoolean(value: unknown) {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function formatDateLabel(value: Date | null) {
  if (!value) return ''
  return value.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatTimeLabel(value: Date | null) {
  if (!value) return ''
  return value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function normalizeOrder(order: any) {
  const firstItem = order.items?.[0]
  return {
    id: order.id,
    orderNo: order.orderNo,
    receiverName: order.receiverName || order.customer?.name || '散客',
    receiverPhone: order.receiverPhone || order.customer?.phone || '',
    deliveryTime: order.deliveryTime,
    dateLabel: formatDateLabel(order.deliveryTime),
    timeLabel: formatTimeLabel(order.deliveryTime),
    fulfillmentType: order.fulfillmentType,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    status: order.status,
    isMade: order.isMade,
    isUrgent: order.isUrgent,
    sourceChannel: order.sourceChannel,
    cardMessage: order.cardMessage,
    notes: order.notes,
    coverImage: firstItem?.imageUrl || firstItem?.product?.imageUrl || '',
    customer: order.customer,
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || '未命名商品',
      imageUrl: item.imageUrl || item.product?.imageUrl || '',
      qty: item.qty,
      unit: item.unit,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      notes: item.notes,
    })),
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const view = String(query.view || 'today')
  const keyword = String(query.keyword || '').trim()
  const fulfillmentType = String(query.fulfillmentType || '').trim()
  const isMade = parseBoolean(query.isMade)
  const status = String(query.status || '').trim()

  const baseDate = query.date ? new Date(String(query.date)) : new Date()
  if (Number.isNaN(baseDate.getTime())) {
    throw createError({ statusCode: 400, message: '日期格式错误' })
  }

  const where: any = {
    orderType: 'preorder',
    status: { not: 'cancelled' },
  }

  if (status) where.status = status
  if (fulfillmentType === 'delivery' || fulfillmentType === 'pickup') where.fulfillmentType = fulfillmentType
  if (typeof isMade === 'boolean') where.isMade = isMade

  if (view === 'today') {
    where.deliveryTime = { gte: startOfDay(baseDate), lt: endOfDay(baseDate) }
  } else if (view === 'tomorrow') {
    const tomorrow = new Date(startOfDay(baseDate).getTime() + MS_PER_DAY)
    where.deliveryTime = { gte: tomorrow, lt: endOfDay(tomorrow) }
  } else if (view === 'future') {
    where.deliveryTime = { gte: endOfDay(baseDate) }
  } else if (view !== 'all') {
    where.deliveryTime = { gte: startOfDay(baseDate), lt: endOfDay(baseDate) }
  }

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: 'insensitive' } },
      { receiverName: { contains: keyword, mode: 'insensitive' } },
      { receiverPhone: { contains: keyword, mode: 'insensitive' } },
      { deliveryAddress: { contains: keyword, mode: 'insensitive' } },
      { notes: { contains: keyword, mode: 'insensitive' } },
      { cardMessage: { contains: keyword, mode: 'insensitive' } },
      { sourceChannel: { contains: keyword, mode: 'insensitive' } },
      { customer: { is: { name: { contains: keyword, mode: 'insensitive' } } } },
      { customer: { is: { phone: { contains: keyword, mode: 'insensitive' } } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: [
      { isUrgent: 'desc' },
      { isMade: 'asc' },
      { deliveryTime: 'asc' },
      { sortIndex: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return {
    data: orders.map(normalizeOrder),
    error: null,
  }
})
