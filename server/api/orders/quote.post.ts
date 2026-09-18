import { prisma } from '../../utils/prisma'
import { quoteOrder } from '../../utils/orderPricing'
export default defineEventHandler(async event=>{
 try{return {data:await quoteOrder(prisma,await readBody(event),event.context.user.role),error:null}}
 catch(e:any){setResponseStatus(event,e.statusCode||400);return {data:null,error:{message:e.message}}}
})
