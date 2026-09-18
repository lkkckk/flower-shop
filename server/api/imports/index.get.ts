import { prisma } from '../../utils/prisma'
import { csvTemplates } from '../../utils/dataTransfer'
export default defineEventHandler(async()=>({data:{templates:csvTemplates,list:await prisma.importJob.findMany({select:{id:true,kind:true,status:true,errors:true,createdAt:true},orderBy:{id:'desc'},take:100})},error:null}))
