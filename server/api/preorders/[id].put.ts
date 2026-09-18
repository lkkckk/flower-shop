import { businessHandler } from '../../utils/businessTransaction'
import { quoteOrder } from '../../utils/orderPricing'
import { accountEntry } from '../../utils/accounts'
import { snapshotPreorderImage } from '../../utils/preorderImages'
import { money } from '../../../shared/money'
export default businessHandler('preorder.edit', async (tx, actor, key, b, event) => {
 const id=Number(getRouterParam(event,'id')); const o=await tx.order.findUnique({where:{id},include:{items:true}})
 if (!o || o.orderType!=='preorder' || o.fulfillmentStatus==='cancelled') throw new Error('预售单不存在或已取消')
 const data:any={}
 for (const field of ['receiverName','receiverPhone','deliveryAddress','notes','cardMessage','sourceChannel','deliveryPerson','deliveryPhone']) if (field in b) data[field]=b[field]||null
 if (b.deliveryTime) {const d=new Date(b.deliveryTime);if(!Number.isFinite(d.getTime()))throw new Error('履约时间无效');data.deliveryTime=d}
 if ('fulfillmentType' in b) data.fulfillmentType=b.fulfillmentType==='pickup'?'pickup':'delivery'
 if ('isUrgent' in b) data.isUrgent=Boolean(b.isUrgent)
 if (b.customerId && Number(b.customerId)!==o.customerId) throw new Error('已创建订单不能更换客户，请作废后重新创建')
 const sameItems = Array.isArray(b.items) && b.items.length===o.items.length && b.items.every((i:any,index:number)=>{const old=o.items[index];return Number(i.productId)===old.productId && i.unit===old.unit && Number(i.qty)===Number(old.qty) && (i.imageUrl||null)===(old.imageUrl||null)})
 const pricingChanged = ('priceMode' in b && b.priceMode !== o.priceMode) || ('discountRate' in b && Number(b.discountRate||0)!==Number(o.discountRate||0)) || ('promotionId' in b && Number(b.promotionId||0)!==Number(o.promotionId||0))
 if (Array.isArray(b.items) && (!sameItems || pricingChanged)) {
   if (!['pending','confirmed'].includes(o.fulfillmentStatus) || money(o.paidAmount).gt(0) || o.pointsRedeemed>0) throw new Error('已收款、抵扣积分或开始制作后，修改商品请走纠错审批')
   if (Number(b.pointsToRedeem||0)) throw new Error('编辑订单不能追加积分抵扣，请在新建订单时使用积分')
   const q=await quoteOrder(tx,{...b,customerId:o.customerId},event.context.user.role)
   if(q.items.some((i:any)=>i.specialBatchId))throw new Error('预售单不预订短期特价批次')
   if(b.expectedTotal!==undefined&&!money(b.expectedTotal).eq(q.total))throw new Error('商品价格已变化，请刷新报价')
   const difference=money(q.total).minus(o.totalAmount)
   if(o.customerId && !difference.isZero())await accountEntry(tx,o.customerId,'receivable',difference,'order_edit',key,actor,{orderId:id})
   await tx.orderItem.deleteMany({where:{orderId:id}})
   for(const item of q.items){const {productName,specialBatchId,...row}=item;await tx.orderItem.create({data:{...row,orderId:id,imageUrl:await snapshotPreorderImage(item.imageUrl)}})}
   if(o.customerId){const customer=await tx.customer.findUnique({where:{id:o.customerId}});if(customer.creditLimit!==null&&money(customer.receivableBalance).gt(customer.creditLimit))throw new Error('超过客户信用额度')}
   Object.assign(data,{totalAmount:q.total,owedAmount:q.total,priceMode:q.priceMode,priceReason:b.priceReason||null,discountRate:q.priceMode==='discount'?b.discountRate:null,promotionId:q.priceMode==='promotion'?Number(b.promotionId):null,paymentStatus:money(q.total).isZero()?'paid':'unpaid'})
 }
 return tx.order.update({where:{id},data,include:{items:true,customer:true}})
})
