import { prisma } from '../../../utils/prisma'
import { customerTimeline } from '../../../utils/customerCrm'
export default defineEventHandler(async event => {
 const q = getQuery(event); const page = Math.max(1, Math.min(10000, Number(q.page) || 1)); const pageSize = Math.max(1, Math.min(100, Number(q.pageSize) || 20))
 return { data: await customerTimeline(prisma, Number(getRouterParam(event, 'id')), page, pageSize), error: null }
})
