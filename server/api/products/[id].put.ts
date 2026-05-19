import { prisma } from '../../utils/prisma'
import { respondWithPrismaError } from '../../utils/prismaError'
import { requireStaff } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  requireStaff(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (isNaN(id)) {
    return { data: null, error: { message: '无效的商品 ID', code: 'INVALID_PARAMS' } }
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
  } catch (error) {
    return respondWithPrismaError(event, error, '更新商品失败')
  }
})
