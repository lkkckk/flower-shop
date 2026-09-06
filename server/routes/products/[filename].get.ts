import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { productImagePath, productImageTypes } from '../../utils/productImages'

// Runtime uploads are not in Nitro's build-time public asset manifest.
export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const filePath = productImagePath(filename)
  if (!filePath) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  let image: Buffer
  try {
    image = await readFile(filePath)
  } catch (error: any) {
    if (error.code === 'ENOENT') throw createError({ statusCode: 404, statusMessage: 'Image not found' })
    throw error
  }
  setHeader(event, 'Content-Type', productImageTypes[path.extname(filename)]!)
  setHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return image
})
