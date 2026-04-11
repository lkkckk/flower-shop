export default defineEventHandler(async () => {
  try {
    const productCount = await prisma.product.count()
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        productCount,
      },
      error: null,
    }
  } catch (e: any) {
    return {
      data: null,
      error: e.message || 'Database connection failed',
    }
  }
})
