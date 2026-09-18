import { businessHandler } from '../../utils/businessTransaction'
import { activeCustomer } from '../../utils/accounts'
import { money } from '../../../shared/money'
export default businessHandler('customer.deactivate', async (tx, actor, key, b, event) => {
  const id = Number(getRouterParam(event, 'id')), customer = await activeCustomer(tx, id)
  if (!money(customer.storedValueBalance).isZero() || !money(customer.receivableBalance).isZero()) throw new Error('客户仍有预存或欠款，请先结清账户')
  await tx.customer.update({ where: { id }, data: { status: 'inactive' } })
  return { success: true }
})
