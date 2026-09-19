import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRegistrationAmount, sumRegistrationAmounts, formatRegistrationAmount } from '../shared/preorderMoney'
import { validateRegistrationAmount, serializeRegistration } from '../server/utils/preorderRegistrationAmounts'
import { Decimal } from '../shared/money'

test('registration money validates exact decimal input without silently rounding', () => {
  for (const value of [-1, 'abc', NaN, Infinity, null, undefined, '', true, '1e2', '1.001', '10000000000']) {
    assert.throws(() => parseRegistrationAmount(value), String(value))
  }
  assert.equal(parseRegistrationAmount(0), '0.00')
  assert.equal(parseRegistrationAmount('268'), '268.00')
  assert.equal(parseRegistrationAmount('9999999999.99'), '9999999999.99')
})

test('registration total sums line amounts once, independent of quantity and photo count', () => {
  const items = [{ amount: '268', qty: 1, photos: ['a', 'b'] }, { amount: '128.50', qty: 2, photos: [] }]
  assert.equal(sumRegistrationAmounts(items), '396.50')
  assert.equal(sumRegistrationAmounts([{ amount: '0.1' }, { amount: '0.2' }]), '0.30')
  assert.equal(sumRegistrationAmounts([{ amount: '9999999999.99' }, { amount: '0.01' }]), '10000000000.00')
})

test('historical missing amounts remain unknown, not zero or a partial total', () => {
  assert.equal(sumRegistrationAmounts([{ amount: '268' }, { amount: null }]), null)
  assert.equal(sumRegistrationAmounts([{}]), null)
  assert.equal(formatRegistrationAmount(null), '未填写')
  assert.equal(formatRegistrationAmount(undefined), '未填写')
  assert.equal(formatRegistrationAmount('0'), '¥0.00')
  assert.equal(formatRegistrationAmount('396.5'), '¥396.50')
})

test('API validation identifies the line with a 400 error and serialization preserves two decimals', () => {
  assert.throws(() => validateRegistrationAmount('-1', 1), (error: any) => error.statusCode === 400 && error.message.includes('第 2 项商品'))
  assert.deepEqual(serializeRegistration({ items: [{ amount: new Decimal('128.50') }, { amount: null }] }).items,
    [{ amount: '128.50' }, { amount: null }])
})
