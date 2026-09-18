import { money, decimal, sumMoney } from '../../shared/money'
export function reportRange(query: any) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
  const startDate = new Date(`${query.startDate || today}T00:00:00+08:00`)
  const endDate = new Date(new Date(`${query.endDate || today}T00:00:00+08:00`).getTime() + 86400000)
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate || endDate.getTime() - startDate.getTime() > 366 * 86400000) throw new Error('日期范围须在 1–366 天内')
  return { startDate, endDate, filter: { gte: startDate, lt: endDate } }
}
export async function businessReport(tx: any, query: any) {
  const { startDate, endDate, filter } = reportRange(query)
  const basis = ['sales', 'cash', 'receivable'].includes(query.basis) ? query.basis : 'sales'
  const [orders, adjustmentCandidates, payments, entries] = await Promise.all([
    tx.order.findMany({ where: { completedAt: filter }, include: { items: { include: { product: true, costAllocations: { where: { adjustmentId: null } } } } } }),
    tx.orderAdjustment.findMany({ where: { status: 'approved', order: { completedAt: { not: null } }, OR:[{approvedAt:filter},{order:{completedAt:filter}}] }, include: { order: { include: { items: { include: { product: true, costAllocations: true } } } } } }),
    tx.payment.findMany({ where: { createdAt: filter, paymentMethod: { not: 'balance' } } }),
    tx.customerAccountEntry.findMany({ where: { account: 'receivable', createdAt: filter, type: { notIn: ['merge_in', 'merge_out'] } } }),
  ])
  const recognitionDate = (a:any)=>new Date(Math.max(new Date(a.approvedAt).getTime(),new Date(a.order.completedAt).getTime()))
  const adjustments=adjustmentCandidates.filter((a:any)=>recognitionDate(a)>=startDate&&recognitionDate(a)<endDate)
  const sales = sumMoney(orders.map((o: any) => o.totalAmount)).minus(sumMoney(adjustments.map((a: any) => a.amount)))
  const costs = sumMoney(orders.flatMap((o: any) => o.items.flatMap((i: any) => i.costAllocations.map((c: any) => c.totalCost)))).plus(sumMoney(adjustments.flatMap((a: any) => a.order.items.flatMap((i: any) => i.costAllocations.filter((c: any) => c.adjustmentId === a.id).map((c: any) => c.totalCost)))))
  const cash = sumMoney(payments.map((p: any) => p.amount))
  const receivable = sumMoney(entries.map((e: any) => e.amount))
  const methodMap = new Map<string, any>(), productMap = new Map<number, any>(), days = new Map<string, any>()
  const dayKey = (d: any) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(d))
  const dayAdd = (date: any, amount: any, cost = '0', count = 0) => {
    const key = dayKey(date), previous = days.get(key) || { amount: money(0), cost: money(0), orderCount: 0 }
    previous.amount = previous.amount.plus(amount); previous.cost = previous.cost.plus(cost); previous.orderCount += count; days.set(key, previous)
  }
  const productAdd = (item: any, qty: any, amount: any, cost: any) => {
    const row = productMap.get(item.productId) || { productId: item.productId, productName: item.product.name, baseUnit: item.product.baseUnit, qty: decimal(0), amount: money(0), profit: money(0) }
    row.qty = row.qty.plus(qty); row.amount = row.amount.plus(amount); row.profit = row.profit.plus(amount).minus(cost); productMap.set(item.productId, row)
  }
  for (const p of payments) {
    const row = methodMap.get(p.paymentMethod) || { method: p.paymentMethod, count: 0, amount: money(0) }
    row.count++; row.amount = row.amount.plus(p.amount); methodMap.set(p.paymentMethod, row)
    if (basis === 'cash') dayAdd(p.createdAt, p.amount)
  }
  for (const o of orders) {
    const cost = sumMoney(o.items.flatMap((i: any) => i.costAllocations.map((c: any) => c.totalCost)))
    if (basis === 'sales') dayAdd(o.completedAt, o.totalAmount, cost.toFixed(2), 1)
    for (const i of o.items) productAdd(i, i.baseQty, i.subtotal, sumMoney(i.costAllocations.map((c: any) => c.totalCost)))
  }
  for (const a of adjustments) {
    const cost = sumMoney(a.order.items.flatMap((i: any) => i.costAllocations.filter((c: any) => c.adjustmentId === a.id).map((c: any) => c.totalCost)))
    if (basis === 'sales') dayAdd(recognitionDate(a), money(a.amount).neg(), cost.toFixed(2))
    for (const l of a.lines as any[]) {
      const i = a.order.items.find((i: any) => i.id === l.itemId)
      if (!i) continue
      productAdd(i, decimal(i.baseQty).times(l.qty).div(i.qty).neg(), money(l.amount).neg(), sumMoney(i.costAllocations.filter((c: any) => c.adjustmentId === a.id).map((c: any) => c.totalCost)))
    }
  }
  if (basis === 'receivable') for (const e of entries) dayAdd(e.createdAt, e.amount)
  const dailyTrend = []
  for (let time = startDate.getTime(); time < endDate.getTime(); time += 86400000) {
    const date = dayKey(time), row = days.get(date)
    dailyTrend.push({ date, amount: row?.amount.toFixed(2) || '0.00', orderCount: row?.orderCount || 0, profit: row ? row.amount.minus(row.cost).toFixed(2) : '0.00' })
  }
  const missingCostOrders = orders.filter((o: any) => o.items.some((i: any) => !i.costAllocations.length)).map((o: any) => o.id)
  const recentStart = new Date(endDate.getTime()-7*86400000)
  const stocked = await tx.product.findMany({where:{status:'active',stockBatches:{some:{status:{in:['in_stock','discounted']},currentQty:{gt:0}}}},include:{stockBatches:{where:{status:{in:['in_stock','discounted']},currentQty:{gt:0}}},orderItems:{where:{order:{completedAt:{lt:endDate}}},include:{order:{select:{completedAt:true}}}}}})
  const slowProducts = stocked.map((p:any)=>{
    const sold = p.orderItems.filter((i:any)=>decimal(i.qty).gt(i.returnedQty))
    const last = sold.reduce((date:Date|null,i:any)=>!date||i.order.completedAt>date?i.order.completedAt:date,null)
    const soldCount = sold.filter((i:any)=>i.order.completedAt>=recentStart).reduce((n:any,i:any)=>n.plus(decimal(i.baseQty).times(decimal(i.qty).minus(i.returnedQty)).div(i.qty)),decimal(0))
    const oldest = p.stockBatches.reduce((d:Date,b:any)=>b.inboundDate<d?b.inboundDate:d,endDate)
    return {productId:p.id,productName:p.name,currentStock:p.stockBatches.reduce((n:any,b:any)=>n.plus(b.currentQty),decimal(0)).toFixed(3),soldCount:soldCount.toFixed(3),lastSoldAt:last,stagnantDays:Math.max(0,Math.floor((endDate.getTime()-new Date(last||oldest).getTime())/86400000))}
  }).filter((p:any)=>decimal(p.soldCount).isZero()).sort((a:any,b:any)=>b.stagnantDays-a.stagnantDays).slice(0,20)
  const selected = basis === 'cash' ? cash : basis === 'receivable' ? receivable : sales
  return {
    basis, startDate, endDate, missingCostOrders,
    summary: { totalSales: sales.toFixed(2), selectedAmount: selected.toFixed(2), orderCount: orders.length, avgOrderValue: orders.length ? sales.div(orders.length).toFixed(2) : '0.00', totalPaid: cash.toFixed(2), totalOwed: receivable.toFixed(2), totalCost: costs.toFixed(2), grossProfit: sales.minus(costs).toFixed(2), grossMargin: sales.gt(0) ? sales.minus(costs).div(sales).times(100).toNumber() : 0 },
    dailyTrend, topProducts: [...productMap.values()].sort((a, b) => b.amount.comparedTo(a.amount)).slice(0, 10).map(p => ({ ...p, qty: p.qty.toFixed(3), amount: p.amount.toFixed(2), profit: p.profit.toFixed(2) })),
    paymentMethods: [...methodMap.values()].map(p => ({ ...p, amount: p.amount.toFixed(2) })), slowProducts,
  }
}
