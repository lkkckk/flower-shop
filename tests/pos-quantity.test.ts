import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSaleUnits, getUnitFactor, remainingSaleQuantity } from '../shared/posQuantity'
import { computeOrder } from '../shared/priceMode'

const rose = { id: 1, baseUnit: '枝', totalStock: 25, unitConversions: [{ fromUnit: '扎', toBaseQty: 10 }] }
test('枝和扎共用库存，不同商品不相互扣减', () => {
  const items = [{ id: 'a', productId: 1, baseQty: 20 }, { id: 'b', productId: 1, baseQty: 3 }, { id: 'c', productId: 2, baseQty: 999 }]
  assert.equal(remainingSaleQuantity(rose, '枝', items), 2)
  assert.equal(remainingSaleQuantity(rose, '扎', items), 0.2)
  assert.equal(remainingSaleQuantity(rose, '扎', items, 'a'), 2.2)
})
test('缺货及小数精度不会产生负库存或可加整扎', () => {
  assert.equal(remainingSaleQuantity({ ...rose, totalStock: 0 }, '扎', []), 0)
  assert.equal(remainingSaleQuantity({ ...rose, totalStock: 0.3 }, '枝', [{ id: 'a', productId: 1, baseQty: 0.1 + 0.2 }]), 0)
  assert.equal(remainingSaleQuantity({ ...rose, totalStock: 9.999 }, '扎', []), 0.99)
})
test('非法换算不可作为销售单位', () => {
  assert.throws(() => getUnitFactor(rose, '箱'))
  assert.deepEqual(getSaleUnits({ ...rose, unitConversions: [{ fromUnit: '箱', toBaseQty: 0 }] }), [{ name: '枝', factor: 1 }])
})
test('多单位商品的成交金额按销售单位计算且逐行取分', () => {
  const result = computeOrder({ mode: 'retail', items: [{ basis: { defaultPrice: 1.89 }, qty: 2, toBaseQty: getUnitFactor(rose, '扎') }, { basis: { defaultPrice: 1.89 }, qty: 3, toBaseQty: 1 }] })
  assert.deepEqual(result.lineUnitPrices, [18.9, 1.89])
  assert.equal(result.total, 43.47)
})
test('折扣和满减使用同一份单位换算金额', () => {
  const items = [{ basis: { defaultPrice: 5 }, qty: 2, toBaseQty: 10 }]
  assert.equal(computeOrder({ items, mode: 'discount', discountRate: 85 }).total, 85)
  assert.equal(computeOrder({ items, mode: 'promotion', promotion: { threshold: 100, reduction: 15 } }).total, 85)
})
