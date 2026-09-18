import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { drinkCombinations, drinkSelectionKey, drinkVariantLabel, type DrinkGroup } from '../../shared/drinks'

export const drinkProductInclude = {
  drinkGroups: { where: { active: true }, orderBy: { sort: 'asc' as const }, include: { options: { where: { active: true }, orderBy: { sort: 'asc' as const } } } },
  drinkVariants: true,
}
export function drinkProductFields(config: ReturnType<typeof normalizeDrinkConfiguration>) {
  const prices = config.variants.filter(v => v.enabled && v.price !== null).map(v => Number(v.price))
  return { baseUnit: '杯', defaultPrice: prices.length ? Math.min(...prices).toFixed(2) : '0.00', memberPrice: null, vipPrice: null, wholesalePrice: null, grade: null, color: null, specification: null, shelfLifeDays: 0, attributes: null }
}
function invalid(message: string): never { throw Object.assign(new Error(message), { code: 'INVALID_DRINK', statusCode: 400 }) }
function stableId(value: unknown) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) invalid('规格标识无效'); return value }
export function normalizeDrinkConfiguration(body: any) {
  if (!Array.isArray(body.drinkGroups) || !body.drinkGroups.length || body.drinkGroups.length > 6) invalid('请设置 1 至 6 个规格组')
  const ids = new Set<string>()
  const groupNames = new Set<string>()
  const groups: DrinkGroup[] = body.drinkGroups.map((g: any, sort: number) => {
    const id = stableId(g.id), name = String(g.name || '').trim()
    if (ids.has(id) || !name || name.length > 40 || groupNames.has(name)) invalid('规格组名称或标识重复、为空或过长')
    ids.add(id); groupNames.add(name)
    if (!Array.isArray(g.options) || !g.options.length || g.options.length > 30) invalid('每组需要 1 至 30 个选项')
    const names = new Set<string>()
    return { id, name, sort, options: g.options.map((o: any, index: number) => {
      const oid = stableId(o.id), oname = String(o.name || '').trim()
      if (ids.has(oid) || !oname || oname.length > 40 || names.has(oname)) invalid('选项名称或标识重复、为空或过长')
      ids.add(oid); names.add(oname)
      return { id: oid, name: oname, sort: index }
    }) }
  })
  if (groups.reduce((n, g) => n * g.options.length, 1) > 200) invalid('规格组合最多 200 个')
  const combinations = drinkCombinations(groups)
  if (!Array.isArray(body.drinkVariants) || body.drinkVariants.length !== combinations.length) invalid('请填写全部规格组合')
  const allowed = new Set(combinations.map(drinkSelectionKey)), seen = new Set<string>(), variantIds = new Set<string>()
  const variants = body.drinkVariants.map((v: any) => {
    if (!Array.isArray(v.options) || v.options.length !== groups.length) invalid('组合选项无效')
    const options = v.options.map((o: any) => ({ groupId: stableId(o.groupId), optionId: stableId(o.optionId) }))
    const selectionKey = drinkSelectionKey(options)
    if (!allowed.has(selectionKey) || seen.has(selectionKey)) invalid('组合重复或不属于当前规格')
    seen.add(selectionKey)
    const id = v.id ? stableId(v.id) : randomUUID()
    if (variantIds.has(id)) invalid('组合标识重复')
    variantIds.add(id)
    if (typeof v.enabled !== 'boolean') invalid('请设置组合启用状态')
    let price: string | null = null
    if (v.price !== null && v.price !== undefined && v.price !== '') {
      const raw = String(v.price)
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) invalid('组合售价必须大于零，且最多两位小数')
      price = Number(raw).toFixed(2)
    }
    if (v.enabled && price === null) invalid('启用组合必须填写售价')
    return { id, selectionKey, options, price, enabled: v.enabled }
  })
  return { groups, variants }
}
export function serializeDrinkProduct<T extends Record<string, any>>(product: T): T {
  if (!product || product.productType !== 'drink') return product
  const groups = product.drinkGroups || []
  const keys = new Set(drinkCombinations(groups).map(drinkSelectionKey))
  return { ...product, drinkVariants: (product.drinkVariants || []).filter((v: any) => keys.has(v.selectionKey)).map((v: any) => ({ ...v, price: v.price == null ? null : v.price.toFixed(2), label: drinkVariantLabel(groups, v.options) })) }
}
export async function saveDrinkConfiguration(tx: Prisma.TransactionClient, productId: number, config: ReturnType<typeof normalizeDrinkConfiguration>) {
  const oldGroups = await tx.drinkOptionGroup.findMany({ where: { id: { in: config.groups.map(g => g.id) } } })
  if (oldGroups.some(g => g.productId !== productId)) invalid('规格组属于其他商品')
  const incomingOptions = config.groups.flatMap(g => g.options.map(o => ({ ...o, groupId: g.id })))
  const oldOptions = await tx.drinkOption.findMany({ where: { id: { in: incomingOptions.map(o => o.id) } } })
  if (oldOptions.some(o => incomingOptions.find(i => i.id === o.id)?.groupId !== o.groupId)) invalid('不能将已有选项移至其他规格组')
  const oldVariants = await tx.drinkVariant.findMany({ where: { OR: [{ productId }, { id: { in: config.variants.map(v => v.id) } }] } })
  if (oldVariants.some(v => config.variants.some(i => i.id === v.id && (v.productId !== productId || i.selectionKey !== v.selectionKey)))) invalid('组合标识不能重新绑定')
  await tx.drinkOptionGroup.updateMany({ where: { productId }, data: { active: false } })
  await tx.drinkOption.updateMany({ where: { group: { productId } }, data: { active: false } })
  await tx.drinkVariant.updateMany({ where: { productId }, data: { enabled: false } })
  for (const g of config.groups) {
    const data = { name: g.name, sort: g.sort, active: true }
    await tx.drinkOptionGroup.upsert({ where: { id: g.id }, create: { id: g.id, productId, ...data }, update: data })
    for (const o of g.options) {
      const data = { name: o.name, sort: o.sort, active: true }
      await tx.drinkOption.upsert({ where: { id: o.id }, create: { id: o.id, groupId: g.id, ...data }, update: data })
    }
  }
  for (const v of config.variants) {
    const old = oldVariants.find(o => o.productId === productId && o.selectionKey === v.selectionKey)
    await tx.drinkVariant.upsert({ where: { productId_selectionKey: { productId, selectionKey: v.selectionKey } }, create: { ...v, id: old?.id || v.id, productId }, update: { price: v.price, enabled: v.enabled, options: v.options } })
  }
}
