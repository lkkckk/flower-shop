import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function ensureUser(username: string, password: string, name: string, role: string) {
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`✓ 用户已存在：${username} (role=${existing.role}, id=${existing.id})`)
    return existing
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, passwordHash, name, role },
  })
  console.log(`✓ 已创建 ${role} 用户：username=${user.username}, password=${password}`)
  return user
}

async function ensureSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: {},
    create: { key, value },
  })
  console.log(`✓ Setting 初始化：${key}=${value}`)
}

async function ensurePromotion(name: string, threshold: number, reduction: number) {
  const existing = await prisma.promotion.findFirst({ where: { name } })
  if (existing) {
    console.log(`✓ 促销活动已存在：${name}`)
    return
  }
  await prisma.promotion.create({
    data: {
      name,
      type: 'full_reduction',
      threshold,
      reduction,
      status: 'active',
    },
  })
  console.log(`✓ 已创建促销活动：${name}（满 ${threshold} 减 ${reduction}）`)
}

async function main() {
  // 用户
  await ensureUser('admin', 'admin123', '管理员', 'admin')
  await ensureUser('cashier', 'cashier123', '收银员', 'cashier')

  // 全局设置
  await ensureSetting('lowStockThreshold', '20')
  await ensureSetting('storeName', '花间集')

  // 示例促销活动
  await ensurePromotion('满 100 减 10', 100, 10)
  await ensurePromotion('满 200 减 25', 200, 25)

  console.log('\n⚠️  首次部署后请登录并立即修改默认密码！')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
