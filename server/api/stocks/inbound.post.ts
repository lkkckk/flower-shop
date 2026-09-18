import { randomUUID } from 'node:crypto'
import { businessHandler } from '../../utils/businessTransaction'
import { money, positive } from '../../../shared/money'
export default businessHandler('stock.inbound', async (tx, actor, key, b) => {
  const productId=Number(b.productId), qty=positive(b.inboundQty,3), cost=money(b.costPrice)
  const product=await tx.product.findUnique({where:{id:productId}})
  if(!product || product.status!=='active')throw new Error('商品不存在或已停用')
  if(product.productType==='drink')throw new Error('饮品不管理库存，不能入库')
  const inboundDate=new Date(b.inboundDate), expiryDate=b.expiryDate?new Date(b.expiryDate):new Date(inboundDate.getTime()+product.shelfLifeDays*86400000)
  if(cost.lt(0)||!Number.isFinite(inboundDate.getTime())||!Number.isFinite(expiryDate.getTime())||expiryDate<inboundDate)throw new Error('成本或入库日期不合法')
  const batch=await tx.stockBatch.create({data:{productId,batchNo:`B-${randomUUID()}`,inboundDate,expiryDate,inboundQty:qty.toFixed(3),currentQty:qty.toFixed(3),costPrice:cost.toFixed(2),notes:b.notes||null},include:{product:true}})
  await tx.stockMovement.create({data:{batchId:batch.id,type:'inbound',qtyChange:qty.toFixed(3),operator:String(actor),operatorUserId:actor,sourceKey:key,notes:b.notes||null}})
  return batch
})
