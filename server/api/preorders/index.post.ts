import { businessHandler } from '../../utils/businessTransaction'
import { createSale } from '../../utils/createOrder'
export default businessHandler('preorder.create', async (tx, actor, key, body, event) => (await createSale(tx, actor, key, body, event.context.user.role, true)).order)
