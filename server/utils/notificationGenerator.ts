import dayjs from 'dayjs'
import { prisma } from './prisma'

/**
 * 站内通知生成器
 *
 * 触发时机：
 *   - server/plugins/notification-tick.ts 每 30 分钟自动跑一次
 *   - /api/notifications/regenerate（admin 手动触发）
 *
 * 去重：dedupeKey = `{type}:{refId}:{YYYY-MM-DD}`，同对象同一天最多一条
 */

type SettingMap = Record<string, string | undefined>

async function loadSettings(): Promise<SettingMap> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['lowStockThreshold', 'expiringDays', 'debtOverdueDays', 'safetyStockDays'] } },
  })
  const map: SettingMap = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

const todayKey = () => dayjs().format('YYYY-MM-DD')

async function upsertNotification(params: {
  type: 'low_stock' | 'expiring_batch' | 'debt_overdue' | 'anomaly_order'
  level?: 'info' | 'warn' | 'urgent'
  title: string
  body: string
  refType: 'product' | 'batch' | 'customer' | 'order'
  refId: number
}) {
  const dedupeKey = `${params.type}:${params.refId}:${todayKey()}`
  try {
    await prisma.notification.upsert({
      where: { dedupeKey },
      create: {
        type: params.type,
        level: params.level || 'info',
        title: params.title,
        body: params.body,
        refType: params.refType,
        refId: params.refId,
        dedupeKey,
      },
      update: {
        // 已存在则不动 readAt / createdAt，仅刷新文案与级别（数字可能变了）
        title: params.title,
        body: params.body,
        level: params.level || 'info',
      },
    })
  } catch {
    // 静默：去重碰撞等
  }
}

/** 1) 低库存：在售商品总在库 < 阈值 */
async function genLowStock(settings: SettingMap) {
  const threshold = Math.max(1, Number(settings.lowStockThreshold) || 10)
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, baseUnit: true },
  })
  const stockAgg = await prisma.stockBatch.groupBy({
    by: ['productId'],
    where: { status: { in: ['in_stock', 'discounted'] } },
    _sum: { currentQty: true },
  })
  const stockMap = new Map<number, number>()
  for (const r of stockAgg) stockMap.set(r.productId, r._sum.currentQty ?? 0)

  for (const p of products) {
    const stock = stockMap.get(p.id) ?? 0
    if (stock < threshold) {
      await upsertNotification({
        type: 'low_stock',
        level: stock === 0 ? 'urgent' : 'warn',
        title: stock === 0 ? `${p.name} 已无库存` : `${p.name} 库存偏低`,
        body: `当前在库 ${stock} ${p.baseUnit}，阈值 ${threshold}，建议尽快补货。`,
        refType: 'product',
        refId: p.id,
      })
    }
  }
}

/** 2) 临期批次：N 天内到期且仍有库存 */
async function genExpiringBatch(settings: SettingMap) {
  const days = Math.max(1, Number(settings.expiringDays) || 3)
  const now = new Date()
  const until = dayjs().add(days, 'day').endOf('day').toDate()

  const batches = await prisma.stockBatch.findMany({
    where: {
      status: { in: ['in_stock', 'discounted'] },
      currentQty: { gt: 0 },
      expiryDate: { gte: now, lte: until },
    },
    include: { product: { select: { name: true, baseUnit: true } } },
  })

  for (const b of batches) {
    const daysLeft = Math.max(0, Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86_400_000))
    await upsertNotification({
      type: 'expiring_batch',
      level: daysLeft <= 1 ? 'urgent' : 'warn',
      title: `${b.product.name} 批次 ${b.batchNo} 临期`,
      body: `剩余 ${b.currentQty} ${b.product.baseUnit}，${daysLeft === 0 ? '今日到期' : `还有 ${daysLeft} 天到期`}。`,
      refType: 'batch',
      refId: b.id,
    })
  }
}

