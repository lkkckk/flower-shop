import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const id = Number(getRouterParam(event, 'id'))

  const hasChildren = await prisma.category.count({ where: { parentId: id } })
  if (hasChildren > 0) {
    setResponseStatus(event, 409)
    return { data: null, error: { message: '请先删除子分类', code: 'HAS_CHILDREN' } }
  }

  const hasProducts = await prisma.product.count({ where: { categoryId: id } })
  if (hasProducts > 0) {
    setResponseStatus(event, 409)
    return { data: null, error: { message: `该分类下有 ${hasProducts} 个商品，请先迁移或删除商品`, code: 'HAS_PRODUCTS' } }
  }

  await prisma.category.delete({ where: { id } })
  return { data: null, error: null }
})
