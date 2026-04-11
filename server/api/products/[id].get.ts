import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的商品 ID',
    })
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        unitConversions: true,
      },
    })

    if (!product) {
      throw createError({
        statusCode: 404,
        message: '商品不存在',
        data: { code: 'NOT_FOUND' },
      })
    }

    return {
      data: product,
      error: null,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error // Re-throw Nuxt errors
    }
    return {
      data: null,
      error: { message: error.message || '获取商品详情失败', code: 'FETCH_ERROR' },
    }
  }
})
