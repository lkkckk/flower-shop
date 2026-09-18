import { decimal } from './money'
export function activeSpecial(batch: any, now = new Date()) {
  return batch.status === 'discounted' && batch.specialPrice != null && batch.specialUntil && new Date(batch.specialUntil) > now && decimal(batch.specialQty ?? 0).gt(0)
}
export function normalBatchQuantity(batch: any, now = new Date()) {
  if (!['in_stock', 'discounted'].includes(batch.status)) return decimal(0)
  return decimal(batch.currentQty).minus(activeSpecial(batch, now) ? batch.specialQty : 0).clamp(0, batch.currentQty)
}
