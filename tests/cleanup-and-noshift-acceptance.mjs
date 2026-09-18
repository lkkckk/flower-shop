import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { registrationEnvironment } from './helpers/registration-environment.mjs'

const environment = await registrationEnvironment()
const { prisma, origin, users, password } = environment
const tokens = {}
const request = async (path, role = 'cashier', method = 'GET', body) => {
  const response = await fetch(origin + path, { method, headers: {
    Authorization: `Bearer ${tokens[role] || ''}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
  }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) })
  const json = await response.json()
  return { status: response.status, ...json }
}
const write = (path, role, body) => request(path, role, 'POST', { ...body, idempotencyKey: randomUUID() })
const ok = response => { assert.equal(response.status, 200, JSON.stringify(response)); return response.data }
try {
  for (const role of Object.keys(users)) tokens[role] = ok(await request('/api/auth/login', role, 'POST', { username: role, password })).token
  const retired = [
    ['GET', '/api/shifts'], ['POST', '/api/shifts'], ['POST', '/api/shifts/1/close'],
    ['GET', '/api/preorders/schedule'], ['GET', '/api/preorders/stats/hot'],
    ['POST', '/api/preorders'], ['PUT', '/api/preorders/1'], ['POST', '/api/preorders/1/advance'],
    ['PATCH', '/api/preorders/1/made'], ['PATCH', '/api/preorders/1/urgent'],
    ['GET', '/api/purchases'], ['POST', '/api/purchases'], ['POST', '/api/purchases/1/receive'],
    ['GET', '/api/suppliers'], ['POST', '/api/suppliers/1/payments'], ['GET', '/api/audit'],
    ['GET', '/api/imports'], ['POST', '/api/imports/preview'], ['POST', '/api/imports/1/commit'],
    ['GET', '/api/exports/customers'], ['GET', '/api/reconciliation'], ['PUT', '/api/loyalty-rules'],
  ]
  for (const role of Object.keys(users)) for (const [method, path] of retired) {
    assert.equal((await request(path, role, method, method === 'GET' ? undefined : {})).status, 404, `${role} ${method} ${path}`)
  }
  console.log('PASS 已取消接口：三个角色均无法调用')
  assert.equal(await prisma.cashShift.count(), 0)
  const c = await prisma.customer.create({ data: { name: '免交班验收', level: 'member' } })
  const p = await prisma.product.create({ data: { name: '测试月季', baseUnit: '枝', defaultPrice: 20, memberPrice: 18,
    stockBatches: { create: { batchNo: randomUUID(), inboundDate: new Date(), expiryDate: new Date(Date.now() + 86400000), inboundQty: 50, currentQty: 50, costPrice: 5 } } } })
  ok(await write(`/api/customers/${c.id}/recharge`, 'admin', { amount: 100, paymentMethod: 'cash' }))
  const sale = async (method, qty) => ok(await write('/api/orders/checkout', 'cashier', {
    cart: { customerId: c.id, items: [{ productId: p.id, qty, unit: '枝' }] }, payment: { method, paidAmount: method === 'credit' ? 0 : qty * 18 },
  })).order
  const paid = await sale('cash', 2)
  const credit = await sale('credit', 1)
  ok(await write(`/api/orders/${credit.id}/payments`, 'cashier', { amount: 18, paymentMethod: 'cash' }))
  await sale('credit', 1)
  ok(await write(`/api/customers/${c.id}/repay`, 'admin', { amount: 18, paymentMethod: 'cash' }))
  const adjustment = ok(await write(`/api/orders/${paid.id}/adjustments`, 'cashier', {
    type: 'return', reason: '本地验收', lines: [{ itemId: paid.items[0].id, qty: 1, disposition: 'restock' }],
  }))
  ok(await write(`/api/orders/${paid.id}/adjustments/${adjustment.id}/approve`, 'admin', { decision: 'approve', refundMethod: 'original', lines: adjustment.lines }))
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })
  assert.equal(Number(customer.storedValueBalance), 100)
  assert.equal(Number(customer.receivableBalance), 0)
  assert.equal(customer.availablePoints, 54)
  const payments = await prisma.payment.findMany({ where: { customerId: c.id } })
  assert.ok(payments.some(p => p.type === 'refund'))
  assert.ok(payments.every(p => p.cashShiftId === null && [users.admin.id, users.cashier.id].includes(p.operatorUserId)))
  assert.equal(await prisma.cashShift.count(), 0)
  for (const path of ['/api/loyalty-rules', '/api/reports/dashboard', '/api/reports/cashier']) ok(await request(path, 'admin'))
  console.log('PASS 无开班：现金充值、结账、补款、还款、部分退款；余额、积分和真实操作人核对')

  const counts = async () => Promise.all([prisma.order.count(), prisma.stockMovement.count(), prisma.customerAccountEntry.count(), prisma.pointEntry.count()])
  const baseline = await counts()
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
  const form = new FormData(); form.append('file', new Blob([bytes], { type: 'image/png' }), 'test.png')
  const imageUrl = ok(await request('/api/preorder-registrations/images', 'cashier', 'POST', form)).imageUrl
  const payload = { orderNo: '重复编号验收', notes: '多行备注\n打印完整显示', cardMessage: '生日快乐\n万事如意',
    items: [{ name: '手填玫瑰花束', qty: '1.125', photos: Array.from({ length: 4 }, (_, sort) => ({ url: imageUrl, sort })) }], idempotencyKey: randomUUID() }
  const createResults = await Promise.all([request('/api/preorder-registrations', 'cashier', 'POST', payload), request('/api/preorder-registrations', 'cashier', 'POST', payload)])
  const reg = ok(createResults[0]); assert.equal(ok(createResults[1]).id, reg.id)
  const duplicate = ok(await write('/api/preorder-registrations', 'cashier', payload))
  assert.notEqual(duplicate.id, reg.id)
  assert.equal(reg.items[0].photos.length, 4)
  const update = { ...payload, version: reg.version, notes: '修改后', idempotencyKey: randomUUID() }
  const updates = await Promise.all([request(`/api/preorder-registrations/${reg.id}`, 'cashier', 'PUT', update), request(`/api/preorder-registrations/${reg.id}`, 'cashier', 'PUT', update)])
  assert.deepEqual(ok(updates[0]), ok(updates[1]))
  assert.equal(updates[0].data.version, 2)
  const race = await Promise.all(['第一人', '第二人'].map(name => request(`/api/preorder-registrations/${reg.id}`, 'cashier', 'PUT', {
    ...payload, version: 2, idempotencyKey: randomUUID(), items: [{ name, qty: '2', photos: [] }],
  })))
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409])
  const finalReg = ok(await request(`/api/preorder-registrations/${reg.id}`))
  assert.equal(finalReg.version, 3); assert.equal(finalReg.items.length, 1)
  assert.equal(finalReg.items[0].name, race.find(r => r.status === 200).data.items[0].name)
  assert.equal((await request(`/api/preorder-registrations/${reg.id}`, 'cashier', 'PUT', { ...update, notes: '同键不同内容' })).status, 409)
  for (const role of ['cashier', 'staff']) assert.equal((await write(`/api/preorder-registrations/${reg.id}/trash`, role, {})).status, 403)
  ok(await write(`/api/preorder-registrations/${reg.id}/trash`, 'admin', {}))
  assert.ok(!ok(await request('/api/preorder-registrations')).list.some(r => r.id === reg.id))
  ok(await write(`/api/preorder-registrations/${reg.id}/restore`, 'admin', {}))
  assert.ok(ok(await request('/api/preorder-registrations')).list.some(r => r.id === reg.id))
  assert.deepEqual(await counts(), baseline)
  const historical = await prisma.order.create({ data: { orderNo: randomUUID(), orderType: 'preorder', totalAmount: 0, paidAmount: 0, owedAmount: 0 } })
  ok(await request(`/api/preorders/${historical.id}`))
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: historical.id } })).updatedAt.getTime(), historical.updatedAt.getTime())
  ok(await write(`/api/preorders/${historical.id}/trash`, 'admin', {}))
  ok(await write(`/api/preorders/${historical.id}/restore`, 'admin', {}))
  console.log('PASS 预售多图、重复编号、创建/修改并发幂等、版本冲突、回收站、旧记录只读及账务库存隔离')
  if (process.argv.includes('--serve')) {
    await mkdir('.cache', { recursive: true })
    await writeFile('.cache/registration-browser.json', JSON.stringify({ origin, username: 'cashier', password, printId: duplicate.id, imageRoot: environment.imageRoot }))
    console.log(`浏览器验收服务：${origin}（隔离数据库，停止后清理）`)
    await new Promise(resolve => {
      process.once('SIGINT', resolve); process.once('SIGTERM', resolve)
      process.stdin.resume(); process.stdin.once('data', resolve)
    })
    process.stdin.pause()
  }
} finally { await environment.dispose() }
