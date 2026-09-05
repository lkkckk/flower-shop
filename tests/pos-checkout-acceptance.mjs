import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { PrismaClient } from '@prisma/client'
Object.assign(process.env, parseEnv(readFileSync('.cache/pos-test.env', 'utf8')))
const f = JSON.parse(readFileSync('.cache/pos-test-fixtures.json', 'utf8'))
assert.equal(new URL(process.env.DATABASE_URL).searchParams.get('schema'), f.schema)
assert.match(f.schema, /^pos_acceptance_\d+$/)
const p = new PrismaClient()
const origin = process.env.POS_TEST_ORIGIN || 'http://127.0.0.1:3000'
const request = async (path, body, token) => {
  const res = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: res.status, body: await res.json() }
}
try {
  const login = await request('/api/auth/login', { username: 'pos_acceptance', password: 'PosAcceptance2026!' })
  assert.ok(login.body.data?.token, '必须是独立验收账号')
  const token = login.body.data.token
  const catalog = await request('/api/products/with-stock', null, token)
  assert.equal(catalog.body.data.list.length, 6, '拒绝对真实业务库执行验收')
  const baseItem = { productId: f.productIds[1], unit: '扎', qty: 2, baseQty: 1, unitPrice: 0, subtotal: 0 }
  const checkout = (overrides = {}) => request('/api/orders/checkout', { expectedTotal: 100, cart: { items: [baseItem], priceMode: 'retail' }, payment: { method: 'cash', paidAmount: 100, owedAmount: 999 }, ...overrides }, token)
  const stockBefore = (await p.stockBatch.aggregate({ where: { productId: baseItem.productId }, _sum: { currentQty: true } }))._sum.currentQty
  const sale = await checkout()
  assert.equal(sale.body.error, null, JSON.stringify(sale.body.error))
  const order = await p.order.findUnique({ where: { id: sale.body.data.order.id }, include: { items: true, payments: true } })
  assert.equal(order.totalAmount, 100)
  assert.equal(order.owedAmount, 0)
  assert.equal(order.items.reduce((n, i) => n + i.baseQty, 0), 20, '服务端重算基础数量，不信任传入的1枝')
  assert.equal(order.payments[0].amount, 100)
  const stockAfter = (await p.stockBatch.aggregate({ where: { productId: baseItem.productId }, _sum: { currentQty: true } }))._sum.currentQty
  assert.equal(stockBefore - stockAfter, 20)
  const count = await p.order.count()
  const invalid = await checkout({ cart: { items: [{ ...baseItem, qty: -1 }] } })
  assert.equal(invalid.status, 400)
  const shortage = await checkout({ expectedTotal: 50000, cart: { items: [{ ...baseItem, qty: 1000 }] }, payment: { method: 'cash', paidAmount: 50000 } })
  assert.equal(shortage.body.error.code, 'INSUFFICIENT_STOCK')
  const priceChange = await checkout({ expectedTotal: 1 })
  assert.equal(priceChange.body.error.code, 'PRICE_CHANGED')
  assert.equal(await p.order.count(), count, '失败订单与扣库存全部回滚')
  const discounted = await checkout({ expectedTotal: 80, cart: { items: [baseItem], priceMode: 'discount', discountRate: 85, discount: 5 }, payment: { method: 'cash', paidAmount: 80 } })
  assert.equal(discounted.body.data?.total, 80, JSON.stringify(discounted.body))
  const promoted = await checkout({ expectedTotal: 85, cart: { items: [baseItem], priceMode: 'promotion', promotionId: f.promotionId }, payment: { method: 'cash', paidAmount: 85 } })
  assert.equal(promoted.body.data?.total, 85)
  const stored = await checkout({ expectedTotal: 5, cart: { customerId: f.customerId, items: [{ ...baseItem, unit: '枝', qty: 1 }] }, payment: { method: 'balance', paidAmount: 5 } })
  assert.equal(stored.body.error, null)
  assert.equal((await p.customer.findUnique({ where: { id: f.customerId } })).balance, 95)
  const credit = await checkout({ expectedTotal: 5, cart: { customerId: f.customerId, items: [{ ...baseItem, unit: '枝', qty: 1 }] }, payment: { method: 'credit', paidAmount: 0, owedAmount: 0 } })
  assert.equal(credit.body.data.order.owedAmount, 5)
  assert.equal((await p.customer.findUnique({ where: { id: f.customerId } })).totalOwed, 5)
  const receipt = await request(`/api/orders/${order.id}`, null, token)
  assert.equal(receipt.body.data.totalAmount, 100)
  console.log('PASS: 真实 API + PostgreSQL：单位换算、金额、库存流水、收款流水、非法输入、库存不足回滚、价格变化、折扣、满减、储值、挂账及小票读取')
} finally { await p.$disconnect() }
