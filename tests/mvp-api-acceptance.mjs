import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import bcrypt from 'bcryptjs'
Object.assign(process.env, parseEnv(readFileSync(process.env.MVP_TEST_ENV_FILE || '.cache/pos-test.env', 'utf8')))
const { PrismaClient } = await import('@prisma/client')
const testUrl=new URL(process.env.DATABASE_URL)
assert.ok(/^pos_acceptance_\d+$/.test(testUrl.searchParams.get('schema')) || (testUrl.hostname==='127.0.0.1' && testUrl.port==='55432' && testUrl.pathname==='/flower_mvp_backup_test') || (process.env.MVP_RESTORE_ACCEPTANCE==='1' && testUrl.hostname==='127.0.0.1' && /^\/flower_restore_[a-zA-Z0-9_]+$/.test(testUrl.pathname)),'Tests require an isolated acceptance schema, dedicated Docker database, or explicitly enabled flower_restore_* database')
const p = new PrismaClient()
const origin = process.env.MVP_TEST_ORIGIN || 'http://127.0.0.1:3010'
const tokens = {}
const suffix = Date.now().toString()
async function call(path, role = 'admin', method = 'GET', body, status = 200) {
  const response = await fetch(origin + path, { method, headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify({ idempotencyKey: randomUUID(), ...body }) } : {}) })
  const result = await response.json()
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`)
  if (status === 200) assert.equal(result.error, null, `${path}: ${JSON.stringify(result)}`)
  return result.data
}
try {
  for (const role of ['admin', 'staff', 'cashier']) {
    const username = `mvp_${role}_${suffix}`
    await p.user.create({ data: { username, name: `验收${role}`, role, passwordHash: await bcrypt.hash('MvpTest2026!', 10) } })
    const data = await call('/api/auth/login', role, 'POST', { username, password: 'MvpTest2026!' })
    tokens[role] = data.token
  }
  assert.equal((await call('/api/health')).status, 'ok')
  await call('/api/products', 'cashier', 'POST', { name: '不应被创建' }, 403)
  await call('/api/loyalty-rules', 'staff', 'PUT', { earnPerYuan: 999 }, 403)
  const c = await call('/api/customers', 'cashier', 'POST', { name: `测试会员${suffix}`, phone: suffix, level: 'normal' })
  await call(`/api/customers/${c.id}/points`, 'cashier', 'POST', { amount: 100, notes: '越权' }, 403)
  await call(`/api/customers/${c.id}`, 'staff', 'PUT', { name: c.name, phone: c.phone, level: 'member' })
  const flower = await p.product.create({ data: { name: `API 鲜花${suffix}`, baseUnit: '枝', defaultPrice: '10.00', memberPrice: '9.00', vipPrice: '8.00', wholesalePrice: '7.00', stockBatches: { create: { batchNo: `API-${suffix}`, inboundDate: new Date(), expiryDate: new Date(Date.now()+86400000*7), inboundQty: 100, currentQty: 100, costPrice: '2.00' } } } })
  const recipe = await p.product.create({ data: { name: `API 配方花束${suffix}`, baseUnit: '束', defaultPrice: '30', recipe: { create: { enabled: true, items: { create: { componentProductId: flower.id, qty: 3, unit: '枝' } } } } } })
  const cart = { customerId: c.id, items: [{ productId: flower.id, unit: '枝', qty: '2.000' }] }
  const quote = await call('/api/orders/quote', 'cashier', 'POST', cart)
  assert.equal(quote.total, '18.00')
  const checkout = { idempotencyKey: randomUUID(), cart, expectedTotal: '18.00', payment: { method: 'wechat', paidAmount: '18.00' } }
  const [sale, replay] = await Promise.all([call('/api/orders/checkout', 'cashier', 'POST', checkout), call('/api/orders/checkout', 'cashier', 'POST', checkout)])
  assert.equal(sale.order.id, replay.order.id)
  await call('/api/orders/checkout', 'cashier', 'POST', { ...checkout, expectedTotal: '1.00' }, 409)
  await call('/api/orders/checkout', 'cashier', 'POST', { cart: { ...cart, discount: '1.00', priceReason: '越权' }, payment: { method: 'wechat', paidAmount: 17 } }, 403)
  const after = await call(`/api/customers/${c.id}/profile`)
  assert.equal(after.availablePoints, 18)
  assert.equal(after.receivableBalance, '0.00')
  const request = await call(`/api/orders/${sale.order.id}/adjustments`, 'cashier', 'POST', { type: 'return', reason: '验收退货', lines: [{ itemId: sale.order.items[0].id, qty: 1, disposition: 'restock' }] })
  await call(`/api/orders/${sale.order.id}/adjustments/${request.id}/approve`, 'cashier', 'POST', { decision: 'approve' }, 403)
  await call(`/api/orders/${sale.order.id}/adjustments/${request.id}/approve`, 'staff', 'POST', { decision: 'approve', externalReference: `TEST-REFUND-${suffix}`,refundMethod:'original',lines:request.lines })
  assert.equal((await call(`/api/customers/${c.id}/profile`)).availablePoints, 9)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=', 'base64')
  const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'flower.png')
  const upload = await fetch(origin + '/api/preorders/images', { method: 'POST', headers: { Authorization: `Bearer ${tokens.cashier}` }, body: form })
  assert.equal(upload.status, 200)
  const image = (await upload.json()).data.imageUrl
  const pre = await call('/api/preorders', 'cashier', 'POST', { customerId: c.id, deliveryTime: new Date(Date.now()+86400000).toISOString(), receiverName: '验收收花人', receiverPhone: '13800000000', items: [{ productId: recipe.id, unit: '束', qty: 1, imageUrl: image }], payment: { method: 'wechat', paidAmount: '10.00' } })
  assert.equal(pre.owedAmount, '20.00')
  await call(`/api/preorders/${pre.id}`,'cashier','PUT',{receiverName:'修改收货人',items:pre.items})
  await call(`/api/orders/${pre.id}/payments`, 'cashier', 'POST', { amount: '20', paymentMethod: 'alipay' })
  for (const to of ['booked', 'scheduled', 'in_production', 'ready_to_ship', 'out_for_delivery', 'completed']) await call(`/api/preorders/${pre.id}/advance`, 'cashier', 'POST', { to, deliveryPerson: '配送验收', deliveryPhone: '13800000000' })
  const detail = await call(`/api/orders/${pre.id}`)
  assert.equal(detail.items[0].imageUrl, image)
  assert.equal(detail.fulfillmentStatus, 'completed')
  const cost = await p.orderCostAllocation.aggregate({ where: { orderId: pre.id }, _sum: { totalCost: true } })
  assert.equal(Number(cost._sum.totalCost), 6)
  assert.equal((await call(`/api/customers/${c.id}/profile`)).availablePoints, 39)
  const editable=await call('/api/preorders','cashier','POST',{customerId:c.id,deliveryTime:new Date(Date.now()+86400000).toISOString(),items:[{productId:flower.id,unit:'枝',qty:1}]})
  const repriced=await call(`/api/preorders/${editable.id}`,'staff','PUT',{items:editable.items,priceMode:'discount',discountRate:50,priceReason:'未收款预售优惠',expectedTotal:'4.50'})
  assert.equal(repriced.totalAmount,'4.50');assert.equal(repriced.discountRate,'50.00')
  const report = await call('/api/reports/dashboard?basis=sales')
  assert.equal(typeof report.summary.totalSales,'string')
  await call('/api/reports/cashier')
  await call('/api/stocks/stocktake/summary','cashier')
  await call('/api/reconciliation','cashier','GET',undefined,403)
  assert.deepEqual((await call('/api/reconciliation')).mismatches,[])
  const contact=await call(`/api/customers/${c.id}/contacts`,'staff','POST',{content:'验收联系',nextContactAt:new Date().toISOString()})
  await call(`/api/customers/${c.id}/contacts/${contact.id}`,'staff','PATCH',{completed:true})
  const anniversary=await call(`/api/customers/${c.id}/events`,'staff','POST',{title:'测试纪念日',calendar:'solar',month:1,day:1})
  await call(`/api/customers/${c.id}/events/${anniversary.id}`,'staff','PATCH',{active:false})
  await call('/api/customers','cashier','POST',{name:'越权等级',level:'vip'},403)
  const inboundBody={productId:flower.id,inboundQty:'3',costPrice:'1',inboundDate:new Date().toISOString(),idempotencyKey:randomUUID()}
  const inbound=await call('/api/stocks/inbound','staff','POST',inboundBody)
  assert.equal((await call('/api/stocks/inbound','staff','POST',inboundBody)).id,inbound.id)
  await call('/api/stocks/discount','staff','POST',{batchId:inbound.id,discountPrice:'2',specialQty:'1',specialUntil:new Date(Date.now()+86400000).toISOString()})
  const catalog=await call('/api/products/with-stock','cashier')
  assert.ok(catalog.list.find(p=>p.id===flower.id).specialBatches.some(b=>b.id===inbound.id))
  await call('/api/stocks/scrap','staff','POST',{batchId:inbound.id,qty:'1',reason:'验收报损'})
  await call(`/api/payments/statement?customerId=${c.id}`)
  const preview = await call('/api/imports/preview', 'admin', 'POST', { kind: 'customers', csv: `name,phone,level\n导入客户${suffix},,member` })
  assert.equal(preview.errors.length, 0)
  const commitBody = { idempotencyKey: randomUUID() }
  await call(`/api/imports/${preview.id}/commit`, 'admin', 'POST', commitBody)
  await call(`/api/imports/${preview.id}/commit`, 'admin', 'POST', commitBody)
  assert.equal(await p.customer.count({ where: { name: `导入客户${suffix}` } }), 1)
  console.log(JSON.stringify({ status: 'passed', checks: ['RBAC', 'member pricing', 'concurrent idempotency', 'partial refund', 'points', 'cashier image upload', 'preorder deposit and balance', 'recipe allocation', 'delivery', 'report and statement', 'CSV commit replay'], customerId: c.id, orderId: sale.order.id, preorderId: pre.id, username: `mvp_admin_${suffix}` }))
} finally { await p.$disconnect() }
