import { mkdir, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { prisma } from '../utils/prisma'
import { productImageDirectory } from '../utils/productImages'
import { preorderImageDirectory } from '../utils/preorderImages'
export default defineEventHandler(async event=>{
 try {
  await prisma.$queryRaw`SELECT 1`
  for(const dir of [productImageDirectory(),preorderImageDirectory()]){await mkdir(dir,{recursive:true});await access(dir,constants.W_OK)}
  return {data:{status:'ok',database:'ok',imageStorage:'writable',timestamp:new Date().toISOString()},error:null}
 }catch{setResponseStatus(event,503);return {data:{status:'degraded'},error:{message:'数据库或图片存储不可用'}}}
})
