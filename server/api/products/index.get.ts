import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const keyword = query.keyword as string | undefined
  const category = query.category as string | undefined
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  const status = query.status as string | undefined

  const where: any = {}

  if (keyword) {
    where.name = { contains: keyword }
  }
  if (categoryId) {
    // 支持按分类（含子分类）过滤：查出该分类及其所有后代分类 ID
    const allCats = await prisma.category.findMany({ select: { id: true, parentId: true } })
    const descendantIds = new Set<number>([categoryId])
    let changed = true
    while (changed) {
      changed = false
      for (const c of allCats) {
        if (c.parentId && descendantIds.has(c.parentId) && !descendantIds.has(c.id)) {
          descendantIds.add(c.id)
          changed = true
        }
      }
    }
    where.categoryId = { in: Array.from(descendantIds) }
  } else if (category) {
    where.category = category
  }
  if (status) {
    where.status = status
  }

  try {
    const [list, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          unitConversions: true,
          categoryRef: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    return {
      data: {
        list,
        total,
        page,
        pageSize,
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取商品列表失败', code: 'FETCH_ERROR' },
    }
  }
})
