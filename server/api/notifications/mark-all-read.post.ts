import { prisma } from '../../utils/prisma'

/** 将所有未读通知置为已读 */
export default defineEventHandler(async () => {
  try {
    const r = await prisma.notification.updateMany({
      where: { userId: null, readAt: null },
      data: { readAt: new Date() },
    })
    return { data: { updated: r.count }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '标记失败', code: 'UPDATE_ERROR' },
    }
  }
})
