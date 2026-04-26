import { prisma } from '../../utils/prisma'
import { productRecipeInclude, saveProductRecipe } from '../../utils/productRecipe'
import { hideWholesalePriceForCashier, isCashierRequest } from '../../utils/productVisibility'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const isCashier = isCashierRequest(event)

  try {
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
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
          status: body.status || 'active',
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
      await saveProductRecipe(tx, createdProduct.id, body.recipe)
      if (body.recipe !== undefined) {
        return await tx.product.findUnique({
          where: { id: createdProduct.id },
          include: {
            unitConversions: true,
            recipe: { include: productRecipeInclude },
          },
        })
      }
      return createdProduct
    })

    return {
      data: hideWholesalePriceForCashier(event, product),
      error: null,
    }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '创建商品失败', code: 'CREATE_ERROR' },
    }
  }
})
