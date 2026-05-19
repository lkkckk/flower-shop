import { prisma } from '../../../utils/prisma'

/** 标记单条通知已读 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    return { data: null, error: { message: '无效的通知 ID', code: 'INVALID_PARAMS' } }
  }
  try {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
    return { data: { success: true }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '标记失败', code: 'UPDATE_ERROR' },
    }
  }
})
