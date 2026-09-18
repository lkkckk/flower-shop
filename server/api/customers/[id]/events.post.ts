import { businessHandler } from '../../../utils/businessTransaction'
import { activeCustomer } from '../../../utils/accounts'
export default businessHandler('customer.event', async (tx, actor, key, b, event) => {
 const id=Number(getRouterParam(event,'id')); await activeCustomer(tx,id)
 const month=Number(b.month), day=Number(b.day), remindDays=Number(b.remindDays ?? 3)
 if (!String(b.title||'').trim() || !['solar','lunar'].includes(b.calendar) || !Number.isInteger(month) || month<1 || month>12 || !Number.isInteger(day) || day<1 || day>(b.calendar==='lunar'?30:new Date(2024,month,0).getDate()) || !Number.isInteger(remindDays) || remindDays<0 || remindDays>30) throw new Error('节日日期或提醒天数不合法')
 return tx.customerEvent.create({data:{customerId:id,title:b.title,calendar:b.calendar,month,day,remindDays}})
})
