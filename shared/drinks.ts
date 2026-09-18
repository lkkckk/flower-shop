export interface DrinkSelection { groupId: string; optionId: string }
export interface DrinkGroup { id: string; name: string; sort?: number; options: { id: string; name: string; sort?: number }[] }
export function drinkSelectionKey(options: DrinkSelection[]) {
  return [...options].sort((a, b) => a.groupId.localeCompare(b.groupId)).map(o => `${o.groupId}:${o.optionId}`).join('|')
}
export function drinkVariantLabel(groups: DrinkGroup[], options: DrinkSelection[]) {
  return groups.map(g => g.options.find(o => options.some(s => s.groupId === g.id && s.optionId === o.id))?.name).filter(Boolean).join(' / ')
}
export function drinkCombinations(groups: DrinkGroup[]): DrinkSelection[][] {
  return groups.reduce<DrinkSelection[][]>((rows, group) => rows.flatMap(row => group.options.map(option => [...row, { groupId: group.id, optionId: option.id } ])), [[]])
}
