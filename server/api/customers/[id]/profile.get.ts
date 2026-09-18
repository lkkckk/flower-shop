import { prisma } from '../../../utils/prisma'
export default defineEventHandler(async event => ({ data: await prisma.customer.findUnique({ where: { id: Number(getRouterParam(event, 'id')) }, include: { tags: true, events: true, contacts: { orderBy: { createdAt: 'desc' }, take: 100 } } }), error: null }))
