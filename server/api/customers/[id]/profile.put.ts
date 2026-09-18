import { businessHandler } from '../../../utils/businessTransaction'
import { profileUpdate } from '../../../utils/customerCrm'
export default businessHandler('customer.profile', (tx, actor, key, b, event) => profileUpdate(tx, actor, Number(getRouterParam(event, 'id')), b))
