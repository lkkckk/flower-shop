import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = query.keyword as string | undefined

  const where: any = {}
  
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } }
    ]
  }

  try {
    const list = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50 // 取前50个以便选择
    })

    return {
      data: { list },
      error: null,
    }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '获取客户列表失败', code: 'FETCH_ERROR' },
    }
  }
})
