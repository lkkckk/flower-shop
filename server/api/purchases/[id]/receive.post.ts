import { businessHandler } from '../../../utils/businessTransaction'
import { receivePurchase } from '../../../utils/operations'
export default businessHandler('purchases/[id]/receive.post.ts', (tx, actor, key, body, event) => receivePurchase(tx, actor, key, Number(getRouterParam(event, 'id')), body))
