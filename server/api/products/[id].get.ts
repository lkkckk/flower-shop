import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    return { data: null, error: { message: '无效的商品 ID', code: 'INVALID_PARAMS' } }
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        unitConversions: true,
      },
    })

    if (!product) {
      return { data: null, error: { message: '商品不存在', code: 'NOT_FOUND' } }
    }

    return {
      data: product,
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取商品详情失败', code: 'FETCH_ERROR' },
    }
  }
})
