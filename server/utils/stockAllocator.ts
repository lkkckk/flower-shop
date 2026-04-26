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

interface StockRequirement {
  productId: number
  productName: string
  baseUnit: string
  requiredQty: number
}

interface ComponentDeduction {
  productId: number
  productName: string
  baseUnit: string
  requiredQty: number
}

interface DirectDeductionPlan {
  kind: 'direct'
  item: AllocationItem
  productId: number
  productName: string
  baseUnit: string
  requiredQty: number
}

interface RecipeDeductionPlan {
  kind: 'recipe'
  item: AllocationItem
  components: ComponentDeduction[]
}

type DeductionPlan = DirectDeductionPlan | RecipeDeductionPlan

function toBaseQty(product: any, unit: string, qty: number) {
  if (!unit || unit === product.baseUnit) return qty
  const conversion = product.unitConversions?.find((u: any) => u.fromUnit === unit)
  return qty * Number(conversion?.toBaseQty || 1)
}

function addRequirement(map: Map<number, StockRequirement>, req: StockRequirement) {
  const existing = map.get(req.productId)
  if (existing) {
    existing.requiredQty += req.requiredQty
  } else {
    map.set(req.productId, { ...req })
  }
}

async function buildDeductionPlans(
  tx: Prisma.TransactionClient,
  items: AllocationItem[],
): Promise<{ plans: DeductionPlan[]; requirements: StockRequirement[] }> {
  const productIds = Array.from(new Set(items.map((item) => Number(item.productId)).filter(Boolean)))
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
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
  })
  const productMap = new Map(products.map((product) => [product.id, product]))
  const requirementMap = new Map<number, StockRequirement>()

  const plans = items.map((item) => {
    const product = productMap.get(Number(item.productId))
    if (!product) {
      throw Object.assign(new Error(`商品(id=${item.productId})不存在`), { code: 'PRODUCT_NOT_FOUND' })
    }

    const recipe = product.recipe
    const recipeItems = recipe?.enabled ? (recipe.items || []) : []
    if (recipeItems.length > 0) {
      const components = recipeItems.map((recipeItem: any) => {
        const component = recipeItem.componentProduct
        const requiredQty = toBaseQty(component, recipeItem.unit, Number(item.baseQty) * Number(recipeItem.qty))
        const componentReq = {
          productId: component.id,
          productName: component.name,
          baseUnit: component.baseUnit,
          requiredQty,
        }
        addRequirement(requirementMap, componentReq)
        return componentReq
      })

      return { kind: 'recipe', item, components } as RecipeDeductionPlan
    }

    const requiredQty = Number(item.baseQty)
    const directReq = {
      productId: Number(item.productId),
      productName: product.name || item.productName || String(item.productId),
      baseUnit: product.baseUnit,
      requiredQty,
    }
    addRequirement(requirementMap, directReq)
    return { kind: 'direct', item, ...directReq } as DirectDeductionPlan
  })

  return { plans, requirements: Array.from(requirementMap.values()) }
}

async function assertEnoughStock(tx: Prisma.TransactionClient, requirements: StockRequirement[]) {
  const shortages = []
  for (const req of requirements) {
    const batches = await tx.stockBatch.findMany({
      where: { productId: req.productId, status: 'in_stock', currentQty: { gt: 0 } },
      select: { currentQty: true },
    })
    const availableQty = batches.reduce((sum, batch) => sum + Number(batch.currentQty || 0), 0)
    if (availableQty + 1e-8 < req.requiredQty) {
      shortages.push({
        productId: req.productId,
        productName: req.productName,
        requiredQty: req.requiredQty,
        availableQty,
        shortageQty: req.requiredQty - availableQty,
        unit: req.baseUnit,
      })
    }
  }

  if (shortages.length > 0) {
    const message = shortages
      .map((item) => `${item.productName} 缺 ${Number(item.shortageQty).toFixed(2)} ${item.unit}`)
      .join('；')
    throw Object.assign(new Error(`库存不足：${message}`), {
      code: 'INSUFFICIENT_STOCK',
      shortages,
    })
  }
}

async function deductStockOnly(
  tx: Prisma.TransactionClient,
  orderId: number,
  requirement: ComponentDeduction,
  operator: string,
) {
  let remaining = Number(requirement.requiredQty)
  if (remaining <= 0) return

  const batches = await tx.stockBatch.findMany({
    where: { productId: requirement.productId, status: 'in_stock', currentQty: { gt: 0 } },
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
        notes: '配方组件扣减',
      },
    })
  }
}

async function deductDirectAndCreateItems(
  tx: Prisma.TransactionClient,
  orderId: number,
  plan: DirectDeductionPlan,
  operator: string,
) {
  const item = plan.item
  let remaining = Number(plan.requiredQty)
  const totalBase = remaining
  if (totalBase <= 0) return

  const batches = await tx.stockBatch.findMany({
    where: { productId: plan.productId, status: 'in_stock', currentQty: { gt: 0 } },
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
  const { plans, requirements } = await buildDeductionPlans(tx, items)
  await assertEnoughStock(tx, requirements)

  for (const plan of plans) {
    if (plan.kind === 'direct') {
      await deductDirectAndCreateItems(tx, orderId, plan, operator)
    } else {
      const item = plan.item
      await tx.orderItem.create({
        data: {
          orderId,
          productId: item.productId,
          batchId: null,
          unit: item.unit,
          qty: Number(item.qty),
          baseQty: Number(item.baseQty),
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice ?? null,
          subtotal: item.subtotal,
          grade: item.grade ?? null,
          color: item.color ?? null,
          notes: item.notes ?? null,
          imageUrl: item.imageUrl ?? null,
        },
      })
      for (const component of plan.components) {
        await deductStockOnly(tx, orderId, component, operator)
      }
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
