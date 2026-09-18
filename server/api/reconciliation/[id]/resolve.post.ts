import { businessHandler, audit } from '../../../utils/businessTransaction'
import { accountEntry } from '../../../utils/accounts'
import { money } from '../../../../shared/money'
export default businessHandler('migration.resolve',async(tx,actor,key,b,event)=>{
 const id=Number(getRouterParam(event,'id')),issue=await tx.auditLog.findUnique({where:{id}})
 if(!issue||issue.action!=='migration.discrepancy')throw new Error('只能在此处理客户期初差异；历史成本缺失须按原始凭证补录成本')
 if(!String(b.notes||'').trim()||b.confirmedStoredValue==null)throw new Error('请填写核对依据和确认的预存余额')
 if(await tx.auditLog.findFirst({where:{action:'migration.resolve',details:{path:['issueId'],equals:id}}}))throw new Error('此项差异已经处理')
 const customerId=Number(issue.entityId),c=await tx.customer.findUnique({where:{id:customerId}}),confirmed=money(b.confirmedStoredValue)
 if(confirmed.lt(0))throw new Error('确认的预存余额不能为负')
 const result=await accountEntry(tx,customerId,'stored_value',confirmed.minus(c.storedValueBalance),'opening_adjustment',key,actor,{notes:b.notes})
 await audit(tx,actor,'migration.resolve','Customer',customerId,{issueId:id,notes:b.notes,before:c.storedValueBalance,after:confirmed.toFixed(2)})
 return result
})
