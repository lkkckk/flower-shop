import { prisma } from '../../utils/prisma'
import { makeCsv } from '../../../shared/csv'
export default defineEventHandler(async event=>{
 const kind=getRouterParam(event,'kind')||''
 const tables:Record<string,string>={customers:'customer',products:'product',orders:'order',payments:'payment',accounts:'customerAccountEntry',points:'pointEntry',stocks:'stockBatch',purchases:'purchaseOrder',suppliers:'supplier',movements:'stockMovement'}
 if(!tables[kind])throw createError({statusCode:400,message:'不支持的导出类型'})
 const list=await (prisma as any)[tables[kind]].findMany({orderBy:{id:'asc'}})
 if(kind==='customers')for(const c of list){delete c.openid;delete c.unionid}
 return {data:{filename:`${kind}.csv`,csv:makeCsv(list)},error:null}
})
