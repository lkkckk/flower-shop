import { prisma } from '../../utils/prisma'
import { hideWholesalePriceForCashier } from '../../utils/productVisibility'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = query.keyword as string | undefined
  const category = query.category as string | undefined
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined

  const where: any = { status: 'active' }

  if (keyword) {
    where.name = { contains: keyword }
  }
  if (categoryId) {
    const allCats = await prisma.category.findMany({ select: { id: true, parentId: true } })
    const descendantIds = new Set<number>([categoryId])
    let changed = true
    while (changed) {
      changed = false
      for (const c of allCats) {
        if (c.parentId && descendantIds.has(c.parentId) && !descendantIds.has(c.id)) {
          descendantIds.add(c.id)
          changed = true
        }
      }
    }
    where.categoryId = { in: Array.from(descendantIds) }
  } else if (category) {
    where.category = category
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        unitConversions: true,
        categoryRef: true,
        recipe: {
          include: {
            items: {
              include: {
                componentProduct: {
                  include: {
                    unitConversions: true,
                    stockBatches: {
                      where: { status: 'in_stock', currentQty: { gt: 0 } },
                      select: { currentQty: true },
                    },
                  },
                },
              },
            },
          },
        },
        stockBatches: {
          where: { status: 'in_stock', currentQty: { gt: 0 } },
          select: { currentQty: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 聚合库存
    const list = products.map((p) => {
      const recipeItems = p.recipe?.enabled ? (p.recipe.items || []) : []
      const recipeStock = recipeItems.length > 0
        ? Math.min(...recipeItems.map((item: any) => {
            const component = item.componentProduct
            const componentStock = component.stockBatches.reduce((sum: number, batch: any) => sum + Number(batch.currentQty || 0), 0)
            const required = item.unit === component.baseUnit
              ? Number(item.qty || 0)
              : Number(item.qty || 0) * Number(component.unitConversions.find((u: any) => u.fromUnit === item.unit)?.toBaseQty || 1)
            return required > 0 ? componentStock / required : 0
          }))
        : null
      const totalStock = recipeStock === null
        ? p.stockBatches.reduce((sum, batch) => sum + batch.currentQty, 0)
        : recipeStock
      const { stockBatches, ...rest } = p
      return {
        ...rest,
        totalStock,
      }
    })

    return {
      data: { list: hideWholesalePriceForCashier(event, list) },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取带库存的商品失败', code: 'FETCH_ERROR' },
    }
  }
})
