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
    // 软删除
    await prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    })

    return {
      data: { success: true },
      error: null,
    }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '删除商品失败', code: 'DELETE_ERROR' },
    }
  }
})
