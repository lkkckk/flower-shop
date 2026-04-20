import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

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
          baseUnit: body.baseUnit,
          grade: body.grade,
          color: body.color,
          specification: body.specification,
          defaultPrice: body.defaultPrice,
          vipPrice: body.vipPrice,
          wholesalePrice: body.wholesalePrice,
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
        },
      })

      return product
    })

    return {
      data: updatedProduct,
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
