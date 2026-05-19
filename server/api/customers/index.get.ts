import { prisma } from '../../utils/prisma'

const DAY_MS = 24 * 60 * 60 * 1000

type RfmMainTag = 'vip_active' | 'new' | 'sleeping' | 'churned' | 'none'

function computeRfm(
  lastOrderAt: Date | null,
  orderCount: number,
  totalSpent: number,
): RfmMainTag {
  if (!lastOrderAt) return 'none'
  const days = Math.floor((Date.now() - lastOrderAt.getTime()) / DAY_MS)
  if (days > 90) return 'churned'
  if (days > 30) return 'sleeping'
  if (orderCount >= 3 && totalSpent >= 5000) return 'vip_active'
  return 'new'
}

/**
 * 客户列表接口
 *
 * 支持的 query：
 *   page, pageSize
 *   keyword          — 姓名 / 手机号 OR 匹配
 *   level            — normal / member / vip / wholesale
 *   rfmTag           — vip_active / new / sleeping / churned / none（按 RFM 分群过滤）
 *   hasDebt          — 'true' 时仅看欠款客户
 *
 * 返回：{ list, total, page, pageSize, summary }
 * 每条客户附 `stats: { lastOrderAt, orderCount, totalSpent, rfmTag }`
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const keyword = query.keyword as string | undefined
  const level = query.level as string | undefined
  const rfmTag = query.rfmTag as RfmMainTag | undefined
  const hasDebt = String(query.hasDebt || '') === 'true'

  const where: any = {}
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
    ]
  }
  if (level) where.level = level
  if (hasDebt) where.totalOwed = { gt: 0 }

  try {
    // 1. 先 count 总数 + 抓全量基础客户（单店量小，万级以内可接受）
    const [allCustomers, summary] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.customer.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalOwed: true, balance: true },
      }),
    ])

    // 2. 聚合订单统计（基于这批客户的 id）
    const customerIds = allCustomers.map((c) => c.id)
    const orderStats =
      customerIds.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ['customerId'],
            where: { customerId: { in: customerIds }, status: { not: 'cancelled' } },
            _count: { _all: true },
            _sum: { totalAmount: true },
            _max: { createdAt: true },
          })
    const statsMap = new Map<number, { lastOrderAt: Date | null; orderCount: number; totalSpent: number }>()
    for (const row of orderStats) {
      if (row.customerId == null) continue
      statsMap.set(row.customerId, {
        lastOrderAt: row._max.createdAt ?? null,
        orderCount: row._count._all,
        totalSpent: row._sum.totalAmount ?? 0,
      })
    }

    // 3. 给每个客户挂 stats + rfmTag
    const enriched = allCustomers.map((c) => {
      const s = statsMap.get(c.id) ?? { lastOrderAt: null, orderCount: 0, totalSpent: 0 }
      const tag = computeRfm(s.lastOrderAt, s.orderCount, s.totalSpent)
      return {
        ...c,
        stats: { ...s, rfmTag: tag },
      }
    })

    // 4. RFM 过滤（如有）
    const filtered = rfmTag ? enriched.filter((c) => c.stats.rfmTag === rfmTag) : enriched

    // 5. 分页（在 JS 端做，total 用过滤后长度）
    const total = filtered.length
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize)

    // 6. summary：注意 summary 用的是过滤前的 where 聚合
    //    debtCount 单独统计
    const debtCount = await prisma.customer.count({
      where: { ...where, totalOwed: { gt: 0 } },
    })

    return {
      data: {
        list: slice,
        total,
        page,
        pageSize,
        summary: {
          count: summary._count._all,
          totalOwed: summary._sum.totalOwed ?? 0,
          totalBalance: summary._sum.balance ?? 0,
          debtCount,
        },
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取客户列表失败', code: 'FETCH_ERROR' },
    }
  }
})
