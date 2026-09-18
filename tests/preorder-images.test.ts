import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { snapshotPreorderImage, preorderImagePath, storePreorderImage } from '../server/utils/preorderImages'
import { resolveShopName } from '../shared/shopIdentity'

test('订单照片复制后不随商品图覆盖，明确移除不回填，拒绝非法图片', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preorder-images-'))
  const oldProduct = process.env.PRODUCT_IMAGE_DIR
  const oldPreorder = process.env.PREORDER_IMAGE_DIR
  process.env.PRODUCT_IMAGE_DIR = directory
  process.env.PREORDER_IMAGE_DIR = path.join(directory, 'orders')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
  try {
    await writeFile(path.join(directory, '1.png'), png)
    const snapshot = await snapshotPreorderImage('/products/1.png')
    await writeFile(path.join(directory, '1.png'), 'replaced catalogue image')
    assert.deepEqual(await readFile(preorderImagePath(snapshot!.split('/').pop()!)!), png)
    assert.equal(await snapshotPreorderImage(snapshot), snapshot)
    assert.equal(await snapshotPreorderImage(null), null)
    assert.equal(await snapshotPreorderImage(''), null)
    assert.notEqual(await storePreorderImage('.png', png), snapshot)
    // 支持 .jfif 自动标准化为 .jpg
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    const jfifUrl = await storePreorderImage('.jfif', jpg)
    assert.ok(jfifUrl.endsWith('.jpg'))
    assert.deepEqual(await readFile(preorderImagePath(jfifUrl.split('/').pop()!)!), jpg)
    await assert.rejects(storePreorderImage('.png', Buffer.from('not a picture')))
    await assert.rejects(storePreorderImage('.svg', png))
    await assert.rejects(storePreorderImage('.png', Buffer.alloc(10 * 1024 * 1024 + 1)))
    await assert.rejects(snapshotPreorderImage('/products/../../.env'))
    await assert.rejects(snapshotPreorderImage('http://localhost/private'))
    assert.equal(preorderImagePath('../.env'), null)
  } finally {
    if (oldProduct === undefined) delete process.env.PRODUCT_IMAGE_DIR
    else process.env.PRODUCT_IMAGE_DIR = oldProduct
    if (oldPreorder === undefined) delete process.env.PREORDER_IMAGE_DIR
    else process.env.PREORDER_IMAGE_DIR = oldPreorder
    await rm(directory, { recursive: true, force: true })
  }
})

test('打印店名使用设置页 storeName，兼容旧字段并忽略空白', () => {
  assert.equal(resolveShopName({ storeName: ' 花间集 ', shopName: '旧名称' }), '花间集')
  assert.equal(resolveShopName({ storeName: ' ', shopName: '旧名称' }), '旧名称')
  assert.equal(resolveShopName({ shop_name: '老店名' }), '老店名')
  assert.equal(resolveShopName({}), '花店')
})
