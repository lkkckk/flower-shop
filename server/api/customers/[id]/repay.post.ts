import { businessHandler } from '../../../utils/businessTransaction'
import { repayCustomer } from '../../../utils/accounts'
export default businessHandler('customer.repay', (tx, actor, key, body, event) => repayCustomer(tx, Number(getRouterParam(event, 'id')), body, actor, key))
