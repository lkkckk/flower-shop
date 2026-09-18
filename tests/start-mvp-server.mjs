import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'
Object.assign(process.env, parseEnv(readFileSync('.cache/pos-test.env', 'utf8')))
assert.match(new URL(process.env.DATABASE_URL).searchParams.get('schema'), /^pos_acceptance_\d+$/)
process.env.PORT='3010';process.env.HOST='127.0.0.1'
await import('../.output/server/index.mjs')
