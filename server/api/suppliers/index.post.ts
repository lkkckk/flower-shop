import { businessHandler } from '../../utils/businessTransaction'
export default businessHandler('supplier.create', async (tx, actor, key, b) => {
 if (!String(b.name || '').trim()) throw new Error('供应商名称必填')
 return tx.supplier.create({ data: { name: b.name.trim(), phone: b.phone || null, address: b.address || null, notes: b.notes || null } })
})
