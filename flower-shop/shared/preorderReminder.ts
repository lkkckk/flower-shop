/**
 * 预售单履约提醒工具
 *
 * 最小实现：按距履约日期的天数返回阶段标识；列表查询时惰性写回 Order.reminderStage。
 * 后续接 cron / push 时复用 `computeReminderStage`。
 */

export type ReminderStage = 'none' | 'd7' | 'd3' | 'due' | 'overdue'

export const REMINDER_STAGE_LABEL: Record<ReminderStage, string> = {
  none: '',
  d7: '7天内',
  d3: '3天内',
  due: '今日履约',
  overdue: '已逾期',
}

export const REMINDER_STAGE_COLOR: Record<ReminderStage, string> = {
  none: '',
  d7: 'orange',
  d3: 'volcano',
  due: 'red',
  overdue: 'magenta',
}

/**
 * 计算提醒阶段。
 *
 * - 已过履约日 → overdue
 * - 履约当天 → due
 * - 0 < daysLeft ≤ 3 → d3
 * - 3 < daysLeft ≤ 7 → d7
 * - 其它 → none
 */
export function computeReminderStage(
  deliveryTime: Date | string | null | undefined,
  now: Date = new Date(),
): ReminderStage {
  if (!deliveryTime) return 'none'
  const delivery = typeof deliveryTime === 'string' ? new Date(deliveryTime) : deliveryTime
  if (Number.isNaN(delivery.getTime())) return 'none'

  const startOfDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }

  const dayDiff = Math.round(
    (startOfDay(delivery).getTime() - startOfDay(now).getTime()) / 86_400_000,
  )

  if (dayDiff < 0) return 'overdue'
  if (dayDiff === 0) return 'due'
  if (dayDiff <= 3) return 'd3'
  if (dayDiff <= 7) return 'd7'
  return 'none'
}

/** 给定履约时间，返回距今天数（正数=未来，负数=已过） */
export function daysUntil(deliveryTime: Date | string | null | undefined, now: Date = new Date()): number | null {
  if (!deliveryTime) return null
  const d = typeof deliveryTime === 'string' ? new Date(deliveryTime) : deliveryTime
  if (Number.isNaN(d.getTime())) return null
  const startOfDay = (x: Date) => {
    const r = new Date(x)
    r.setHours(0, 0, 0, 0)
    return r
  }
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000)
}
