import { prisma } from '../../utils/prisma'
export default defineEventHandler(async () => ({ data: { list: await prisma.purchaseOrder.findMany({ include: { supplier: true, items: true, receipts: true }, orderBy: { id: 'desc' }, take: 200 }) }, error: null }))
