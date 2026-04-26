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

function toBaseQty(product: any, unit: string, qty: number) {
  if (!unit || unit === product.baseUnit) return qty
  const conversion = product.unitConversions?.find((u: any) => u.fromUnit === unit)
  return qty * Number(conversion?.toBaseQty || 1)
}

function addMaterial(materialMap: Map<number, any>, component: any, requiredQty: number, sources: any[]) {
  const current = materialMap.get(component.id) || {
    productId: component.id,
    productName: component.name || '未命名商品',
    imageUrl: component.imageUrl || '',
    baseUnit: component.baseUnit || '',
    requiredQty: 0,
    currentStock: 0,
    shortageQty: 0,
    sources: [],
  }
  current.requiredQty += requiredQty
  current.sources.push(...sources)
  materialMap.set(component.id, current)
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
      customer: true,
      items: {
        include: {
          product: {
            include: {
              unitConversions: true,
              recipe: {
                include: {
                  items: {
                    orderBy: { sort: 'asc' },
                    include: {
                      componentProduct: { include: { unitConversions: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ isMade: 'asc' }, { deliveryTime: 'asc' }, { createdAt: 'asc' }],
  })

  const productMap = new Map<number, any>()
  const materialMap = new Map<number, any>()
  let totalQty = 0
  let totalAmount = 0
  let unmadeCount = 0
  let madeCount = 0
  let deliveryCount = 0
  let pickupCount = 0

  for (const order of orders) {
    totalAmount += Number(order.totalAmount || 0)
    if (order.isMade) madeCount += 1
    else unmadeCount += 1
    if (order.fulfillmentType === 'pickup') pickupCount += 1
    else deliveryCount += 1

    for (const item of order.items) {
      const product = item.product
      const recipeItems = product?.recipe?.enabled ? (product.recipe.items || []) : []
      const current = productMap.get(item.productId) || {
        productId: item.productId,
        productName: product?.name || '未命名商品',
        imageUrl: item.imageUrl || product?.imageUrl || '',
        orderIds: new Set<number>(),
        orderCount: 0,
        totalQty: 0,
        totalAmount: 0,
        unit: item.unit,
        hasRecipe: recipeItems.length > 0,
      }
      current.orderIds.add(order.id)
      current.orderCount = current.orderIds.size
      current.totalQty += Number(item.qty || 0)
      current.totalAmount += Number(item.subtotal || 0)
      current.hasRecipe = current.hasRecipe || recipeItems.length > 0
      totalQty += Number(item.qty || 0)
      productMap.set(item.productId, current)

      for (const recipeItem of recipeItems) {
        const component = recipeItem.componentProduct
        const requiredQty = toBaseQty(component, recipeItem.unit, Number(item.baseQty || item.qty || 0) * Number(recipeItem.qty || 0))
        addMaterial(materialMap, component, requiredQty, [{
          orderId: order.id,
          orderNo: order.orderNo,
          productId: item.productId,
          productName: product?.name || '未命名商品',
          qty: Number(item.qty || 0),
        }])
      }
    }
  }

  const materialIds = Array.from(materialMap.keys())
  if (materialIds.length > 0) {
    const materialStocks = await prisma.product.findMany({
      where: { id: { in: materialIds } },
      include: {
        stockBatches: {
          where: { status: 'in_stock', currentQty: { gt: 0 } },
          select: { currentQty: true },
        },
      },
    })
    for (const product of materialStocks) {
      const row = materialMap.get(product.id)
      if (row) {
        row.currentStock = product.stockBatches.reduce((sum, batch) => sum + Number(batch.currentQty || 0), 0)
        row.shortageQty = Math.max(0, row.requiredQty - row.currentStock)
      }
    }
  }

  const productRows = Array.from(productMap.values())
    .map(({ orderIds, ...row }) => row)
    .sort((a, b) => b.totalQty - a.totalQty)

  const materialRows = Array.from(materialMap.values())
    .map((row) => ({
      ...row,
      sources: row.sources.slice(0, 6),
    }))
    .sort((a, b) => (b.shortageQty - a.shortageQty) || (b.requiredQty - a.requiredQty))

  const orderRows = orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    receiverName: order.receiverName || order.customer?.name || '散客',
    receiverPhone: order.receiverPhone || order.customer?.phone || '',
    deliveryTime: order.deliveryTime,
    fulfillmentType: order.fulfillmentType,
    totalAmount: order.totalAmount,
    status: order.status,
    isMade: order.isMade,
    isUrgent: order.isUrgent,
    itemCount: order.items.length,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || '未命名商品',
      imageUrl: item.imageUrl || item.product?.imageUrl || '',
      qty: item.qty,
      unit: item.unit,
      hasRecipe: Boolean(item.product?.recipe?.enabled && item.product.recipe.items?.length),
    })),
  }))

  return {
    data: productRows,
    productRows,
    materialRows,
    orders: orderRows,
    summary: {
      orderCount: orders.length,
      totalQty,
      totalAmount,
      unmadeCount,
      madeCount,
      deliveryCount,
      pickupCount,
      shortageCount: materialRows.filter((row) => row.shortageQty > 0).length,
    },
    error: null,
  }
})
