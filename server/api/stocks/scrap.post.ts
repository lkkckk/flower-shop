import { businessHandler } from '../../utils/businessTransaction'
import { decimal, positive } from '../../../shared/money'
export default businessHandler('stock.scrap',async(tx,actor,key,b)=>{
 const batchId=Number(b.batchId),qty=positive(b.qty,3)
 if(!String(b.reason||'').trim())throw new Error('请填写报损原因')
 const batch=await tx.stockBatch.findUnique({where:{id:batchId}})
 if(!batch||!['in_stock','discounted'].includes(batch.status)||qty.gt(batch.currentQty))throw new Error('批次不存在、已停用或报损超过库存')
 const left=decimal(batch.currentQty).minus(qty)
 const updated=await tx.stockBatch.update({where:{id:batchId},data:{currentQty:left.toFixed(3),specialQty:decimal(batch.specialQty).clamp(0,left).toFixed(3),status:left.isZero()?'scrapped':batch.status}})
 const movement=await tx.stockMovement.create({data:{batchId,type:'scrap',qtyChange:qty.neg().toFixed(3),operator:String(actor),operatorUserId:actor,sourceKey:key,notes:b.reason}})
 return {batch:updated,movement}
})
