import test from 'node:test'
import assert from 'node:assert/strict'
import { computeOrder, pickBasePrice } from '../shared/priceMode'

test('饮品组合价格不随等级和等级价格模式改变', () => {
  for (const level of ['normal', 'member', 'vip', 'wholesale']) {
    const basis = { productType: 'drink', defaultPrice: 18, memberPrice: 15, vipPrice: 12, wholesalePrice: 9, level }
    for (const mode of ['retail', 'member', 'vip', 'wholesale'] as const) assert.equal(pickBasePrice(basis, mode), 18)
  }
})

test('饮品与普通商品混合时保留等级价、折扣和整单满减', () => {
  const items = [
    { basis: { productType: 'drink', defaultPrice: 18, memberPrice: 12, level: 'member' }, qty: 2, toBaseQty: 1 },
    { basis: { defaultPrice: 10, memberPrice: 8, level: 'member' }, qty: 3, toBaseQty: 1 },
  ]
  assert.deepEqual(computeOrder({ items, mode: 'retail' }).lineUnitPrices, [18, 8])
  assert.equal(computeOrder({ items, mode: 'discount', discountRate: 90 }).total, 54)
  assert.equal(computeOrder({ items, mode: 'promotion', promotion: { threshold: 60, reduction: 5 } }).total, 55)
})
