import { prisma } from '../../utils/prisma'
import { reportRange } from '../../utils/businessReports'
import { sumMoney } from '../../../shared/money'
export default defineEventHandler(async event=>{
 const q=getQuery(event), id=Number(q.customerId); const {startDate,endDate,filter}=reportRange(q)
 const customer=await prisma.customer.findUnique({where:{id}})
 if(!customer)throw createError({statusCode:404,message:'客户不存在'})
 const entries=await prisma.customerAccountEntry.findMany({where:{customerId:id,account:'receivable',createdAt:filter},orderBy:[{createdAt:'asc'},{id:'asc'}]})
 const prior=await prisma.customerAccountEntry.aggregate({where:{customerId:id,account:'receivable',createdAt:{lt:startDate}},_sum:{amount:true}})
 const opening=sumMoney([prior._sum.amount||0]), closing=opening.plus(sumMoney(entries.map(e=>e.amount)))
 const orders=await prisma.order.findMany({where:{customerId:id,createdAt:filter},include:{items:{include:{product:true}}}})
 const payments=await prisma.payment.findMany({where:{customerId:id,createdAt:filter,paymentMethod:{not:'balance'}},orderBy:{createdAt:'asc'}})
 return {data:{customer,startDate,endDate,openingBalance:opening.toFixed(2),closingBalance:closing.toFixed(2),entries,orders,payments,summary:{totalSales:sumMoney(orders.map(o=>o.totalAmount)).toFixed(2),totalPaid:sumMoney(payments.map(p=>p.amount)).toFixed(2),totalOwed:sumMoney(entries.filter(e=>Number(e.amount)>0).map(e=>e.amount)).toFixed(2),totalRepay:sumMoney(entries.filter(e=>Number(e.amount)<0).map(e=>-Number(e.amount))).toFixed(2),closingBalance:closing.toFixed(2)}},error:null}
})
