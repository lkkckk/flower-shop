// 独立 PostgreSQL schema 的验收数据，绝不修改 public 中的店铺业务数据。
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

process.loadEnvFile('.env')
const url = new URL(process.env.DATABASE_URL)
const schema = `pos_acceptance_${Date.now()}`
url.searchParams.set('schema', schema)
const env = { ...process.env, DATABASE_URL: url.toString() }
const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8' })
if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout)
const p = new PrismaClient({ datasources: { db: { url: url.toString() } } })
try {
  const user = await p.user.create({ data: { username: 'pos_acceptance', passwordHash: await bcrypt.hash('PosAcceptance2026!', 10), name: '验收收银员', role: 'cashier' } })
  const category = await p.category.create({ data: { name: '产地鲜花', children: { create: [{ name: '玫瑰' }, { name: '百合' }] } }, include: { children: true } })
  await p.category.create({ data: { name: '花束成品' } })
  const names = ['洛神玫瑰', '玫瑰花', '香水百合', '绣球（抹茶冰淇淋）', '多头康（香橙）', '缺货花材']
  const products = []
  for (const [index, name] of names.entries()) {
    products.push(await p.product.create({ data: {
      name, defaultPrice: index === 0 ? 1.89 : 5, baseUnit: '枝', specification: '10枝/扎', grade: 'A级', color: index < 2 ? '粉色' : '混色', categoryId: category.children[index === 2 ? 1 : 0].id,
      unitConversions: { create: [{ fromUnit: '扎', toBaseQty: 10 }] },
      stockBatches: { create: { batchNo: `TEST-${index}`, inboundDate: new Date(), expiryDate: new Date(Date.now() + 7 * 86400000), inboundQty: index === 5 ? 0 : 100, currentQty: index === 5 ? 0 : 100, costPrice: 1 } },
    } }))
  }
  const customer = await p.customer.create({ data: { name: '验收客户', level: 'vip', balance: 100 } })
  await p.setting.createMany({ data: [{ key: 'shopName', value: '花店收银验收' }, { key: 'lowStockThreshold', value: '0' }] })
  const promotion = await p.promotion.create({ data: { name: '满100减15', threshold: 100, reduction: 15 } })
  mkdirSync('.cache', { recursive: true })
  writeFileSync('.cache/pos-test.env', `DATABASE_URL=${url}\nJWT_SECRET=pos-acceptance-only-secret-2026-test\nNOTIFICATION_TICK_DISABLED=1\n`)
  writeFileSync('.cache/pos-test-fixtures.json', JSON.stringify({ schema, userId: user.id, customerId: customer.id, productIds: products.map(p => p.id), promotionId: promotion.id }))
  console.log(JSON.stringify({ schema, products: products.length, status: 'ready' }))
} finally { await p.$disconnect() }
