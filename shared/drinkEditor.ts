import { drinkSelectionKey } from './drinks'
export interface DrinkEditorGroup { id: string; name: string; sort?: number; options: { id: string; name: string; sort?: number }[] }
export interface DrinkEditorVariant { id: string; selectionKey: string; options: { groupId: string; optionId: string }[]; label: string; price: string | null; enabled: boolean }

export function rebuildDrinkVariants(groups: DrinkEditorGroup[], previous: DrinkEditorVariant[], newId: () => string): DrinkEditorVariant[] {
  if (!groups.length || groups.some(g => !g.options.length)) return []
  if (groups.reduce((n, g) => n * g.options.length, 1) > 200) throw new Error('规格组合最多支持 200 种，请减少选项')
  let combinations: { options: DrinkEditorVariant['options']; names: string[] }[] = [{ options: [], names: [] }]
  for (const group of groups) combinations = combinations.flatMap(c => group.options.map(o => ({ options: [...c.options, { groupId: group.id, optionId: o.id }], names: [...c.names, o.name] })))
  return combinations.map(c => {
    const selectionKey = drinkSelectionKey(c.options)
    const old = previous.find(v => v.selectionKey === selectionKey)
    return { id: old?.id || newId(), selectionKey, options: c.options, label: c.names.join(' / '), price: old?.price ?? null, enabled: old?.enabled ?? true }
  })
}
