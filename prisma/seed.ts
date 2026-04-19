import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const defaultUsername = 'admin'
  const defaultPassword = 'admin123'

  const existing = await prisma.user.findUnique({ where: { username: defaultUsername } })
  if (existing) {
    console.log(`✓ 默认管理员已存在 (id=${existing.id})`)
    return
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10)
  const user = await prisma.user.create({
    data: {
      username: defaultUsername,
      passwordHash,
      name: '管理员',
      role: 'admin',
    },
  })
  console.log(`✓ 已创建默认管理员: username=${user.username}, password=${defaultPassword}`)
  console.log('⚠️  请登录后立即修改密码')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
