import prismaClientPkg from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

const { PrismaClient } = prismaClientPkg

// 使用全局变量避免开发环境热更新时创建多个 PrismaClient 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
