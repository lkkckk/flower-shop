import { createHash } from 'node:crypto'
import { prisma } from './prisma'
import { requireStaff } from './auth'

export async function audit(tx: any, actor: number | null, action: string, type: string, id: any, details: any) {
  return tx.auditLog.create({ data: { operatorUserId: actor, action, entityType: type, entityId: String(id), details: JSON.parse(JSON.stringify(details)) } })
}

// A single-store transaction lock serializes financial/stock mutations, including retries.
// It is transaction scoped: failures, disconnects and rollbacks release it automatically.
export async function businessTransaction(event: any, action: string, body: any, run: (tx: any, actor: number, key: string) => Promise<any>) {
  const actor = requireStaff(event).sub
  const key = body?.idempotencyKey
  if (typeof key !== 'string' || key.length < 8 || key.length > 128) throw createError({ statusCode: 400, message: '请提供 8–128 字符的 idempotencyKey' })
  const id = `${actor}:${action}:${key}`
  const requestHash = createHash('sha256').update(JSON.stringify({ path: event.path?.split('?')[0] || null, body })).digest('hex')
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72410903)`
    const previous = await tx.operation.findUnique({ where: { id } })
    if (previous) {
      if (previous.requestHash !== requestHash) throw createError({ statusCode: 409, message: '该幂等键已用于不同请求' })
      return previous.result
    }
    const result = JSON.parse(JSON.stringify(await run(tx, actor, id)))
    await tx.operation.create({ data: { id, action, requestHash, result, operatorUserId: actor } })
    await audit(tx, actor, action, 'Operation', id, { result })
    return result
  }, { maxWait: 15000, timeout: 30000 })
}

export function businessHandler(action: string, run: (tx: any, actor: number, key: string, body: any, event: any) => Promise<any>) {
  return defineEventHandler(async event => {
    const body = await readBody(event)
    try {
      const data = await businessTransaction(event, action, body, (tx, actor, key) => run(tx, actor, key, body, event))
      return { data, error: null }
    } catch (error: any) {
      setResponseStatus(event, error.statusCode || 400)
      return { data: null, error: { message: error.message, code: error.code || 'BUSINESS_ERROR', shortages: error.shortages } }
    }
  })
}
