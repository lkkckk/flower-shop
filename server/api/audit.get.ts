import { prisma } from '../utils/prisma'
export default defineEventHandler(async event => {
 const q=getQuery(event); const page=Math.max(1,Number(q.page)||1); const where=q.entityId?{entityId:String(q.entityId)}:{}
 return {data:{list:await prisma.auditLog.findMany({where,orderBy:{id:'desc'},skip:(page-1)*50,take:50}),total:await prisma.auditLog.count({where})},error:null}
})
