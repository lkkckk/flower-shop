import dayjs from 'dayjs'
import { prisma } from '../../utils/prisma'

/**
 * 订单列表接口
 *
 * 支持的 query：
 *   page, pageSize, startDate, endDate
 *   customerId, status, orderType
 *   cashierId        — 收银员
 *   paymentMethod    — 主付款方式（cash/wechat/alipay/balance/credit），匹配关联 Payment 的任一笔
 *   sourceChannel    — 渠道关键词（contains）
 *   minAmount, maxAmount — 总金额区间
 *   keyword          — 单号 / 客户名 / 收货人 / 联系电话 OR 匹配
 *   hasDebt          — 'true' 时仅看欠款单
 *   hasDiscount      — 'true' 时仅看带折扣/促销的单
 *
 * 返回：{ list, total, page, pageSize, summary }
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const customerId = query.customerId ? Number(query.customerId) : undefined
  const status = query.status as string | undefined
  const cashierId = query.cashierId ? Number(query.cashierId) : undefined
  const paymentMethod = query.paymentMethod as string | undefined
  const sourceChannel = query.sourceChannel ? String(query.sourceChannel).trim() : undefined
  const minAmount = query.minAmount !== undefined && query.minAmount !== '' ? Number(query.minAmount) : undefined
  const maxAmount = query.maxAmount !== undefined && query.maxAmount !== '' ? Number(query.maxAmount) : undefined
  const keyword = query.keyword ? String(query.keyword).trim() : undefined
  const hasDebt = String(query.hasDebt || '') === 'true'
  const hasDiscount = String(query.hasDiscount || '') === 'true'
  const startDate = query.startDate ? dayjs(query.startDate as string).startOf('day').toDate() : undefined
  const endDate = query.endDate ? dayjs(query.endDate as string).endOf('day').toDate() : undefined
  // 订单类型过滤：默认排除预售单（预售单走独立页面管理）。
  // - 不传 orderType 或传 'non-preorder'：排除 preorder
  // - 传具体值（如 'retail' / 'preorder' / 'all'）：显式使用
  const orderType = (query.orderType as string | undefined) ?? 'non-preorder'

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (status) where.status = status
  if (cashierId) where.cashierId = cashierId
  if (orderType === 'non-preorder') where.orderType = { not: 'preorder' }
  else if (orderType !== 'all') where.orderType = orderType
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }
  if (sourceChannel) where.sourceChannel = { contains: sourceChannel, mode: 'insensitive' }
  if (minAmount !== undefined && !Number.isNaN(minAmount)) {
    where.totalAmount = { ...(where.totalAmount || {}), gte: minAmount }
  }
  if (maxAmount !== undefined && !Number.isNaN(maxAmount)) {
    where.totalAmount = { ...(where.totalAmount || {}), lte: maxAmount }
  }
  if (hasDebt) where.owedAmount = { gt: 0 }
  if (hasDiscount) where.priceMode = { in: ['discount', 'promotion'] }
  if (paymentMethod) {
    where.payments = { some: { paymentMethod } }
  }
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: 'insensitive' } },
      { receiverName: { contains: keyword, mode: 'insensitive' } },
      { receiverPhone: { contains: keyword } },
      { customer: { is: { name: { contains: keyword, mode: 'insensitive' } } } },
      { customer: { is: { phone: { contains: keyword } } } },
    ]
  }

  try {
    const [list, total, summary] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, level: true, phone: true } },
          cashier: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              productId: true,
              unit: true,
              qty: true,
              unitPrice: true,
              subtotal: true,
              grade: true,
              color: true,
              product: { select: { id: true, name: true, baseUnit: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalAmount: true, paidAmount: true, owedAmount: true },
      }),
    ])

    return {
      data: {
        list,
        total,
        page,
        pageSize,
        summary: {
          count: summary._count._all,
          totalAmount: summary._sum.totalAmount ?? 0,
          paidAmount: summary._sum.paidAmount ?? 0,
          owedAmount: summary._sum.owedAmount ?? 0,
        },
      },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取订单列表失败', code: 'FETCH_ERROR' },
    }
  }
})
