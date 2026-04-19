import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

/**
 * 停用促销活动（软删：status -> inactive）
 */
export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) return { data: null, error: { message: '参数错误', code: 'BAD_PARAMS' } }

  try {
    const updated = await prisma.promotion.update({
      where: { id },
      data: { status: 'inactive' },
    })
    return { data: updated, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '停用失败', code: 'DELETE_ERROR' } }
  }
})
