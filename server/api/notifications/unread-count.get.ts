import { prisma } from '../../utils/prisma'

/** 仅返回未读数，供前端铃铛红点轮询使用，比 list 接口更轻 */
export default defineEventHandler(async () => {
  try {
    const count = await prisma.notification.count({ where: { userId: null, readAt: null } })
    return { data: { count }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取未读数失败', code: 'FETCH_ERROR' },
    }
  }
})
