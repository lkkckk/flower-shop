import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

test('预售及免交班真实接口验收（独立数据库、图片与服务）', { skip: process.env.MVP_DATABASE_TEST !== '1' }, () => {
  const result = spawnSync(process.execPath, ['tests/cleanup-and-noshift-acceptance.mjs'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stdout + result.stderr)
})
