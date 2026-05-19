import { prisma } from '../../utils/prisma'
import { respondWithPrismaError } from '../../utils/prismaError'
import { requireStaff } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  requireStaff(event)
  const body = await readBody(event)

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
          wholesalePrice: body.wholesalePrice,
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
        },
      })
      return createdProduct
    })

    return {
      data: product,
      error: null,
    }
  } catch (error) {
    return respondWithPrismaError(event, error, '创建商品失败')
  }
})
