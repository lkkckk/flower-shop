import { businessHandler } from '../../../../../utils/businessTransaction'
import { approveAdjustment } from '../../../../../utils/orderAdjustments'
export default businessHandler('order.approveAdjustment', (tx, actor, key, body, event) => {
 if(body.decision==='approve' && (!Array.isArray(body.lines)||body.refundMethod!=='original')) throw new Error('请逐行确认退货明细、库存去向和原路退款方式')
 return approveAdjustment(tx, Number(getRouterParam(event, 'id')), Number(getRouterParam(event, 'adjustmentId')), body, actor, key)
})
