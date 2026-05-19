import { prisma } from '../../utils/prisma'

/**
 * 通知列表
 *
 * query:
 *   onlyUnread  — 'true' 只看未读
 *   type        — 按类型过滤
 *   page, pageSize
 *
 * 返回：{ list, total, unreadCount }
 *
 * 注意：当前实现按"全店通知"模式（Notification.userId 全部为 null）；
 * 未来支持私信时按 user.context.user.sub 过滤。
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const onlyUnread = String(query.onlyUnread || '') === 'true'
  const type = query.type ? String(query.type) : undefined
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 50

  const where: any = { userId: null }
  if (onlyUnread) where.readAt = null
  if (type) where.type = type

  try {
    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ readAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: null, readAt: null } }),
    ])

    return { data: { list, total, page, pageSize, unreadCount }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取通知失败', code: 'FETCH_ERROR' },
    }
  }
})
