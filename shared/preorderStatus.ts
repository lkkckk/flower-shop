/**
 * 预售单状态机
 *
 * 状态流转（正向）：
 *   pending_confirm → booked → scheduled → in_production → ready_to_ship → completed
 *
 * `cancelled` 可从任何非 completed 状态进入。
 * `in_production` 及之后的状态意味着已分配批次并扣减库存，取消需要补偿（本阶段暂未实现）。
 */
export const PREORDER_STATUSES = [
  'pending_confirm', // 待确认
  'booked',          // 已预订
  'scheduled',       // 待执行
  'in_production',   // 制作中（此时已扣库存）
  'ready_to_ship',   // 待配送
  'completed',       // 已完成
  'cancelled',       // 已取消
] as const

export type PreorderStatus = (typeof PREORDER_STATUSES)[number]

export const PREORDER_STATUS_LABEL: Record<PreorderStatus, string> = {
  pending_confirm: '待确认',
  booked: '已预订',
  scheduled: '待执行',
  in_production: '制作中',
  ready_to_ship: '待配送',
  completed: '已完成',
  cancelled: '已取消',
}

const FORWARD_FLOW: Record<PreorderStatus, PreorderStatus[]> = {
  pending_confirm: ['booked', 'cancelled'],
  booked: ['scheduled', 'cancelled'],
  scheduled: ['in_production', 'cancelled'],
  in_production: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/** 从 in_production 开始，意味着已经实销并扣减了库存 */
export const STOCK_DEDUCTED_STATUSES: PreorderStatus[] = [
  'in_production',
  'ready_to_ship',
  'completed',
]

export function canTransition(from: PreorderStatus, to: PreorderStatus): boolean {
  return FORWARD_FLOW[from]?.includes(to) ?? false
}

export function isStockDeducted(status: PreorderStatus): boolean {
  return STOCK_DEDUCTED_STATUSES.includes(status)
}
