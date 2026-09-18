import { prisma } from '../../utils/prisma'
import { drinkProductInclude, drinkProductFields, normalizeDrinkConfiguration, saveDrinkConfiguration, serializeDrinkProduct } from '../../utils/drinkVariants'
import { productRecipeInclude, saveProductRecipe } from '../../utils/productRecipe'
import { hideWholesalePriceForCashier, isCashierRequest } from '../../utils/productVisibility'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const isCashier = isCashierRequest(event)

  try {
    const productType = body.productType ?? 'standard'
    if (!['standard', 'drink'].includes(productType)) throw new Error('无效的商品类型')
    const drink = productType === 'drink' ? normalizeDrinkConfiguration(body) : null
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          productType,
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
          status: body.status || 'active',
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
      if (drink) await saveDrinkConfiguration(tx, createdProduct.id, drink)
      else await saveProductRecipe(tx, createdProduct.id, body.recipe)
      if (drink || body.recipe !== undefined) {
        return await tx.product.findUnique({
          where: { id: createdProduct.id },
          include: {
            ...drinkProductInclude,
            unitConversions: true,
            recipe: { include: productRecipeInclude },
          },
        })
      }
      return createdProduct
    })

    return {
      data: hideWholesalePriceForCashier(event, product ? serializeDrinkProduct(product) : product),
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '创建商品失败', code: 'CREATE_ERROR' },
    }
  }
})
