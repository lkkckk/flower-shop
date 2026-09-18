import { prisma } from '../../utils/prisma'
export default defineEventHandler(async () => ({ data: { list: await prisma.supplier.findMany({ include: { entries: true }, orderBy: { id: 'desc' } }) }, error: null }))
