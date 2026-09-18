import { prisma } from '../../utils/prisma'
import { businessReport } from '../../utils/businessReports'
export default defineEventHandler(async event=>({data:await businessReport(prisma,getQuery(event)),error:null}))
