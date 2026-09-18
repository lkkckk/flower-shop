import { businessHandler } from '../../utils/businessTransaction'
import { createPurchase } from '../../utils/operations'
export default businessHandler('purchases/index.post.ts', (tx, actor, key, body, event) => createPurchase(tx, actor, body))
