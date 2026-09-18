import { businessHandler } from '../../utils/businessTransaction'
import { createSale } from '../../utils/createOrder'
export default businessHandler('order.checkout', (tx, actor, key, body, event) => createSale(tx, actor, key, body, event.context.user.role))
