import dayjs from 'dayjs'

export interface StatementLine {
  kind: 'order' | 'payment'
  date: Date | string
  refNo: string
  summary: string
  amount: number // 正数=欠款增加（订单 owed），负数=欠款减少（还款）
  runningBalance: number
  raw?: any
}

/**
 * 将 orders 和 payments 按时间合并为对账明细行，计算每行的本期累计欠款
 */
export const buildStatementLines = (
  orders: any[],
  payments: any[],
  openingBalance: number
): StatementLine[] => {
  const entries: Array<{ date: Date; kind: 'order' | 'payment'; raw: any }> = []
  for (const o of orders) {
    entries.push({ date: new Date(o.createdAt), kind: 'order', raw: o })
  }
  for (const p of payments) {
    entries.push({ date: new Date(p.createdAt), kind: 'payment', raw: p })
  }
  entries.sort((a, b) => a.date.getTime() - b.date.getTime())

  const lines: StatementLine[] = []
  let running = openingBalance

  for (const e of entries) {
    if (e.kind === 'order') {
      const o = e.raw
      // 本次订单产生的欠款（可能 0）
      const owed = o.owedAmount || 0
      running += owed
      const itemCount = o.items?.length || 0
      const firstItem = o.items?.[0]?.product?.name || ''
      const summary = itemCount > 0
        ? `${firstItem}${itemCount > 1 ? ` 等 ${itemCount} 项` : ''}（合计 ¥${o.totalAmount.toFixed(2)}，已付 ¥${o.paidAmount.toFixed(2)}）`
        : `合计 ¥${o.totalAmount.toFixed(2)}`
      lines.push({
        kind: 'order',
        date: e.date,
        refNo: o.orderNo,
        summary,
        amount: owed, // 仅"新增欠款"进明细行
        runningBalance: running,
        raw: o,
      })
    } else {
      const p = e.raw
      running -= p.amount
      lines.push({
        kind: 'payment',
        date: e.date,
        refNo: `R${p.id}`,
        summary: `${paymentMethodText(p.paymentMethod)} 还款${p.notes ? ' · ' + p.notes : ''}`,
        amount: -p.amount,
        runningBalance: running,
        raw: p,
      })
    }
  }

  return lines
}

export const paymentMethodText = (m: string) => {
  const map: Record<string, string> = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    credit: '记账',
  }
  return map[m] || m
}

export const formatDateTime = (d: string | Date) => dayjs(d).format('YYYY-MM-DD HH:mm')
export const formatDate = (d: string | Date) => dayjs(d).format('YYYY-MM-DD')
