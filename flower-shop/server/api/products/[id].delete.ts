import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    setResponseStatus(event, 403)
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    setResponseStatus(event, 400)
    return { data: null, error: { message: '无效的商品 ID', code: 'INVALID_ID' } }
  }

  const query = getQuery(event)
  const force = query.force === 'true'

  try {
    if (!force) {
      // 停售（软删除）
      await prisma.product.update({ where: { id }, data: { status: 'inactive' } })
      return { data: { success: true, action: 'deactivated' }, error: null }
    }

    // 真删除：先做安全检查
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } })
    if (orderItemCount > 0) {
      setResponseStatus(event, 409)
      return {
        data: null,
        error: { message: `该商品已有 ${orderItemCount} 条订单记录，不能删除`, code: 'HAS_ORDER_ITEMS' },
      }
    }

    const stockCount = await prisma.stockBatch.count({
      where: { productId: id, currentQty: { gt: 0 } },
    })
    if (stockCount > 0) {
      setResponseStatus(event, 409)
      return {
        data: null,
        error: { message: `该商品尚有 ${stockCount} 个批次有剩余库存，不能删除`, code: 'HAS_STOCK' },
      }
    }

    // 物理删除（UnitConversion 已配置 onDelete: Cascade）
    await prisma.product.delete({ where: { id } })
    return { data: { success: true, action: 'deleted' }, error: null }
  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '删除商品失败', code: 'DELETE_ERROR' },
    }
  }
})
