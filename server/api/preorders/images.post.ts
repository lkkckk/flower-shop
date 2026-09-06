import path from 'node:path'
import { createError, defineEventHandler, readMultipartFormData, getHeader } from 'h3'
import { MAX_PREORDER_IMAGE_BYTES, storePreorderImage } from '../../utils/preorderImages'

export default defineEventHandler(async (event) => {
  if (Number(getHeader(event, 'content-length')) > MAX_PREORDER_IMAGE_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: '图片不能超过 10MB' })
  }
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file')
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: '请选择照片' })
  try {
    const imageUrl = await storePreorderImage(path.extname(file.filename).toLowerCase(), file.data)
    return { data: { imageUrl }, error: null }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || '照片上传失败' })
  }
})
