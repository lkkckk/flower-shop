import { businessHandler } from '../../../utils/businessTransaction'
import { allocatePreorderItems } from '../../../utils/stockAllocator'
import { awardOrderPoints } from '../../../utils/accounts'
import { canTransition, isStockDeducted } from '../../../../shared/preorderStatus'
export default businessHandler('preorder.advance', async (tx, actor, key, b, event) => {
 const id=Number(getRouterParam(event,'id'))
 const o=await tx.order.findUnique({where:{id}})
 if (!o || o.orderType!=='preorder') throw new Error('预售单不存在')
 if (b.to==='cancelled') throw new Error('取消订单请在订单收款与售后中提交作废申请，由店员或管理员审批')
 if (!canTransition(o.status,b.to)) throw new Error('不允许此状态流转')
 if (b.to==='in_production' && !isStockDeducted(o.status)) await allocatePreorderItems(tx,id,String(actor))
 const map:Record<string,string>={pending_confirm:'pending',booked:'confirmed',scheduled:'confirmed',in_production:'in_production',ready_to_ship:'ready',out_for_delivery:'out_for_delivery',completed:'completed'}
 if (b.to==='out_for_delivery' && (!String(b.deliveryPerson||o.deliveryPerson||'').trim() || !String(b.deliveryPhone||o.deliveryPhone||'').trim())) throw new Error('出配送前请填写配送人员及电话')
 const updated=await tx.order.update({where:{id},data:{status:b.to,fulfillmentStatus:map[b.to],...(b.to==='completed'?{completedAt:new Date()}:{}),deliveryPerson:b.deliveryPerson||o.deliveryPerson,deliveryPhone:b.deliveryPhone||o.deliveryPhone}})
 await tx.fulfillmentEvent.create({data:{orderId:id,fromStatus:o.fulfillmentStatus,toStatus:map[b.to],operatorUserId:actor,notes:b.notes}})
 await awardOrderPoints(tx,id,actor)
 return updated
})
