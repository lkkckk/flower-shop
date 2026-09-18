import { parseCsv } from '../../shared/csv'
import { money, positive } from '../../shared/money'

export const csvTemplates: Record<string, string[]> = {
  customers: ['name', 'phone', 'address', 'level', 'notes'],
  products: ['name', 'baseUnit', 'defaultPrice', 'memberPrice', 'vipPrice', 'wholesalePrice', 'shelfLifeDays'],
  stocks: ['productId', 'inboundQty', 'costPrice', 'inboundDate', 'expiryDate', 'notes'],
}
export async function validateImport(tx: any, kind: string, csv: string, actor: number) {
  if (!csvTemplates[kind] || typeof csv !== 'string' || Buffer.byteLength(csv) > 5 * 1024 * 1024) throw new Error('仅支持客户、商品、库存 CSV，文件上限 5MB')
  const rows = parseCsv(csv)
  if (!rows.length || rows.length > 5000) throw new Error('每次导入需要 1–5000 行')
  const errors: any[] = [], phones = new Set<string>()
  for (const [i, row] of rows.entries()) {
    try {
      if (kind === 'customers') {
        if (!row.name) throw new Error('姓名不能为空')
        if (!['normal', 'member', 'vip', 'wholesale'].includes(row.level || 'normal')) throw new Error('等级不合法')
        if (row.phone && (phones.has(row.phone) || await tx.customer.findUnique({ where: { phone: row.phone } }))) throw new Error('手机号重复')
        if (row.phone) phones.add(row.phone)
      } else if (kind === 'products') {
        if (!row.name || !row.baseUnit) throw new Error('商品名称、基础单位必填')
        for (const f of ['defaultPrice', 'memberPrice', 'vipPrice', 'wholesalePrice']) if ((f === 'defaultPrice' || row[f]) && money(row[f]).lt(0)) throw new Error('价格不能为负数')
        if (row.shelfLifeDays && (!Number.isInteger(Number(row.shelfLifeDays)) || Number(row.shelfLifeDays) < 1)) throw new Error('保质期必须为正整数')
      } else {
        if (!await tx.product.findUnique({ where: { id: Number(row.productId) } })) throw new Error('商品 ID 不存在')
        positive(row.inboundQty, 3)
        if (money(row.costPrice).lt(0)) throw new Error('成本不能为负数')
        if (!Number.isFinite(new Date(row.inboundDate).getTime()) || !Number.isFinite(new Date(row.expiryDate).getTime()) || new Date(row.expiryDate) <= new Date(row.inboundDate)) throw new Error('入库或到期日期不合法')
      }
    } catch (e: any) { errors.push({ row: i + 2, message: e.message }) }
  }
  return tx.importJob.create({ data: { kind, rows, errors, status: errors.length ? 'invalid' : 'validated', operatorUserId: actor } })
}
export async function commitImport(tx: any, id: number, actor: number, key: string) {
  const job = await tx.importJob.findUnique({ where: { id } })
  if (!job || job.status !== 'validated') throw new Error('导入任务不存在、有错误或已执行')
  for (const [index, row] of (job.rows as any[]).entries()) {
    if (job.kind === 'customers') await tx.customer.create({ data: { name: row.name, phone: row.phone || null, address: row.address || null, level: row.level || 'normal', notes: row.notes || null } })
    else if (job.kind === 'products') await tx.product.create({ data: { name: row.name, baseUnit: row.baseUnit, defaultPrice: money(row.defaultPrice).toFixed(2), memberPrice: row.memberPrice ? money(row.memberPrice).toFixed(2) : null, vipPrice: row.vipPrice ? money(row.vipPrice).toFixed(2) : null, wholesalePrice: row.wholesalePrice ? money(row.wholesalePrice).toFixed(2) : null, shelfLifeDays: Number(row.shelfLifeDays || 7) } })
    else {
      const b = await tx.stockBatch.create({ data: { productId: Number(row.productId), batchNo: `IMPORT-${id}-${index}`, inboundQty: positive(row.inboundQty, 3).toFixed(3), currentQty: positive(row.inboundQty, 3).toFixed(3), costPrice: money(row.costPrice).toFixed(2), inboundDate: new Date(row.inboundDate), expiryDate: new Date(row.expiryDate), notes: row.notes } })
      await tx.stockMovement.create({ data: { batchId: b.id, type: 'import', qtyChange: b.inboundQty, sourceKey: `${key}:${index}`, operatorUserId: actor, operator: String(actor), notes: `CSV 导入 #${id}` } })
    }
  }
  return tx.importJob.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } })
}
