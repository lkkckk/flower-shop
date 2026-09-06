import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'

export const productImageDirectory = () => path.resolve(
  process.env.PRODUCT_IMAGE_DIR || path.join(process.cwd(), 'public', 'products'),
)

export const productImageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
}

export function productImagePath(filename: string) {
  // Accept legacy names and versioned uploads, never directory components.
  if (!/^\d+(?:-[a-f0-9-]{36})?\.(?:jpg|jpeg|png|webp)$/.test(filename)) return null
  return path.join(productImageDirectory(), filename)
}

export async function storeProductImage<T>(
  productId: number, extension: string, data: Buffer,
  persistUrl: (url: string) => Promise<T>,
): Promise<T> {
  if (!Number.isSafeInteger(productId) || productId < 1 || !productImageTypes[extension]) {
    throw new Error('Invalid product image')
  }
  const filename = `${productId}-${randomUUID()}${extension}`
  const directory = productImageDirectory()
  await mkdir(directory, { recursive: true })
  const destination = path.join(directory, filename)
  await writeFile(destination, data, { flag: 'wx' })
  try {
    return await persistUrl(`/products/${filename}`)
  } catch (error) {
    await unlink(destination).catch(() => {})
    throw error
  }
  // Keep prior images: historical order snapshots can still reference them.
}
