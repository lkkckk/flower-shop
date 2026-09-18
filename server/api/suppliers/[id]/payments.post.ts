import { businessHandler } from '../../../utils/businessTransaction'
import { paySupplier } from '../../../utils/operations'
export default businessHandler('suppliers/[id]/payments.post.ts', (tx, actor, key, body, event) => paySupplier(tx, actor, key, Number(getRouterParam(event, 'id')), body))
