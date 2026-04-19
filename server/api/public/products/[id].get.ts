import { prisma } from '../../../utils/prisma'

/**
 * 公开商品详情（小程序使用）
 * - 仅返回 status=active 商品
 */
export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) {
    return { data: null, error: { message: '参数错误', code: 'BAD_PARAMS' } }
  }

  const p = await prisma.product.findUnique({
    where: { id },
    include: { unitConversions: true },
  })
  if (!p || p.status !== 'active') {
    return { data: null, error: { message: '商品不存在或已下架', code: 'NOT_FOUND' } }
  }

  return {
    data: {
      id: p.id,
      name: p.name,
      category: p.category,
      baseUnit: p.baseUnit,
      grade: p.grade,
      color: p.color,
      specification: p.specification,
      defaultPrice: p.defaultPrice,
      imageUrl: p.imageUrl,
      shelfLifeDays: p.shelfLifeDays,
      unitConversions: p.unitConversions.map((uc) => ({
        fromUnit: uc.fromUnit,
        toBaseQty: uc.toBaseQty,
      })),
    },
    error: null,
  }
})
