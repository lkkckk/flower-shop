import { prisma } from '../../utils/prisma'

/**
 * 促销活动列表
 * query:
 *   status=active  仅激活（默认返回全部）
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const status = q.status as string | undefined

  try {
    const where: any = {}
    if (status) where.status = status

    const list = await prisma.promotion.findMany({
      where,
      orderBy: [{ status: 'asc' }, { threshold: 'asc' }],
    })
    return { data: { list }, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '查询失败', code: 'FETCH_ERROR' } }
  }
})
