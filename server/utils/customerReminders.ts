// Intl's Chinese calendar is supplied by ICU; no external network or paid calendar API.
export function calendarParts(date: Date, calendar: string) {
  if (calendar === 'solar') {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }).formatToParts(date)
    return { month: Number(parts.find(p => p.type === 'month')?.value), day: Number(parts.find(p => p.type === 'day')?.value), leap: false }
  }
  const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }).formatToParts(date)
  const month = parts.find(p => p.type === 'month')?.value || ''
  return { month: Number.parseInt(month), day: Number(parts.find(p => p.type === 'day')?.value), leap: /bis|leap/i.test(month) }
}
export async function customerReminders(tx: any, now = new Date()) {
  const events = await tx.customerEvent.findMany({ where: { active: true, customer: { status: 'active' } }, include: { customer: true } })
  for (const e of events) {
    for (let delta = 0; delta <= e.remindDays; delta++) {
      const date = new Date(now.getTime() + delta * 86400000)
      const parts = calendarParts(date, e.calendar)
      if (parts.month !== e.month || parts.day !== e.day || parts.leap) continue
      const dateKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(date)
      const dedupeKey = `customer_event:${e.id}:${dateKey}`
      await tx.notification.upsert({ where: { dedupeKey }, update: {}, create: { dedupeKey, type: 'customer_event', title: `${e.customer.name} · ${e.title}`, body: `${delta === 0 ? '今天' : `${delta} 天后`}是${e.title}，请联系客户确认用花需求。`, refType: 'customer', refId: e.customerId } })
    }
  }
  const contacts = await tx.customerContact.findMany({ where: { nextContactAt: { lte: now }, completedAt: null, customer: { status: 'active' } }, include: { customer: true } })
  for (const c of contacts) {
    const dedupeKey = `customer_followup:${c.id}`
    await tx.notification.upsert({ where: { dedupeKey }, update: {}, create: { dedupeKey, type: 'customer_followup', title: `待跟进：${c.customer.name}`, body: c.content, refType: 'customer', refId: c.customerId, userId: c.operatorUserId } })
  }
}
