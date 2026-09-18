import { businessHandler } from '../../utils/businessTransaction'
import { money, positive } from '../../../shared/money'
export default businessHandler('stock.discount',async(tx,actor,key,b)=>{
 const batch=await tx.stockBatch.findUnique({where:{id:Number(b.batchId)}})
 if(!batch || !['in_stock','discounted'].includes(batch.status))throw new Error('批次不能设置特价')
 const price=money(b.discountPrice); const qty=positive(b.specialQty??batch.currentQty,3); const until=new Date(b.specialUntil||batch.expiryDate)
 if(price.lt(0)||qty.gt(batch.currentQty)||!Number.isFinite(until.getTime())||until<=new Date())throw new Error('特价、数量或有效期不合法')
 const updated=await tx.stockBatch.update({where:{id:batch.id},data:{status:'discounted',specialPrice:price.toFixed(2),specialQty:qty.toFixed(3),specialUntil:until}})
 await tx.stockMovement.create({data:{batchId:batch.id,type:'discount',qtyChange:0,operatorUserId:actor,operator:String(actor),sourceKey:key,notes:b.reason||'设置批次特价'}})
 return {batch:updated}
})
