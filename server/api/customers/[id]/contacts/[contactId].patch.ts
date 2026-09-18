import { businessHandler } from '../../../../utils/businessTransaction'
export default businessHandler('customer.contact.complete', async (tx, actor, key, b, event) => {
  const id = Number(getRouterParam(event, 'contactId')), customerId = Number(getRouterParam(event, 'id'))
  const contact = await tx.customerContact.findFirst({ where: { id, customerId } })
  if (!contact) throw new Error('跟进任务不存在')
  const completedAt = b.completed === false ? null : new Date()
  const result = await tx.customerContact.update({ where: { id }, data: { completedAt } })
  if (completedAt) await tx.notification.updateMany({ where: { dedupeKey: `customer_followup:${id}` }, data: { readAt: completedAt } })
  return result
})
