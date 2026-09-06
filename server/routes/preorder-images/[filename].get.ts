import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { preorderImagePath } from '../../utils/preorderImages'
import { productImageTypes } from '../../utils/productImages'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const file = preorderImagePath(filename)
  if (!file) throw createError({ statusCode: 404, message: '照片不存在' })
  try {
    const image = await readFile(file)
    setHeader(event, 'Content-Type', productImageTypes[path.extname(filename)]!)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    return image
  } catch (error: any) {
    if (error.code === 'ENOENT') throw createError({ statusCode: 404, message: '照片不存在' })
    throw error
  }
})
