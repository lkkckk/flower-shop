import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { productImageDirectory, productImagePath, productImageTypes } from './productImages'

export const preorderImageDirectory = () => path.resolve(
  process.env.PREORDER_IMAGE_DIR || path.join(productImageDirectory(), '..', 'preorder-images'),
)
export const MAX_PREORDER_IMAGE_BYTES = 10 * 1024 * 1024

export function preorderImagePath(filename: string) {
  if (!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/.test(filename)) return null
  return path.join(preorderImageDirectory(), filename)
}

export function validatePreorderImage(extension: string, data: Buffer) {
  if (!productImageTypes[extension]) throw new Error('仅支持 JPG、PNG、WebP 图片')
  if (!data.length || data.length > MAX_PREORDER_IMAGE_BYTES) throw new Error('图片不能为空，且不能超过 10MB')
  const valid = extension === '.png'
    ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : extension === '.webp'
      ? data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
      : data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  if (!valid) throw new Error('文件内容与图片格式不符，请重新选择图片')
}

export async function storePreorderImage(extension: string, data: Buffer) {
  validatePreorderImage(extension, data)
  const filename = `${randomUUID()}${extension}`
  await mkdir(preorderImageDirectory(), { recursive: true })
  await writeFile(preorderImagePath(filename)!, data, { flag: 'wx' })
  return `/preorder-images/${filename}`
}

/** Copy local catalogue photos so later catalogue changes cannot alter an order. */
export async function snapshotPreorderImage(value: unknown): Promise<string | null> {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error('订单照片地址无效')
  if (value.startsWith('/preorder-images/')) {
    const file = preorderImagePath(value.slice('/preorder-images/'.length))
    if (!file) throw new Error('订单照片地址无效')
    await readFile(file) // Do not save a reference to a missing upload.
    return value
  }
  if (value.startsWith('/products/')) {
    const file = productImagePath(value.slice('/products/'.length))
    if (!file) throw new Error('商品照片地址无效')
    return storePreorderImage(path.extname(file), await readFile(file))
  }
  // Older orders may contain remote catalogue URLs. Never fetch arbitrary URLs on the server.
  throw new Error('请为该商品上传订单照片，或移除旧图片后保存')
}
