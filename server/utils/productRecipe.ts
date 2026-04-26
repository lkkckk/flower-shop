import type { Prisma } from '@prisma/client'

export const productRecipeInclude = {
  items: {
    orderBy: { sort: 'asc' as const },
    include: {
      componentProduct: {
        select: {
          id: true,
          name: true,
          baseUnit: true,
          imageUrl: true,
          status: true,
          unitConversions: true,
        },
      },
    },
  },
}

function normalizeRecipeItems(recipe: any) {
  return Array.isArray(recipe?.items)
    ? recipe.items
        .map((item: any, index: number) => ({
          componentProductId: Number(item.componentProductId),
          qty: Number(item.qty),
          unit: String(item.unit || '').trim(),
          sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : index,
          notes: item.notes || null,
        }))
        .filter((item: any) => item.componentProductId && item.qty > 0 && item.unit)
    : []
}

export async function saveProductRecipe(
  tx: Prisma.TransactionClient,
  productId: number,
  recipe: any,
) {
  if (recipe === undefined) return

  await tx.productRecipe.deleteMany({ where: { productId } })

  const items = normalizeRecipeItems(recipe)
  const enabled = Boolean(recipe?.enabled)
  const notes = recipe?.notes || null

  if (!enabled && items.length === 0 && !notes) return

  const componentIds = items.map((item: any) => item.componentProductId)
  if (componentIds.includes(productId)) {
    throw Object.assign(new Error('配方组件不能选择商品自身'), { code: 'INVALID_RECIPE' })
  }

  const uniqueComponentIds = new Set(componentIds)
  if (uniqueComponentIds.size !== componentIds.length) {
    throw Object.assign(new Error('配方组件不能重复'), { code: 'INVALID_RECIPE' })
  }

  const components = await tx.product.findMany({
    where: { id: { in: componentIds } },
    include: { unitConversions: true },
  })
  const componentMap = new Map(components.map((product) => [product.id, product]))

  for (const item of items) {
    const component = componentMap.get(item.componentProductId)
    if (!component) {
      throw Object.assign(new Error(`配方组件(id=${item.componentProductId})不存在`), {
        code: 'INVALID_RECIPE',
      })
    }
    const units = new Set([
      component.baseUnit,
      ...component.unitConversions.map((conversion) => conversion.fromUnit),
    ])
    if (!units.has(item.unit)) {
      throw Object.assign(new Error(`组件【${component.name}】不支持单位 ${item.unit}`), {
        code: 'INVALID_RECIPE',
      })
    }
  }

  await tx.productRecipe.create({
    data: {
      productId,
      enabled,
      notes,
      items: {
        create: items.map((item: any) => ({
          componentProductId: item.componentProductId,
          qty: item.qty,
          unit: item.unit,
          sort: item.sort,
          notes: item.notes,
        })),
      },
    },
  })
}
