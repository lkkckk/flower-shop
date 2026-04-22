import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })

  // 构建嵌套树
  const map = new Map<number, any>()
  const roots: any[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
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
