import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function registrationEnvironment() {
  const local = parseEnv(await readFile('.env', 'utf8'))
  const url = new URL(local.DATABASE_URL)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), '验收仅允许本地 PostgreSQL')
  const schema = `registration_acceptance_${Date.now()}_${randomUUID().replaceAll('-', '').slice(0, 16)}`
  url.searchParams.set('schema', schema)
  const imageRoot = await mkdtemp(path.join(tmpdir(), 'flower-registration-test-'))
  const env = { ...process.env, DATABASE_URL: url.toString(), JWT_SECRET: randomUUID(), NOTIFICATION_TICK_DISABLED: '1',
    PRODUCT_IMAGE_DIR: path.join(imageRoot, 'products'), PREORDER_IMAGE_DIR: path.join(imageRoot, 'preorders'), TZ: 'Asia/Shanghai' }
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  let server
  let disposed = false
  async function dispose() {
    if (disposed) return
    disposed = true
    if (server && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill() })
    assert.match(schema, /^registration_acceptance_\d+_[a-f0-9]{16}$/)
    try { await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`) }
    finally {
      await prisma.$disconnect()
      assert.equal(path.dirname(path.resolve(imageRoot)), path.resolve(tmpdir()))
      assert.ok(path.basename(imageRoot).startsWith('flower-registration-test-'))
      await rm(imageRoot, { recursive: true, force: true })
    }
  }
  try {
    const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8' })
    if (migration.status !== 0) throw new Error('隔离数据库迁移失败：' + migration.stdout + migration.stderr)
    const password = 'AcceptanceOnly2026!'
    const passwordHash = await bcrypt.hash(password, 10)
    const users = {}
    for (const role of ['admin', 'cashier', 'staff']) users[role] = await prisma.user.create({ data: { username: role, name: `验收${role}`, role, passwordHash } })
    await prisma.setting.create({ data: { key: 'storeName', value: '预售打印验收花店' } })
    const socket = createServer()
    await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
    const port = socket.address().port
    await new Promise(resolve => socket.close(resolve))
    const origin = `http://127.0.0.1:${port}`
    let logs = ''
    server = spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    server.stdout.on('data', data => { logs = (logs + data).slice(-8000) })
    server.stderr.on('data', data => { logs = (logs + data).slice(-8000) })
    for (let i = 0; ; i++) {
      if (server.exitCode !== null || i === 80) throw new Error(`隔离服务启动失败：${logs}`)
      try { if ((await fetch(origin + '/api/health')).ok) break } catch {}
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    return { prisma, origin, users, password, imageRoot, dispose }
  } catch (error) { await dispose(); throw error }
}
