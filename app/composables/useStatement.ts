import { money } from '~~/shared/money'
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

/** All statement rows come from the receivable ledger, including refunds and merge entries. */
export const buildStatementLines = (entries: any[], openingBalance: number): StatementLine[] => {
  let running=money(openingBalance)
  const labels:Record<string,string>={sale:'订单应收',collect:'订单收款',refund:'退款冲销',opening:'期初入账',opening_adjustment:'期初调整',merge_in:'合并转入',merge_out:'合并转出',order_edit:'订单改价'}
  return entries.map(e=>{
    running=running.plus(e.amount)
    return {kind:Number(e.amount)>0?'order':'payment',date:e.createdAt,refNo:e.orderId?`订单 #${e.orderId}`:`流水 #${e.id}`,summary:`${labels[e.type]||e.type}${e.notes?' · '+e.notes:''}`,amount:Number(e.amount),runningBalance:running.toNumber(),raw:e} as StatementLine
  })
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
