import prismaClientPkg from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

const { PrismaClient } = prismaClientPkg

// 使用全局变量避免开发环境热更新时创建多个 PrismaClient 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

const freshClient = !globalForPrisma.prisma
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
// Legacy reporting/layout adapters use finite JS numbers; all authoritative writes
// use shared/money Decimal arithmetic. Decimal(12,*) round-trips exactly as a decimal string.
function legacyNumbers(value: any): any {
  if (value && typeof value === 'object' && prismaClientPkg.Prisma.Decimal.isDecimal(value)) return value.toNumber()
  if (Array.isArray(value)) return value.map(legacyNumbers)
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    for (const key of Object.keys(value)) value[key] = legacyNumbers(value[key])
  }
  return value
}
if (freshClient) prisma.$use(async (params, next) => legacyNumbers(await next(params)))

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
