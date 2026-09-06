import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'
import { productImagePath, storeProductImage } from '../server/utils/productImages'
import imageRoute from '../server/routes/products/[filename].get'

test('运行时上传、历史图片、缓存换名、失败回滚及缺失图片', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flower-images-'))
  const previous = process.env.PRODUCT_IMAGE_DIR
  process.env.PRODUCT_IMAGE_DIR = directory
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
  let persistedUrl = ''
  // Exercise the actual upload handler against a scoped database substitute.
  Object.assign(globalThis, { defineEventHandler, prisma: { product: {
    findUnique: async () => ({ id: 2, imageUrl: persistedUrl }),
    update: async ({ data }: any) => { persistedUrl = data.imageUrl; return data },
  } } })
  const upload = (await import('../server/api/products/[id]/image.post')).default
  const app = createApp().use(createRouter()
    .post('/api/products/:id/image', upload)
    .get('/products/:filename', imageRoute))
  const server = createServer(toNodeListener(app))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as any).port}`
  try {
    await writeFile(path.join(directory, '2.png'), image)
    const send = async () => {
      const form = new FormData()
      form.append('file', new Blob([image], { type: 'image/png' }), 'flower.png')
      const response = await fetch(`${origin}/api/products/2/image`, { method: 'POST', body: form })
      const result: any = await response.json()
      assert.equal(result.error, null)
      return result.data.imageUrl as string
    }
    const first = await send()
    const second = await send()
    assert.notEqual(first, second)
    assert.equal(persistedUrl, second)
    for (const url of ['/products/2.png', first, second]) {
      const response = await fetch(origin + url)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'image/png')
      assert.match(response.headers.get('cache-control')!, /must-revalidate/)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), image)
    }
    const before = await readdir(directory)
    await assert.rejects(storeProductImage(2, '.png', image, async () => { throw new Error('database unavailable') }))
    assert.deepEqual(await readdir(directory), before)
    assert.deepEqual(await readFile(path.join(directory, '2.png')), image)
    assert.equal((await fetch(origin + '/products/999.png')).status, 404)
    assert.equal(productImagePath('../.env'), null)
    assert.equal(productImagePath('2.svg'), null)
    console.log('PASS: actual upload handler + HTTP image bytes; database substitute only')
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (previous === undefined) delete process.env.PRODUCT_IMAGE_DIR
    else process.env.PRODUCT_IMAGE_DIR = previous
    await rm(directory, { recursive: true, force: true })
  }
})
