import { businessHandler } from '../../../utils/businessTransaction'
import { recharge } from '../../../utils/accounts'
export default businessHandler('customer.recharge', (tx, actor, key, body, event) => recharge(tx, Number(getRouterParam(event, 'id')), body, actor, key))
