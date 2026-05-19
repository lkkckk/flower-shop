import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
    prisma.product.groupBy({
      by: ['categoryId'],
      where: { status: 'active', categoryId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const countMap = new Map<number, number>()
  for (const row of counts) {
    if (row.categoryId != null) countMap.set(row.categoryId, row._count._all)
  }

  // 构建嵌套树
  const map = new Map<number, any>()
  const roots: any[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, productCount: countMap.get(cat.id) ?? 0, children: [] })
  }
  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parentId) {
      map.get(cat.parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return { data: roots, error: null }
})
