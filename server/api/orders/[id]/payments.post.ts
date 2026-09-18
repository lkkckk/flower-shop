import { businessHandler } from '../../../utils/businessTransaction'
import { collectOrderPayment } from '../../../utils/accounts'
export default businessHandler('order.payment', (tx, actor, key, body, event) => collectOrderPayment(tx, Number(getRouterParam(event, 'id')), body.amount, body.paymentMethod, actor, key, body.notes))
