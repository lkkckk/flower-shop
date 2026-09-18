import { businessHandler } from '../../../../utils/businessTransaction'
export default businessHandler('customer.event.toggle', async (tx, actor, key, b, event) => {
  const id = Number(getRouterParam(event, 'eventId')), customerId = Number(getRouterParam(event, 'id'))
  if (!(await tx.customerEvent.findFirst({ where: { id, customerId } }))) throw new Error('节日记录不存在')
  if (typeof b.active !== 'boolean') throw new Error('请指定启用状态')
  return tx.customerEvent.update({ where: { id }, data: { active: b.active } })
})
