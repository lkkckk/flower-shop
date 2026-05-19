/**
 * 轻量 RFM 分群规则（前后端通用纯函数）
 * 不做聚类，按阈值打标，老板易理解
 *
 * 输入：
 *   - lastOrderAt: 最近下单时间（ISO 字符串或 null）
 *   - orderCount:  历史订单数
 *   - totalSpent:  历史成交总额
 *   - totalOwed:   当前累计欠款
 *
 * 输出主标签：
 *   - 'vip_active'  VIP活跃   最近 30 天 + ≥3 单 + ≥5000 元
 *   - 'new'         新客      最近 30 天 + <3 单
 *   - 'sleeping'    沉睡      30-90 天未下单
 *   - 'churned'     已流失    >90 天未下单
 *   - 'none'        无订单
 *
 * 叠加标签：
 *   - 'debtor'      欠款 totalOwed > 0
 */
export type RfmMainTag = 'vip_active' | 'new' | 'sleeping' | 'churned' | 'none'

export interface RfmInput {
  lastOrderAt: string | Date | null | undefined
  orderCount: number
  totalSpent: number
  totalOwed: number
}

export interface RfmResult {
  main: RfmMainTag
  isDebtor: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

export function computeRfm(input: RfmInput, now: Date = new Date()): RfmResult {
  const isDebtor = (input.totalOwed || 0) > 0
  const last = input.lastOrderAt ? new Date(input.lastOrderAt as any) : null
  if (!last || Number.isNaN(last.getTime())) {
    return { main: 'none', isDebtor }
  }
  const daysSince = Math.floor((now.getTime() - last.getTime()) / DAY_MS)
  if (daysSince > 90) return { main: 'churned', isDebtor }
  if (daysSince > 30) return { main: 'sleeping', isDebtor }
  // 30 天内
  if ((input.orderCount || 0) >= 3 && (input.totalSpent || 0) >= 5000) {
    return { main: 'vip_active', isDebtor }
  }
  return { main: 'new', isDebtor }
}

export const RFM_LABELS: Record<RfmMainTag, { label: string; color: string }> = {
  vip_active: { label: 'VIP 活跃', color: 'magenta' },
  new: { label: '新客', color: 'green' },
  sleeping: { label: '沉睡', color: 'orange' },
  churned: { label: '已流失', color: 'red' },
  none: { label: '无订单', color: 'default' },
}

export const useRfmTag = () => ({ computeRfm, RFM_LABELS })
