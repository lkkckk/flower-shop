import { prisma } from '../../utils/prisma'
import { money } from '../../../shared/money'
import { reportRange } from '../../utils/businessReports'
export default defineEventHandler(async event=>{
 try{
 const {filter,startDate,endDate}=reportRange(getQuery(event)),cashierId=getQuery(event).cashierId?Number(getQuery(event).cashierId):undefined
 const [users,orders,payments,refunds]=await Promise.all([
  prisma.user.findMany({select:{id:true,name:true,username:true}}),
  prisma.order.findMany({where:{completedAt:filter,...(cashierId?{cashierId}:{})}}),
  prisma.payment.findMany({where:{createdAt:filter,paymentMethod:{not:'balance'},...(cashierId?{operatorUserId:cashierId}:{})}}),
  prisma.orderAdjustment.findMany({where:{status:'approved',OR:[{approvedAt:filter},{order:{completedAt:filter}}],order:{completedAt:{not:null},...(cashierId?{cashierId}:{})}},include:{order:true}})
 ])
 const map=new Map<number,any>()
 const row=(id:number)=>{if(!map.has(id)){const u=users.find(u=>u.id===id);map.set(id,{cashierId:id,cashierName:u?.name||'历史未记录',cashierUsername:u?.username||'',orderCount:0,totalSales:money(0),totalPaid:money(0),totalOwed:money(0),paymentBreakdown:{}})}return map.get(id)}
 for(const o of orders){const r=row(o.cashierId||0);r.orderCount++;r.totalSales=r.totalSales.plus(o.totalAmount);r.totalOwed=r.totalOwed.plus(o.owedAmount)}
 for(const a of refunds){const recognized=new Date(Math.max(new Date(a.approvedAt!).getTime(),new Date(a.order.completedAt!).getTime()));if(recognized<startDate||recognized>=endDate)continue;const r=row(a.order.cashierId||0);r.totalSales=r.totalSales.minus(a.amount)}
 for(const p of payments){const r=row(p.operatorUserId||0);r.totalPaid=r.totalPaid.plus(p.amount);r.paymentBreakdown[p.paymentMethod]=money(r.paymentBreakdown[p.paymentMethod]||0).plus(p.amount).toFixed(2)}
 return {data:[...map.values()].map(r=>({...r,totalSales:r.totalSales.toFixed(2),totalPaid:r.totalPaid.toFixed(2),totalOwed:r.totalOwed.toFixed(2)})),error:null}
 }catch(e:any){setResponseStatus(event,400);return {data:null,error:{message:e.message}}}
})
