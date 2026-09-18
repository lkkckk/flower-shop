import test from 'node:test'
import assert from 'node:assert/strict'
import { rebuildDrinkVariants } from '../shared/drinkEditor'

test('规格改名和排序保留组合身份及价格，新增组合待定价', () => {
  const groups = [{ id: 'temperature', name: '温度', options: [{ id: 'cold', name: '冷' }, { id: 'hot', name: '热' }] }, { id: 'size', name: '杯量', options: [{ id: 'small', name: '500ml' }, { id: 'large', name: '900ml' }] }]
  let serial = 0
  const rows = rebuildDrinkVariants(groups, [], () => `v${++serial}`)
  assert.equal(rows.length, 4)
  rows[0].price = '12.00'
  const id = rows[0].id
  groups[0].options[0].name = '冰'
  const moved = rebuildDrinkVariants([...groups].reverse(), rows, () => `v${++serial}`)
  assert.equal(moved.find(r => r.id === id)?.price, '12.00')
  assert.match(moved.find(r => r.id === id)!.label, /冰/)
  groups[1].options.push({ id: 'medium', name: '700ml' })
  const expanded = rebuildDrinkVariants(groups, rows, () => `v${++serial}`)
  assert.equal(expanded.length, 6)
  assert.equal(expanded.filter(r => r.price === null).length, 5)
})

test('不完整规格不生成可销售组合，组合数量限制避免页面失控', () => {
  assert.deepEqual(rebuildDrinkVariants([], [], () => 'id'), [])
  assert.deepEqual(rebuildDrinkVariants([{ id: 'g', name: '温度', options: [] }], [], () => 'id'), [])
  const groups = Array.from({length: 3}, (_, g) => ({id: `g${g}`, name: '规格', options: Array.from({length: 10}, (_, o) => ({id: `${g}-${o}`, name: '选项'}))}))
  assert.throws(() => rebuildDrinkVariants(groups, [], () => 'id'), /组合/)
})
