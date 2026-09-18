import { money, sumMoney } from '../../shared/money'
export async function reconcile(tx:any) {
  const customers=await tx.customer.findMany({include:{accountEntries:true,pointEntries:true,orders:true}})
  const mismatches=[]
  for(const c of customers){
    const stored=sumMoney(c.accountEntries.filter((e:any)=>e.account==='stored_value').map((e:any)=>e.amount))
    const owed=sumMoney(c.accountEntries.filter((e:any)=>e.account==='receivable').map((e:any)=>e.amount))
    const orderOwed=sumMoney(c.orders.filter((o:any)=>o.fulfillmentStatus!=='cancelled').map((o:any)=>o.owedAmount))
    const points=c.pointEntries.reduce((n:number,e:any)=>n+e.amount,0)
    if(!stored.eq(c.storedValueBalance)||!owed.eq(c.receivableBalance)||!owed.eq(orderOwed)||points!==c.availablePoints) mismatches.push({customerId:c.id,name:c.name,storedValueBalance:c.storedValueBalance,ledgerStored:stored.toFixed(2),receivableBalance:c.receivableBalance,ledgerReceivable:owed.toFixed(2),orderReceivable:orderOwed.toFixed(2),availablePoints:c.availablePoints,ledgerPoints:points})
  }
  const [issues,resolutions]=await Promise.all([
    tx.auditLog.findMany({where:{action:{in:['migration.discrepancy','migration.cost_missing']}},orderBy:{id:'asc'}}),
    tx.auditLog.findMany({where:{action:'migration.resolve'}}),
  ])
  const resolved=new Set(resolutions.map((r:any)=>Number(r.details.issueId)))
  const unresolved=issues.filter((i:any)=>!resolved.has(i.id))
  return {checkedCustomers:customers.length,mismatches,unresolved,ready:mismatches.length===0&&unresolved.length===0}
}
