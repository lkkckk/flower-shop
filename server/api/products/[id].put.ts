import { prisma } from '../../utils/prisma'
import { drinkProductInclude, drinkProductFields, normalizeDrinkConfiguration, saveDrinkConfiguration, serializeDrinkProduct } from '../../utils/drinkVariants'
import { productRecipeInclude, saveProductRecipe } from '../../utils/productRecipe'
import { hideWholesalePriceForCashier, isCashierRequest } from '../../utils/productVisibility'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const isCashier = isCashierRequest(event)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的商品 ID',
    })
  }

  try {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`
      const existing = await tx.product.findUniqueOrThrow({ where: { id } })
      if (body.productType !== undefined && body.productType !== existing.productType) throw new Error('已创建商品不能切换类型')
      const drink = existing.productType === 'drink' ? normalizeDrinkConfiguration(body) : null
      // 1. 删除旧的换算关系
      await tx.unitConversion.deleteMany({
        where: { productId: id },
      })

      // 2. 更新商品本体并创建新的换算关系
      const product = await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          category: body.category,
          categoryId: body.categoryId ?? null,
          baseUnit: body.baseUnit,
          grade: body.grade,
          color: body.color,
          specification: body.specification,
          defaultPrice: body.defaultPrice,
          memberPrice: body.memberPrice,
          vipPrice: body.vipPrice,
          wholesalePrice: isCashier ? undefined : body.wholesalePrice,
          shelfLifeDays: body.shelfLifeDays,
          attributes: body.attributes,
          status: body.status,
          ...(drink ? drinkProductFields(drink) : {}),
          unitConversions: {
            create: (drink ? [] : body.unitConversions)?.map((uc: any) => ({
              fromUnit: uc.fromUnit,
              toBaseQty: uc.toBaseQty,
            })) || [],
          },
        },
        include: {
          unitConversions: true,
          recipe: { include: productRecipeInclude },
        },
      })

      if (drink) await saveDrinkConfiguration(tx, id, drink)
      else await saveProductRecipe(tx, id, body.recipe)
      if (drink || body.recipe !== undefined) {
        return await tx.product.findUnique({
          where: { id },
          include: {
            ...drinkProductInclude,
            unitConversions: true,
            recipe: { include: productRecipeInclude },
          },
        })
      }

      return product
    })

    return {
      data: hideWholesalePriceForCashier(event, updatedProduct ? serializeDrinkProduct(updatedProduct) : updatedProduct),
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '更新商品失败', code: 'UPDATE_ERROR' },
    }
  }
})
