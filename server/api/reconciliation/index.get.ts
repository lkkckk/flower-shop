import { prisma } from '../../utils/prisma'
import { reconcile } from '../../utils/reconciliation'
export default defineEventHandler(async()=>({data:await prisma.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(72410903)`
 return reconcile(tx)
},{timeout:30000}),error:null}))
