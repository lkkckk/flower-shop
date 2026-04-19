import { readMultipartFormData, getRouterParam } from 'h3'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const productId = parseInt(getRouterParam(event, 'id') || '0')
  if (!productId) {
    return { data: null, error: { message: '参数错误', code: 'BAD_PARAMS' } }
  }

  // 校验商品存在
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, imageUrl: true } })
  if (!product) {
    return { data: null, error: { message: '商品不存在', code: 'NOT_FOUND' } }
  }

  const formData = await readMultipartFormData(event)
  const filePart = formData?.find((p) => p.name === 'file')
  if (!filePart?.data || !filePart.filename) {
    return { data: null, error: { message: '未收到文件', code: 'NO_FILE' } }
  }

  const ext = path.extname(filePart.filename).toLowerCase()
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  if (!allowed.includes(ext)) {
    return { data: null, error: { message: '仅支持 jpg / png / webp 格式', code: 'INVALID_TYPE' } }
  }

  // 确保目录存在
  const uploadDir = path.join(process.cwd(), 'public', 'products')
  await mkdir(uploadDir, { recursive: true })

  // 删除旧图片（静默失败）
  if (product.imageUrl) {
    const oldPath = path.join(process.cwd(), 'public', product.imageUrl.replace(/^\//, ''))
    await unlink(oldPath).catch(() => {})
  }

  // 写入新图片
  const filename = `${productId}${ext}`
  const filePath = path.join(uploadDir, filename)
  await writeFile(filePath, filePart.data)

  const imageUrl = `/products/${filename}`
  const updated = await prisma.product.update({
    where: { id: productId },
    data: { imageUrl },
    select: { imageUrl: true },
  })

  return { data: { imageUrl: updated.imageUrl }, error: null }
})
