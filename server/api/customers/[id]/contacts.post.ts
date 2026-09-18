import { businessHandler } from '../../../utils/businessTransaction'
import { activeCustomer } from '../../../utils/accounts'
export default businessHandler('customer.contact', async (tx, actor, key, b, event) => {
 const id=Number(getRouterParam(event,'id')); await activeCustomer(tx,id)
 if (!String(b.content || '').trim()) throw new Error('请填写跟进内容')
 const nextContactAt=b.nextContactAt ? new Date(b.nextContactAt) : null
 if (nextContactAt && !Number.isFinite(nextContactAt.getTime())) throw new Error('跟进时间格式错误')
 return tx.customerContact.create({data:{customerId:id,content:b.content,nextContactAt,operatorUserId:actor}})
})
