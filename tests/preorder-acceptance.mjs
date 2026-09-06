import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
Object.assign(process.env, parseEnv(readFileSync('.cache/pos-test.env','utf8')))
const fixture = JSON.parse(readFileSync('.cache/pos-test-fixtures.json','utf8'))
assert.equal(new URL(process.env.DATABASE_URL).searchParams.get('schema'), fixture.schema)
assert.match(fixture.schema,/^pos_acceptance_\d+$/)
const p = new PrismaClient()
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3010'
const login = await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'pos_acceptance',password:'PosAcceptance2026!'})}).then(r=>r.json())
assert.ok(login.data?.token,JSON.stringify(login))
const token=login.data.token
async function request(url,body,method='POST',auth=token) {
 const res=await fetch(origin+url,{method,headers:{Authorization:`Bearer ${auth}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})})
 return {status:res.status,body:await res.json()}
}
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')
const form=()=>{const f=new FormData();f.append('file',new Blob([bytes],{type:'image/png'}),'confirmation.png');return f}
try {
 assert.equal((await request('/api/preorders/images',form(),'POST','')).status,401)
 const uploaded=await request('/api/preorders/images',form())
 assert.equal(uploaded.status,200,JSON.stringify(uploaded))
 const imageUrl=uploaded.body.data.imageUrl
 assert.deepEqual(Buffer.from(await (await fetch(origin+imageUrl)).arrayBuffer()),bytes)
 const productId=fixture.productIds[0]
 const item={productId,unit:'枝',qty:1,baseQty:1,unitPrice:8,subtotal:8,imageUrl}
 const created=await request('/api/preorders',{receiverName:'照片固定验收',receiverPhone:'13800000000',deliveryAddress:'测试地址',deliveryTime:new Date(Date.now()+86400000).toISOString(),totalAmount:8,items:[item]})
 assert.equal(created.body.error,null,JSON.stringify(created))
 const order=created.body.data
 assert.equal((await p.orderItem.findFirst({where:{orderId:order.id}})).imageUrl,imageUrl)
 const catalogue=await request(`/api/products/${productId}/image`,form())
 assert.equal(catalogue.body.error,null)
 let fetched=await request(`/api/preorders/${order.id}`,null,'GET')
 assert.equal(fetched.body.data.items[0].imageUrl,imageUrl)
 assert.notEqual(fetched.body.data.items[0].product.imageUrl,imageUrl)
 const replacement=(await request('/api/preorders/images',form())).body.data.imageUrl
 const updated=await request(`/api/preorders/${order.id}`,{items:[{...item,imageUrl:replacement}],totalAmount:8},'PUT')
 assert.equal(updated.body.error,null)
 assert.equal((await p.orderItem.findFirst({where:{orderId:order.id}})).imageUrl,replacement)
 assert.equal((await fetch(origin+imageUrl)).status,200,'先前照片保留')
 const removed=await request(`/api/preorders/${order.id}`,{items:[{...item,imageUrl:null}],totalAmount:8},'PUT')
 assert.equal(removed.body.error,null)
 assert.equal((await p.orderItem.findFirst({where:{orderId:order.id}})).imageUrl,null)
 await request(`/api/preorders/${order.id}`,{items:[item],totalAmount:8},'PUT')
 await p.order.update({where:{id:order.id},data:{status:'in_production'}})
 const locked=await request(`/api/preorders/${order.id}`,{items:[{...item,imageUrl:replacement}]},'PUT')
 assert.ok(locked.body.error)
 assert.equal((await p.orderItem.findFirst({where:{orderId:order.id}})).imageUrl,imageUrl)
 await p.order.update({where:{id:order.id},data:{status:'pending_confirm'}})
 const cashierToken=jwt.sign({userId:fixture.userId,username:'pos_acceptance',role:'cashier',type:'staff'},process.env.JWT_SECRET)
 const settings=await request('/api/settings',null,'GET',cashierToken)
 assert.equal(settings.body.data.storeName,'花间集·订单验收店')
 assert.equal(settings.body.data.shopName,'花间集·订单验收店')
 assert.equal(settings.body.data.notificationQuietStart,undefined)
 fixture.preorderId=order.id;fixture.preorderImageUrl=imageUrl
 writeFileSync('.cache/pos-test-fixtures.json',JSON.stringify(fixture))
 console.log('PASS: 真实 API + PostgreSQL：上传鉴权、文件读取、新建/编辑持久化、商品换图不影响订单、移除不回填、进入制作后锁定、收银员店名读取。预售单 ID='+order.id)
} finally {await p.$disconnect()}
