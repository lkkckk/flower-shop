import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  throw createError({ statusCode: 403, message: '历史预售订单已归档为只读模式，不再支持修改' })
})
