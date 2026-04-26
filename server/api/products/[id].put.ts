import { prisma } from '../../utils/prisma'
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
          vipPrice: body.vipPrice,
          wholesalePrice: isCashier ? undefined : body.wholesalePrice,
          shelfLifeDays: body.shelfLifeDays,
          attributes: body.attributes,
          status: body.status,
          unitConversions: {
            create: body.unitConversions?.map((uc: any) => ({
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

      await saveProductRecipe(tx, id, body.recipe)
      if (body.recipe !== undefined) {
        return await tx.product.findUnique({
          where: { id },
          include: {
            unitConversions: true,
            recipe: { include: productRecipeInclude },
          },
        })
      }

      return product
    })

    return {
      data: hideWholesalePriceForCashier(event, updatedProduct),
      error: null,
    }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '更新商品失败', code: 'UPDATE_ERROR' },
    }
  }
})
