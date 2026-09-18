import path from 'node:path'
import { createError, defineEventHandler, readMultipartFormData, getHeader } from 'h3'
import { MAX_PREORDER_IMAGE_BYTES, storePreorderImage } from '../../utils/preorderImages'

function inferExtension(filename: string, mimeType?: string, data?: Buffer): string {
  let ext = path.extname(filename).toLowerCase()
  if (ext === '.jpeg' || ext === '.jfif') return '.jpg'
  if (ext === '.jpg' || ext === '.png' || ext === '.webp') return ext

  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'

  if (data && data.length >= 8) {
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png'
    if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return '.webp'
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return '.jpg'
  }
  return ext
}

export default defineEventHandler(async (event) => {
  if (Number(getHeader(event, 'content-length')) > MAX_PREORDER_IMAGE_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: '图片不能超过 10MB' })
  }
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file')
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: '请选择照片' })
  try {
    const ext = inferExtension(file.filename, file.type, file.data)
    const imageUrl = await storePreorderImage(ext, file.data)
    return { data: { imageUrl }, error: null }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || '照片上传失败' })
  }
})
