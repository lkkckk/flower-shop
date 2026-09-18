import { businessHandler } from '../../utils/businessTransaction'
import { decimal } from '../../../shared/money'
export default businessHandler('stock.deactivate',async(tx,actor,key,b,event)=>{
 const id=Number(getRouterParam(event,'id'));const batch=await tx.stockBatch.findUnique({where:{id}})
 if(!batch)throw new Error('批次不存在')
 if(decimal(batch.currentQty).gt(0))throw new Error('有库存的批次请先报损或盘点，不能停用')
 return tx.stockBatch.update({where:{id},data:{status:'inactive'}})
})
