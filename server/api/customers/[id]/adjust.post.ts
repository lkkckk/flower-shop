import { businessHandler } from '../../../utils/businessTransaction'
import { accountEntry } from '../../../utils/accounts'
import { money } from '../../../../shared/money'
export default businessHandler('customer.account.adjust',async(tx,actor,key,b,event)=>{
 if(b.account!=='stored_value')throw new Error('应收变更须通过订单收款或纠错审批，不能脱离订单调整')
 if(!String(b.notes||'').trim()||money(b.amount).isZero())throw new Error('请填写非零调整金额和凭证说明')
 return accountEntry(tx,Number(getRouterParam(event,'id')),'stored_value',b.amount,'admin_adjustment',key,actor,{notes:b.notes})
})
