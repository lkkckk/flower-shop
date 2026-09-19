import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { registrationEnvironment } from './helpers/registration-environment.mjs'

const environment = await registrationEnvironment()
const { prisma, origin, password } = environment
const tokens = {}
async function request(path, method = 'GET', body, role = 'cashier') {
  const response = await fetch(origin + path, { method, headers: { Authorization: `Bearer ${tokens[role] || ''}`, ...(body instanceof FormData ? {} : {'Content-Type':'application/json'}) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, ...await response.json() }
}
const ok = value => { assert.equal(value.status, 200, JSON.stringify(value)); assert.equal(value.error, null); return value.data }
const payload = () => ({ orderNo:'金额与打印验收',contactPhone:'13800000000',deliveryTime:'2026-09-21T10:00:00+08:00', notes:'红色包装\n到店前联系',cardMessage:'生日快乐！',totalAmount:'999999.99',items:[{name:'玫瑰花束',qty:1,amount:'268.00',photos:[]},{name:'百合花束',qty:2,amount:'128.50',photos:[]}],idempotencyKey:randomUUID() })
try {
  for (const role of ['admin','staff','cashier']) tokens[role]=ok(await request('/api/auth/login','POST',{username:role,password},role)).token
  const baseline=await Promise.all([prisma.order.count(),prisma.payment.count(),prisma.stockMovement.count(),prisma.customerAccountEntry.count()])
  const created=ok(await request('/api/preorder-registrations','POST',payload()))
  assert.deepEqual(created.items.map(i=>i.amount),['268.00','128.50'])
  const rows=await prisma.preorderRegistrationItem.findMany({where:{registrationId:created.id},orderBy:{sort:'asc'}})
  assert.equal(rows[0].amount.plus(rows[1].amount).toFixed(2),'396.50')
  const saved=ok(await request(`/api/preorder-registrations/${created.id}`))
  assert.deepEqual(saved.items.map(i=>i.amount),['268.00','128.50'])
  const list=ok(await request('/api/preorder-registrations'))
  assert.deepEqual(list.list.find(r=>r.id===created.id).items.map(i=>i.amount),['268.00','128.50'])
  for(const amount of [-1,'abc','NaN','Infinity','1.001',null,'','10000000000']) {
    const bad=payload(); bad.items[0].amount=amount
    assert.equal((await request('/api/preorder-registrations','POST',bad)).status,400,`create ${amount}`)
    assert.equal((await request(`/api/preorder-registrations/${created.id}`,'PUT',{...bad,version:1})).status,400,`update ${amount}`)
  }
  const zero=payload();zero.items[0].amount=0;zero.items[1].amount='0.20'
  const zeroResult=ok(await request('/api/preorder-registrations','POST',zero))
  assert.deepEqual(zeroResult.items.map(i=>i.amount),['0.00','0.20'])
  const update={...payload(),version:1,items:[{name:'改后金额',qty:3,amount:'0.10',photos:[]}]}
  const parallel=await Promise.all([request(`/api/preorder-registrations/${created.id}`,'PUT',update),request(`/api/preorder-registrations/${created.id}`,'PUT',update)])
  assert.equal(ok(parallel[0]).version,2);assert.deepEqual(ok(parallel[0]),ok(parallel[1]))
  assert.equal((await request(`/api/preorder-registrations/${created.id}`,'PUT',{...update,items:[{...update.items[0],amount:'0.20'}]})).status,409)
  const historical=await prisma.preorderRegistration.create({data:{orderNo:'历史未填金额',createdById:environment.users.admin.id,updatedById:environment.users.admin.id,items:{create:{name:'旧记录花束',qty:2}}}})
  assert.equal(ok(await request(`/api/preorder-registrations/${historical.id}`)).items[0].amount,null)
  assert.deepEqual(await Promise.all([prisma.order.count(),prisma.payment.count(),prisma.stockMovement.count(),prisma.customerAccountEntry.count()]),baseline)
  console.log('PASS Decimal行金额求和（不乘数量）、非法金额400、并发幂等、历史null、财务库存隔离')
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')
  const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'print.png')
  const image=ok(await request('/api/preorder-registrations/images','POST',form)).imageUrl
  const printablePayload=payload(); printablePayload.items[0].photos=[{url:image},{url:image}]
  const printable=ok(await request('/api/preorder-registrations','POST',printablePayload))
  const product=await prisma.product.create({data:{name:'打印验收月季',baseUnit:'枝',defaultPrice:20,stockBatches:{create:{batchNo:randomUUID(),inboundDate:new Date(),expiryDate:new Date(Date.now()+86400000),inboundQty:30,currentQty:30,costPrice:5}}}})
  const sale=ok(await request('/api/orders/checkout','POST',{idempotencyKey:randomUUID(),cart:{items:[{productId:product.id,unit:'枝',qty:1}]},payment:{method:'cash',paidAmount:20}})).order
  assert.equal((await request('/api/settings','PUT',[{key:'printerName',value:'bad'}])).status,403)
  console.log('PASS 收银员可读打印资料、现有POS结账、设置写权限未放开')
  if(process.argv.includes('--serve')) {
    await mkdir('.cache',{recursive:true})
    await writeFile('.cache/printing-browser.json',JSON.stringify({origin,password,registrationId:printable.id,historicalId:historical.id,orderId:sale.id,productId:product.id}))
    console.log(`Browser acceptance: ${origin}`)
    await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve);process.once('SIGINT',resolve)})
    process.stdin.pause()
  }
} finally { await environment.dispose() }
