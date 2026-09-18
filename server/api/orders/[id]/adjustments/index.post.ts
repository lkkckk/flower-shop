import { businessHandler } from '../../../../utils/businessTransaction'
import { requestAdjustment } from '../../../../utils/orderAdjustments'
export default businessHandler('order.requestAdjustment', (tx, actor, key, body, event) => requestAdjustment(tx, Number(getRouterParam(event, 'id')), body, actor))
