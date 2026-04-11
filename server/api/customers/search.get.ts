import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = query.keyword as string | undefined

  const where: any = {}
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
    ]
  }

  try {
    const list = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        level: true,
        balance: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return { data: { list }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '搜索客户失败', code: 'FETCH_ERROR' },
    }
  }
})