/** 3) 欠款逾期：customer.totalOwed > 0 且最后一次下单超过 N 天 */
async function genDebtOverdue(settings: SettingMap) {
  const days = Math.max(1, Number(settings.debtOverdueDays) || 30)
  const threshold = dayjs().subtract(days, 'day').toDate()

  const debtors = await prisma.customer.findMany({
    where: { totalOwed: { gt: 0 } },
    select: { id: true, name: true, totalOwed: true },
  })
  if (debtors.length === 0) return

  // 拿这批欠款客户的最近订单时间
  const lastOrders = await prisma.order.groupBy({
    by: ['customerId'],
    where: { customerId: { in: debtors.map((d) => d.id) } },
    _max: { createdAt: true },
  })
  const lastMap = new Map<number, Date | null>()
  for (const r of lastOrders) {
    if (r.customerId != null) lastMap.set(r.customerId, r._max.createdAt ?? null)
  }

  for (const d of debtors) {
    const last = lastMap.get(d.id)
    if (!last) continue
    if (last <= threshold) {
      const daysAgo = Math.floor((Date.now() - last.getTime()) / 86_400_000)
      await upsertNotification({
        type: 'debt_overdue',
        level: 'warn',
        title: `${d.name} 欠款已 ${daysAgo} 天未还`,
        body: `当前累计欠款 ¥${d.totalOwed.toFixed(2)}，最近一次下单 ${dayjs(last).format('YYYY-MM-DD')}。`,
        refType: 'customer',
        refId: d.id,
      })
    }
  }
}

/** 4) 异常订单：近 24 小时内的大额、重折扣或大额未收订单 */
async function genAnomalyOrder() {
  const since = dayjs().subtract(24, 'hour').toDate()
  const avgAgg = await prisma.order.aggregate({
    where: {
      orderType: { not: 'preorder' },
      status: { not: 'cancelled' },
      createdAt: { gte: dayjs().subtract(30, 'day').toDate() },
    },
    _avg: { totalAmount: true },
  })
  const avgAmount = avgAgg._avg.totalAmount || 0
  const largeAmountThreshold = Math.max(1000, avgAmount * 3)

  const orders = await prisma.order.findMany({
    where: {
      orderType: { not: 'preorder' },
      status: { not: 'cancelled' },
      createdAt: { gte: since },
      OR: [
        { totalAmount: { gte: largeAmountThreshold } },
        { discountRate: { lte: 70 } },
        { owedAmount: { gte: 300 } },
      ],
    },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  for (const o of orders) {
    const reasons: string[] = []
    if (o.totalAmount >= largeAmountThreshold) {
      reasons.push(`金额 ¥${o.totalAmount.toFixed(2)} 高于异常阈值 ¥${largeAmountThreshold.toFixed(2)}`)
    }
    if (o.discountRate !== null && o.discountRate !== undefined && o.discountRate <= 70) {
      reasons.push(`折扣率 ${o.discountRate}% 偏低`)
    }
    if (o.owedAmount >= 300) {
      reasons.push(`未收 ¥${o.owedAmount.toFixed(2)}`)
    }
    if (reasons.length === 0) continue

    await upsertNotification({
      type: 'anomaly_order',
      level: o.owedAmount >= 300 || o.totalAmount >= largeAmountThreshold * 1.5 ? 'urgent' : 'warn',
      title: `订单 ${o.orderNo} 可能异常`,
      body: `${o.customer?.name || '散客'} · ${reasons.join('；')}。`,
      refType: 'order',
      refId: o.id,
    })
  }
}

/** 清理 90 天前的旧通知 */
async function pruneOldNotifications() {
  const cutoff = dayjs().subtract(90, 'day').toDate()
  await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } })
}

export async function generateNotifications() {
  const settings = await loadSettings()
  await Promise.all([
    genLowStock(settings),
    genExpiringBatch(settings),
    genDebtOverdue(settings),
    genAnomalyOrder(),
  ])
  await pruneOldNotifications()
}
