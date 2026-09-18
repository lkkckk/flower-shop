import { randomUUID } from 'node:crypto'
import { businessHandler } from '../../../utils/businessTransaction'
import { decimal, quantity, money } from '../../../../shared/money'
export default businessHandler('stock.stocktake',async(tx,actor,key,b)=>{
 const productId=Number(b.productId),actual=quantity(b.actualQty)
 if(actual.lt(0)||!String(b.reason||'').trim())throw new Error('实盘数量不能为负，请填写盘点原因')
 const product=await tx.product.findUnique({where:{id:productId}})
 if(!product)throw new Error('商品不存在')
 if(product.productType==='drink')throw new Error('饮品不管理库存，不能盘点')
 const batches=await tx.stockBatch.findMany({where:{productId,status:{in:['in_stock','discounted']},currentQty:{gt:0}},orderBy:[{inboundDate:'desc'},{id:'desc'}]})
 const system=batches.reduce((s:any,x:any)=>s.plus(x.currentQty),decimal(0)),delta=actual.minus(system)
 if(delta.lt(0)){
  let remaining=delta.neg()
  for(const batch of batches){
   if(remaining.isZero())break
   const take=remaining.lt(batch.currentQty)?remaining:decimal(batch.currentQty),left=decimal(batch.currentQty).minus(take)
   await tx.stockBatch.update({where:{id:batch.id},data:{currentQty:left.toFixed(3),specialQty:decimal(batch.specialQty).clamp(0,left).toFixed(3),status:left.isZero()?'sold_out':batch.status}})
   await tx.stockMovement.create({data:{batchId:batch.id,type:'stocktake_loss',qtyChange:take.neg().toFixed(3),operator:String(actor),operatorUserId:actor,sourceKey:`${key}:${batch.id}`,notes:b.reason}})
   remaining=remaining.minus(take)
  }
 }else if(delta.gt(0)){
  const last=await tx.stockBatch.findFirst({where:{productId},orderBy:[{inboundDate:'desc'},{id:'desc'}]})
  if(b.costPrice==null&&!last)throw new Error('该商品没有历史成本，请填写盘盈单位成本')
  const cost=money(b.costPrice??last.costPrice);if(cost.lt(0))throw new Error('成本不能为负')
  const now=new Date(),batch=await tx.stockBatch.create({data:{productId,batchNo:`STK-${randomUUID()}`,inboundDate:now,expiryDate:new Date(now.getTime()+product.shelfLifeDays*86400000),inboundQty:delta.toFixed(3),currentQty:delta.toFixed(3),costPrice:cost.toFixed(2),notes:b.reason}})
  await tx.stockMovement.create({data:{batchId:batch.id,type:'stocktake_gain',qtyChange:delta.toFixed(3),operator:String(actor),operatorUserId:actor,sourceKey:key,notes:b.reason}})
 }
 return {productId,systemQty:system.toFixed(3),actualQty:actual.toFixed(3),delta:delta.toFixed(3)}
})
