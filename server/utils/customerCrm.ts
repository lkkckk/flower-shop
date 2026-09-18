import { activeCustomer, accountEntry, pointEntry } from './accounts'
import { audit } from './businessTransaction'
import { money, decimal } from '../../shared/money'

export async function customerFamily(tx: any, id: number): Promise<number[]> {
  const ids = [id]
  for (let index = 0; index < ids.length; index++) {
    const children = await tx.customer.findMany({ where: { mergedIntoId: ids[index] }, select: { id: true } })
    for (const c of children) if (!ids.includes(c.id)) ids.push(c.id)
  }
  return ids
}
export async function mergeCustomers(tx: any, actor: number, key: string, fromId: number, body: any) {
  const targetId = Number(body.targetId)
  if (fromId === targetId || !String(body.reason || '').trim()) throw new Error('请选择不同的目标客户并填写合并原因')
  const source = await activeCustomer(tx, fromId)
  const target = await activeCustomer(tx, targetId)
  if (source.openid && target.openid && source.openid !== target.openid) throw new Error('两个客户已绑定不同微信账号，不能合并')
  for (const [account, field] of [['stored_value', 'storedValueBalance'], ['receivable', 'receivableBalance']] as const) {
    if (money(source[field]).isZero()) continue
    await accountEntry(tx, fromId, account, money(source[field]).neg(), 'merge_out', `${key}:${account}:from`, actor, { notes: `合并到客户 #${targetId}` })
    await accountEntry(tx, targetId, account, source[field], 'merge_in', `${key}:${account}:to`, actor, { notes: `合并自客户 #${fromId}` })
  }
  if (source.availablePoints) {
    await pointEntry(tx, fromId, -source.availablePoints, 'merge_out', `${key}:points:from`, actor)
    await pointEntry(tx, targetId, source.availablePoints, 'merge_in', `${key}:points:to`, actor)
  }
  await tx.order.updateMany({ where: { customerId: fromId }, data: { customerId: targetId } })
  for (const tag of await tx.customerTag.findMany({ where: { customerId: fromId } })) await tx.customerTag.upsert({ where: { customerId_name: { customerId: targetId, name: tag.name } }, create: { customerId: targetId, name: tag.name }, update: {} })
  await tx.customerEvent.updateMany({ where: { customerId: fromId }, data: { customerId: targetId } })
  await tx.customerContact.updateMany({ where: { customerId: fromId }, data: { customerId: targetId } })
  // Immutable historical payments/ledgers retain original ownership; family queries include them.
  await tx.customer.update({ where: { id: fromId }, data: { status: 'merged', mergedIntoId: targetId, phone: null, openid: null } })
  await tx.customer.update({ where: { id: targetId }, data: { phone: target.phone || source.phone, openid: target.openid || source.openid } })
  await audit(tx, actor, 'customer.merge', 'Customer', targetId, { source, target, reason: body.reason })
  return activeCustomer(tx, targetId)
}

export async function profileUpdate(tx: any, actor: number, id: number, body: any) {
  await activeCustomer(tx, id)
  const creditLimit = body.creditLimit === null || body.creditLimit === '' || body.creditLimit === undefined ? null : money(body.creditLimit)
  if (creditLimit?.lt(0)) throw new Error('信用额度不能为负数')
  const tags = [...new Set((body.tags || []).map((t: any) => String(t).trim()).filter(Boolean))] as string[]
  if (tags.length > 30 || tags.some(t => t.length > 30)) throw new Error('最多 30 个标签，每个标签不超过 30 字')
  await tx.customerTag.deleteMany({ where: { customerId: id } })
  await tx.customerTag.createMany({ data: tags.map(name => ({ customerId: id, name })) })
  const updated = await tx.customer.update({ where: { id }, data: { preferences: String(body.preferences || ''), creditLimit: creditLimit?.toFixed(2) ?? null } })
  await audit(tx, actor, 'customer.profile', 'Customer', id, { tags, preferences: updated.preferences, creditLimit: updated.creditLimit })
  return updated
}

export async function customerTimeline(tx: any, id: number, page: number, pageSize: number) {
  const ids = await customerFamily(tx, id)
  const limit = page * pageSize
  const orderWhere = { customerId: { in: ids } }
  const [orders, payments, accounts, points, contacts, adjustments] = await Promise.all([
    tx.order.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' }, take: limit }),
    tx.payment.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' }, take: limit }),
    tx.customerAccountEntry.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' }, take: limit }),
    tx.pointEntry.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' }, take: limit }),
    tx.customerContact.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' }, take: limit }),
    tx.orderAdjustment.findMany({ where: { order: orderWhere }, orderBy: { createdAt: 'desc' }, take: limit }),
  ])
  const count = await Promise.all([tx.order.count({ where: orderWhere }), tx.payment.count({ where: orderWhere }), tx.customerAccountEntry.count({ where: orderWhere }), tx.pointEntry.count({ where: orderWhere }), tx.customerContact.count({ where: orderWhere }), tx.orderAdjustment.count({ where: { order: orderWhere } })])
  const groups = [orders, payments, accounts, points, contacts, adjustments]
  const types = ['order', 'payment', 'account', 'points', 'contact', 'adjustment']
  const list = groups.flatMap((rows, index) => rows.map((row: any) => ({ ...row, eventType: types[index] }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id)
  return { list: list.slice((page - 1) * pageSize, limit), total: count.reduce((s, n) => s + n, 0), page, pageSize }
}
