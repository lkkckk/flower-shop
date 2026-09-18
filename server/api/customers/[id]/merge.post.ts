import { businessHandler } from '../../../utils/businessTransaction'
import { mergeCustomers } from '../../../utils/customerCrm'
export default businessHandler('customer.merge', (tx, actor, key, b, event) => mergeCustomers(tx, actor, key, Number(getRouterParam(event, 'id')), b))
