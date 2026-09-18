import { businessHandler } from '../../../utils/businessTransaction'
import { pointEntry, activeCustomer } from '../../../utils/accounts'
export default businessHandler('customer.points.adjust', async (tx, actor, key, b, event) => {
 if (!String(b.notes || '').trim()) throw new Error('请填写积分调整原因')
 const id=Number(getRouterParam(event, 'id')); await pointEntry(tx,id,Number(b.amount),'adjust',key,actor,{notes:b.notes}); return activeCustomer(tx,id)
})
