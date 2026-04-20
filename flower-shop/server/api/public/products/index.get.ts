import { prisma } from '../../../utils/prisma'

/**
 * 公开商品列表（小程序使用）
 * - 仅返回 status=active 商品
 * - 脱敏：不返回 wholesalePrice、costPrice 等供应链字段
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 50)
  const keyword = query.keyword as string | undefined
  const category = query.category as string | undefined

  const where: any = { status: 'active' }
  if (keyword) where.name = { contains: keyword, mode: 'insensitive' }
  if (category) where.category = category

  try {
    const [rawList, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { unitConversions: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    // 脱敏：只返回对顾客展示所需字段
    const list = rawList.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      baseUnit: p.baseUnit,
      grade: p.grade,
      color: p.color,
      specification: p.specification,
      defaultPrice: p.defaultPrice,
      imageUrl: p.imageUrl,
      unitConversions: p.unitConversions.map((uc) => ({
        fromUnit: uc.fromUnit,
        toBaseQty: uc.toBaseQty,
      })),
    }))

    return { data: { list, total, page, pageSize }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取商品列表失败', code: 'FETCH_ERROR' },
    }
  }
})
