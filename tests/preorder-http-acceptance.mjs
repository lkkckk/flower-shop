import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const origin = 'http://localhost:3000'
let adminToken = ''
let cashierToken = ''

async function call(path, token, method = 'GET', body = null) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(origin + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, ok: res.ok, data: json?.data, error: json?.error, raw: json }
}

async function run() {
  console.log('1. 登录验证...')
  const adminLogin = await call('/api/auth/login', '', 'POST', { username: 'admin', password: 'admin123' })
  assert.equal(adminLogin.status, 200)
  adminToken = adminLogin.data.token

  const cashierLogin = await call('/api/auth/login', '', 'POST', { username: 'cashier', password: 'cashier123' })
  assert.equal(cashierLogin.status, 200)
  cashierToken = cashierLogin.data.token

  console.log('2. 上传测试照片（Bearer token、Cookie 鉴权、jfif 与自动格式推导）...')
  // 测试 2.1: Bearer token 正常 PNG
  const form = new FormData()
  const pngBlob = new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' })
  form.append('file', pngBlob, 'test.png')

  const uploadRes = await fetch(origin + '/api/preorder-registrations/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: form,
  })
  const uploadJson = await uploadRes.json()
  assert.equal(uploadRes.status, 200)
  const imageUrl = uploadJson.data.imageUrl
  assert.ok(imageUrl.startsWith('/preorder-images/'))

  // 测试 2.2: Cookie 模式上传（纯 Cookie 无 Authorization 头）
  const formCookie = new FormData()
  formCookie.append('file', pngBlob, 'cookie_test.png')
  const cookieRes = await fetch(origin + '/api/preorder-registrations/images', {
    method: 'POST',
    headers: { Cookie: `auth_token=${cashierToken}` },
    body: formCookie,
  })
  assert.equal(cookieRes.status, 200)

  // 测试 2.3: jfif 格式自动转换为 jpg
  const formJfif = new FormData()
  const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb])
  formJfif.append('file', new Blob([jpgBuffer], { type: 'image/jpeg' }), 'photo.jfif')
  const jfifRes = await fetch(origin + '/api/preorder-registrations/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: formJfif,
  })
  assert.equal(jfifRes.status, 200)
  const jfifJson = await jfifRes.json()
  assert.ok(jfifJson.data.imageUrl.endsWith('.jpg'))

  // 测试 2.4: 无扩展名文件基于 magic bytes 自动推导
  const formNoExt = new FormData()
  formNoExt.append('file', new Blob([jpgBuffer]), 'blob')
  const noExtRes = await fetch(origin + '/api/preorder-registrations/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: formNoExt,
  })
  assert.equal(noExtRes.status, 200)

  console.log('3. 收银员（cashier）自由登记创建...')
  const testOrderNo = `E2E-TEST-${Date.now()}`
  const idempKey1 = `e2e-idemp-${randomUUID()}`
  const payload1 = {
    orderNo: testOrderNo,
    contactPhone: '13912345678',
    deliveryTime: '2026-09-20 10:30:00',
    notes: '端到端测试：请在中午前送达',
    cardMessage: '开业大吉，财源广进！',
    idempotencyKey: idempKey1,
    items: [
      {
        name: '开业花篮A款',
        qty: '2.000',
        photos: [{ url: imageUrl, sort: 0 }],
      },
      {
        name: '大麦干花配束',
        qty: '1.5',
        photos: [],
      },
    ],
  }

  const create1 = await call('/api/preorder-registrations', cashierToken, 'POST', payload1)
  assert.equal(create1.status, 200, `创建失败: ${JSON.stringify(create1)}`)
  const reg1 = create1.data
  assert.ok(reg1.id > 0)
  assert.equal(reg1.orderNo, testOrderNo)
  assert.equal(reg1.version, 1)

  console.log('4. 相同订单编号创建另一条登记（允许重名）...')
  const idempKey2 = `e2e-idemp-${randomUUID()}`
  const payload2 = {
    ...payload1,
    idempotencyKey: idempKey2,
    notes: '同一编号的第二条登记单',
  }
  const create2 = await call('/api/preorder-registrations', cashierToken, 'POST', payload2)
  assert.equal(create2.status, 200)
  const reg2 = create2.data
  assert.notEqual(reg1.id, reg2.id)
  assert.equal(reg1.orderNo, reg2.orderNo)

  console.log('5. 幂等性测试（相同 idempotencyKey 重复提交）...')
  const repeatCreate = await call('/api/preorder-registrations', cashierToken, 'POST', payload1)
  assert.equal(repeatCreate.status, 200)
  assert.equal(repeatCreate.data.id, reg1.id)

  console.log('6. 单条详情与列表查询...')
  const detail = await call(`/api/preorder-registrations/${reg1.id}`, cashierToken)
  assert.equal(detail.status, 200)
  assert.equal(detail.data.orderNo, testOrderNo)
  assert.equal(detail.data.items.length, 2)

  const list = await call(`/api/preorder-registrations?q=${encodeURIComponent(testOrderNo)}`, cashierToken)
  assert.equal(list.status, 200)
  assert.equal(list.data.list.length, 2)

  console.log('7. 修改登记与并发版本号冲突拦截...')
  const updatePayload = {
    orderNo: testOrderNo,
    contactPhone: '13988887777',
    deliveryTime: '2026-09-20 11:00:00',
    notes: '时间推迟半小时',
    cardMessage: '贺卡改：大吉大利！',
    version: 1, // 当前版本
    idempotencyKey: `e2e-update-${randomUUID()}`,
    items: [
      {
        name: '开业花篮豪华款',
        qty: '3.000',
        photos: [{ url: imageUrl, sort: 0 }],
      },
    ],
  }
  const updateRes = await call(`/api/preorder-registrations/${reg1.id}`, cashierToken, 'PUT', updatePayload)
  assert.equal(updateRes.status, 200)
  assert.equal(updateRes.data.version, 2)

  // 并发冲突：仍使用旧版本 1 提交
  const conflictPayload = {
    ...updatePayload,
    version: 1,
    idempotencyKey: `e2e-conflict-${randomUUID()}`,
  }
  const conflictRes = await call(`/api/preorder-registrations/${reg1.id}`, cashierToken, 'PUT', conflictPayload)
  assert.equal(conflictRes.status, 409, '必须拦截并发旧版本号修改')

  console.log('8. 权限隔离：收银员不能将登记移入回收站...')
  const cashierTrash = await call(`/api/preorder-registrations/${reg1.id}/trash`, cashierToken, 'POST')
  assert.equal(cashierTrash.status, 403, '非管理员必须被 403 拒绝')

  console.log('9. 管理员移入回收站与恢复...')
  const adminTrash = await call(`/api/preorder-registrations/${reg1.id}/trash`, adminToken, 'POST')
  assert.equal(adminTrash.status, 200)
  assert.equal(adminTrash.data.success, true)

  // 普通列表不再显示已删除项
  const listAfterTrash = await call(`/api/preorder-registrations?q=${encodeURIComponent(testOrderNo)}`, cashierToken)
  assert.ok(!listAfterTrash.data.list.some(r => r.id === reg1.id))

  // 管理员回收站可见
  const trashList = await call(`/api/preorder-registrations?trashed=true&q=${encodeURIComponent(testOrderNo)}`, adminToken)
  assert.ok(trashList.data.list.some(r => r.id === reg1.id))

  // 管理员恢复
  const adminRestore = await call(`/api/preorder-registrations/${reg1.id}/restore`, adminToken, 'POST')
  assert.equal(adminRestore.status, 200)

  // 恢复后正常列表重新出现
  const listAfterRestore = await call(`/api/preorder-registrations?q=${encodeURIComponent(testOrderNo)}`, cashierToken)
  assert.ok(listAfterRestore.data.list.some(r => r.id === reg1.id))

  console.log('10. 首页即将履约新登记查询...')
  const upcoming = await call('/api/preorder-registrations/upcoming?days=7', cashierToken)
  assert.equal(upcoming.status, 200)
  assert.ok(Array.isArray(upcoming.data))

  console.log('11. 前端页面路由 HTTP 渲染可达性检查...')
  for (const pagePath of [
    '/preorders',
    '/preorders/new',
    `/preorders/registrations/${reg1.id}`,
    `/preorders/registrations/${reg1.id}/delivery-slip`,
  ]) {
    const pageRes = await fetch(origin + pagePath, {
      headers: { Cookie: `auth_token=${adminToken}` },
    })
    assert.equal(pageRes.status, 200, `${pagePath} 返回码不是 200: ${pageRes.status}`)
    const html = await pageRes.text()
    assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<html'), `${pagePath} 未返回合法 HTML`)
  }

  console.log('✅ 所有端到端 HTTP API 与页面渲染测试全部成功通过！')
}

run().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
