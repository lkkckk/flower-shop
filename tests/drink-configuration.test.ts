import test from 'node:test'
import assert from 'node:assert/strict'
import { drinkCombinations, drinkSelectionKey, drinkVariantLabel } from '../shared/drinks'
import { normalizeDrinkConfiguration, drinkProductFields } from '../server/utils/drinkVariants'

function fixture() {
  const drinkGroups = [
    { id: 'temp', name: '温度', options: [{ id: 'cold', name: '冷' }, { id: 'hot', name: '热' }] },
    { id: 'size', name: '杯量', options: [{ id: 'small', name: '500ml' }, { id: 'large', name: '900ml' }] },
  ]
  return { drinkGroups, drinkVariants: drinkCombinations(drinkGroups).map((options, i) => ({ id: `v${i}`, options, price: String(12 + i), enabled: true })) }
}
test('two independent groups form four stable combinations and canonical two-decimal prices', () => {
  const data = fixture(), config = normalizeDrinkConfiguration(data)
  assert.equal(config.variants.length, 4)
  assert.deepEqual(config.variants.map(v => v.price), ['12.00', '13.00', '14.00', '15.00'])
  assert.equal(drinkSelectionKey(data.drinkVariants[0].options), drinkSelectionKey([...data.drinkVariants[0].options].reverse()))
  assert.equal(drinkVariantLabel(config.groups, config.variants[0].options), '冷 / 500ml')
  assert.deepEqual(drinkProductFields(config), { baseUnit: '杯', defaultPrice: '12.00', memberPrice: null, vipPrice: null, wholesalePrice: null, grade: null, color: null, specification: null, shelfLifeDays: 0, attributes: null })
})
test('configuration rejects malformed, duplicate, forged, missing combinations and invalid prices', () => {
  for (const change of [
    (x: any) => x.drinkVariants.pop(),
    (x: any) => x.drinkVariants[1] = x.drinkVariants[0],
    (x: any) => x.drinkVariants[0].options[0].optionId = 'forged',
    (x: any) => x.drinkGroups[0].options[1].name = '冷',
    (x: any) => x.drinkVariants[0].price = '',
    (x: any) => x.drinkVariants[0].price = '1.001',
    (x: any) => x.drinkVariants[0].price = '-1',
    (x: any) => x.drinkVariants[0].enabled = 'false',
  ]) { const data = fixture(); change(data); assert.throws(() => normalizeDrinkConfiguration(data)) }
})
test('disabled new combination can remain unpriced, bulk equal prices preserved', () => {
  const data = fixture()
  data.drinkVariants.forEach(v => v.price = '20')
  data.drinkVariants[0].enabled = false; data.drinkVariants[0].price = ''
  assert.deepEqual(normalizeDrinkConfiguration(data).variants.map(v => v.price), [null, '20.00', '20.00', '20.00'])
})
