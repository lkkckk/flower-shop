import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteOrder } from '../server/utils/orderPricing'
import { allocateAndDeduct } from '../server/utils/stockAllocator'
import { requestAdjustment } from '../server/utils/orderAdjustments'
import { businessReport } from '../server/utils/businessReports'

const product = { id: 1, name: '柠檬茶', productType: 'drink', status: 'active', baseUnit: '杯', defaultPrice: '99', memberPrice: '90', vipPrice: '80', wholesalePrice: '70', unitConversions: [], recipe: null,
  drinkGroups: [{ id: 'temp', name: '温度', sortOrder: 0, active: true, options: [{ id: 'cold', name: '冷', active: true }] }],
  drinkVariants: [{ id: 'v1', enabled: true, price: '12.50', options: [{ groupId: 'temp', optionId: 'cold' }] }] }
const tx = () => ({ product: { findUnique: async () => product }, setting: { findUnique: async () => null }, customer: { findUnique: async () => ({ id: 1, status: 'active', level: 'vip' }) } })
const cart = (extra = {}) => ({ customerId: 1, items: [{ productId: 1, variantId: 'v1', expectedUnitPrice: '12.50', qty: 2, unit: '杯', ...extra }] })
test('drink quote uses variant base price regardless of customer tier and saves snapshots', async () => {
  for (const level of ['normal', 'member', 'vip', 'wholesale']) {
    const db = tx()
    db.customer.findUnique = async () => ({ id: 1, status: 'active', level })
    const q = await quoteOrder(db, cart(), 'admin')
    assert.equal(q.total, '25.00')
    assert.equal(q.items[0].variantLabel, '冷')
    assert.equal(q.items[0].productNameSnapshot, '柠檬茶')
  }
})
test('drink quote rejects absent, stale and foreign variants and fractional cups', async () => {
  for (const input of [{ variantId: undefined }, { variantId: 'foreign' }, { expectedUnitPrice: undefined }, { expectedUnitPrice: '12' }, { qty: '1.5' }, { specialBatchId: 1 }, { unit: '瓶' }]) {
    await assert.rejects(() => quoteOrder(tx(), cart(input), 'admin'))
  }
})
test('drink allocation persists a historical row without touching batches', async () => {
  const rows: any[] = []
  await allocateAndDeduct({ ...tx(), $executeRaw: async () => {}, orderItem: { create: async ({ data }: any) => { rows.push(data); return { id: 1, ...data } } }, stockBatch: { findMany: async () => { throw new Error('drink must not allocate stock') } } }, 1,
    [{ productId: 1, unit: '杯', qty: '2', baseQty: '2', unitPrice: '12.50', subtotal: '25.00', productTypeSnapshot: 'drink', productNameSnapshot: '柠檬茶', variantId: 'v1', variantLabel: '冷' }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].variantLabel, '冷')
})
test('drink returns need no disposition but must return whole cups', async () => {
  const db = { order: { findUnique: async () => ({ items: [{ id: 1, productTypeSnapshot: 'drink', qty: '2', returnedQty: '0', subtotal: '25' }] }) }, orderAdjustment: { create: async ({ data }: any) => data } }
  const result = await requestAdjustment(db, 1, { type: 'return', reason: '退一杯', lines: [{ itemId: 1, qty: 1 }] }, 1)
  assert.equal(result.amount, '12.50')
  assert.equal(result.lines[0].disposition, 'none')
  await assert.rejects(() => requestAdjustment(db, 1, { type: 'return', reason: '退半杯', lines: [{ itemId: 1, qty: '.5' }] }, 1))
})
test('drink sales and refunds count as revenue, not confirmed profit or missing historical cost', async () => {
  const item = { id: 1, productId: 1, product, productTypeSnapshot: 'drink', productNameSnapshot: '原名', qty: '2', baseQty: '2', subtotal: '25', costAllocations: [] }
  const order = { id: 1, completedAt: new Date('2026-09-19T04:00:00Z'), totalAmount: '25', items: [item] }
  const adjustment = { id: 1, order, approvedAt: new Date('2026-09-19T05:00:00Z'), amount: '12.50', lines: [{ itemId: 1, qty: '1', amount: '12.50' }] }
  const report = await businessReport({ order: { findMany: async () => [order] }, orderAdjustment: { findMany: async () => [adjustment] }, payment: { findMany: async () => [] }, customerAccountEntry: { findMany: async () => [] }, product: { findMany: async () => [] } }, { startDate: '2026-09-19', endDate: '2026-09-19' })
  assert.equal(report.summary.totalSales, '12.50')
  assert.equal(report.summary.uncostedDrinkSales, '12.50')
  assert.equal(report.summary.grossProfit, '0.00')
  assert.equal(report.dailyTrend[0].profit, '0.00')
  assert.equal(report.topProducts[0].qty, '1.000')
  assert.equal(report.topProducts[0].productName, '原名')
  assert.deepEqual(report.missingCostOrders, [])
})
test('cash and receivable trends do not present movements as profit', async () => {
  const date = new Date('2026-09-19T04:00:00Z')
  const db = { order: { findMany: async () => [] }, orderAdjustment: { findMany: async () => [] }, payment: { findMany: async () => [{ createdAt: date, paymentMethod: 'cash', amount: '25.00' }] }, customerAccountEntry: { findMany: async () => [{ createdAt: date, amount: '12.50' }] }, product: { findMany: async () => [] } }
  for (const basis of ['cash', 'receivable']) {
    const report = await businessReport(db, { basis, startDate: '2026-09-19', endDate: '2026-09-19' })
    assert.equal(report.dailyTrend[0].amount, basis === 'cash' ? '25.00' : '12.50')
    assert.equal(report.dailyTrend[0].profit, null)
  }
})
