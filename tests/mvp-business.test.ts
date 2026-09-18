import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { parseEnv } from 'node:util'
import { createError } from 'h3'

// Explicit opt-in: this suite only targets a generated isolated acceptance schema.
const enabled = process.env.MVP_DATABASE_TEST === '1'
test('账本、积分、退款在无需交班时的真实 PostgreSQL 事务', { skip: !enabled }, async () => {
  Object.assign(process.env,parseEnv(readFileSync('.cache/pos-test.env','utf8')))
  assert.match(new URL(process.env.DATABASE_URL!).searchParams.get('schema')!, /^pos_acceptance_\d+$/)
  ;(globalThis as any).createError = createError
  const { prisma } = await import('../server/utils/prisma')
  const { businessTransaction } = await import('../server/utils/businessTransaction')
  const { createSale } = await import('../server/utils/createOrder')
  const { recharge, repayCustomer } = await import('../server/utils/accounts')
  const { requestAdjustment, approveAdjustment } = await import('../server/utils/orderAdjustments')
  const { mergeCustomers } = await import('../server/utils/customerCrm')
  const fixtures = JSON.parse(readFileSync('.cache/pos-test-fixtures.json', 'utf8'))
  const event = { context: { user: { sub: fixtures.userId, type: 'staff', role: 'admin' } } }
  const runId=randomUUID(); let seq = 0
  const run = (action: string, fn: any, body: any = {}) => businessTransaction(event, action, { ...body, idempotencyKey: `test-operation-${runId}-${++seq}` }, fn)
  try {
    const c = await prisma.customer.create({ data: { name: 'MVP 流水验证', level: 'member' } })
    const p = await prisma.product.create({ data: { name: 'MVP 月季', baseUnit: '枝', defaultPrice: '100.00', memberPrice: '90.00', vipPrice: '80.00', wholesalePrice: '70.00', stockBatches: { create: { batchNo: `MVP-${Date.now()}`, inboundDate: new Date(), expiryDate: new Date(Date.now() + 86400000), inboundQty: '100.000', currentQty: '100.000', costPrice: '20.00' } } } })
    await run('test.recharge', (tx: any, a: number, k: string) => recharge(tx, c.id, { amount: '200', paymentMethod: 'cash' }, a, k))
    const body = { idempotencyKey: `checkout-repeat-key-${runId}`, cart: { customerId: c.id, items: [{ productId: p.id, unit: '枝', qty: '2.000' }] }, payment: { method: 'balance', paidAmount: '180.00' } }
    const sale = await businessTransaction(event, 'test.checkout', body, (tx, a, k) => createSale(tx, a, k, body, 'admin'))
    const replay = await businessTransaction(event, 'test.checkout', body, () => { throw new Error('must not run') })
    assert.equal(sale.order.id, replay.order.id)
    let customer = await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })
    assert.equal(Number(customer.storedValueBalance), 20)
    assert.equal(Number(customer.receivableBalance), 0)
    assert.equal(customer.availablePoints, 180)
    const costs = await prisma.orderCostAllocation.aggregate({ where: { orderId: sale.order.id }, _sum: { totalCost: true } })
    assert.equal(Number(costs._sum.totalCost), 40)
    const adjustment = await run('test.return.request', (tx: any, a: number) => requestAdjustment(tx, sale.order.id, { type: 'return', reason: '退一枝', lines: [{ itemId: sale.order.items[0].id, qty: '1', disposition: 'restock' }] }, a))
    await run('test.return.approve', (tx: any, a: number, k: string) => approveAdjustment(tx, sale.order.id, adjustment.id, { decision: 'approve' }, a, k))
    customer = await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })
    assert.equal(Number(customer.storedValueBalance), 110)
    assert.equal(customer.availablePoints, 90)
    const credit = { cart: { customerId: c.id, items: [{ productId: p.id, qty: '1', unit: '枝' }] }, payment: { method: 'credit', paidAmount: 0 } }
    await run('test.credit', (tx: any, a: number, k: string) => createSale(tx, a, k, credit, 'admin'))
    await run('test.repay', (tx: any, a: number, k: string) => repayCustomer(tx, c.id, { amount: '90', paymentMethod: 'cash' }, a, k))
    customer = await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })
    assert.equal(Number(customer.storedValueBalance), 110)
    assert.equal(Number(customer.receivableBalance), 0)
    assert.equal(customer.availablePoints, 180)
    await assert.rejects(run('test.overpay', (tx: any, a: number, k: string) => repayCustomer(tx, c.id, { amount: '1', paymentMethod: 'cash' }, a, k)), /超过/)
    await assert.rejects(prisma.customerAccountEntry.updateMany({ where: { customerId: c.id }, data: { notes: '篡改' } }), /immutable/)
    assert.equal(await prisma.payment.count({ where: { customerId: c.id, cashShiftId: { not: null } } }), 0)
    const target = await prisma.customer.create({ data: { name: '合并目标' } })
    await run('test.merge', (tx: any, a: number, k: string) => mergeCustomers(tx, a, k, c.id, { targetId: target.id, reason: '重复档案' }))
    assert.equal(Number((await prisma.customer.findUniqueOrThrow({ where: { id: target.id } })).storedValueBalance), 110)
    assert.equal((await prisma.payment.count({ where: { customerId: c.id } })) > 0, true)
  } finally { await prisma.$disconnect() }
})
