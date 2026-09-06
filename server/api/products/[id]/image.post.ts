import { readMultipartFormData, getRouterParam } from 'h3'
import path from 'path'
import { storeProductImage } from '../../../utils/productImages'

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

  const updated = await storeProductImage(productId, ext, filePart.data, (imageUrl) => prisma.product.update({
    where: { id: productId },
    data: { imageUrl },
    select: { imageUrl: true },
  }))

  return { data: { imageUrl: updated.imageUrl }, error: null }
})
