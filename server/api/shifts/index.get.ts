import { prisma } from '../../utils/prisma'
import { shiftCash } from '../../utils/operations'
export default defineEventHandler(async event => {
 const u = event.context.user
 const list = await prisma.cashShift.findMany({ where: u.role === 'admin' ? {} : { userId: u.sub }, orderBy: { id: 'desc' }, take: 100, include: { movements: true } })
 for (const shift of list) {
  (shift as any).currentExpected=(await shiftCash(prisma,shift)).toFixed(2)
  ;(shift as any).payments=await prisma.payment.findMany({where:{cashShiftId:shift.id},orderBy:{createdAt:'asc'}})
 }
 return { data: { list }, error: null }
})
