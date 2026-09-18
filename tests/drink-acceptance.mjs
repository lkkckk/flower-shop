import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { registrationEnvironment } from './helpers/registration-environment.mjs'

const env = await registrationEnvironment()
const { prisma, origin, password } = env
const tokens = {}
async function request(path, role = 'admin', method = 'GET', body) {
  const r = await fetch(origin + path, { method, headers: { Authorization: `Bearer ${tokens[role] || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: r.status, ...await r.json() }
}
const ok = r => { assert.equal(r.status, 200, JSON.stringify(r)); assert.ok(!r.error, JSON.stringify(r)); return r.data }
const write = (path, body, role = 'admin') => request(path, role, 'POST', { ...body, idempotencyKey: body.idempotencyKey || randomUUID() })
const groups = [ { id: randomUUID(), name: '温度', sort: 0, options: ['冷', '热'].map((name, sort) => ({ id: randomUUID(), name, sort })) }, { id: randomUUID(), name: '杯量', sort: 1, options: ['500ml', '900ml'].map((name, sort) => ({ id: randomUUID(), name, sort })) } ]
const variants = groups[0].options.flatMap((a, i) => groups[1].options.map((b, j) => ({ id: randomUUID(), options: [{groupId:groups[0].id,optionId:a.id},{groupId:groups[1].id,optionId:b.id}], price: j ? '18.00' : '12.00', enabled: true })))
for (const v of variants) v.selectionKey = v.options.map(o => `${o.groupId}:${o.optionId}`).sort().join('|')
let drink
try {
  for (const role of ['admin','staff','cashier']) tokens[role] = ok(await request('/api/auth/login',role,'POST',{username:role,password})).token
  const payload = { name: '验收柠檬茶', productType: 'drink', category: '饮品', status: 'active', drinkGroups: groups, drinkVariants: variants }
  drink = ok(await write('/api/products',payload))
  assert.equal(drink.baseUnit,'杯'); assert.equal(drink.drinkVariants.length,4)
  assert.equal(await prisma.stockBatch.count({where:{productId:drink.id}}),0)
  const item = { productId:drink.id, variantId:variants[0].id, expectedUnitPrice:'12.00', qty:2, unit:'杯' }
  const saleBody = customerId => ({ cart:{ customerId, items:[item] }, payment:{method:'cash',paidAmount:24}, expectedTotal:'24.00' })
  let sold
  for (const level of ['normal','member','vip','wholesale']) {
    const customer = await prisma.customer.create({data:{name:level,level}})
    const body = {...saleBody(customer.id),idempotencyKey:randomUUID()}
    const results = await Promise.all([write('/api/orders/checkout',body,'cashier'),write('/api/orders/checkout',body,'cashier')])
    sold = ok(results[0]).order; assert.equal(sold.id,ok(results[1]).order.id)
    assert.equal(Number(sold.totalAmount),24)
    assert.equal(sold.items[0].variantId,variants[0].id)
    assert.equal(sold.items[0].variantLabel,'冷 / 500ml')
  }
  assert.equal(await prisma.stockMovement.count(),0)
  assert.equal(await prisma.orderCostAllocation.count(),0)
  console.log('PASS 四种客户等级同价、无库存成交、并发幂等与规格快照')
  for (const changed of [{variantId:randomUUID()},{qty:1.5},{expectedUnitPrice:'0.01'},{variantId:null},{unit:'扎'},{specialBatchId:1}]) {
    const result=await write('/api/orders/checkout',{cart:{items:[{...item,...changed}]},payment:{method:'cash',paidAmount:24}},'cashier')
    assert.ok(result.status>=400 || result.error,JSON.stringify(changed))
  }
  const flower=await prisma.product.create({data:{name:'混单月季',baseUnit:'枝',defaultPrice:20,stockBatches:{create:{batchNo:randomUUID(),inboundDate:new Date(),expiryDate:new Date(Date.now()+86400000),inboundQty:2,currentQty:2,costPrice:5}}}})
  const before=await prisma.order.count()
  const mixedFail=await write('/api/orders/checkout',{cart:{items:[item,{productId:flower.id,unit:'枝',qty:3}]},payment:{method:'cash',paidAmount:84}},'cashier')
  assert.ok(mixedFail.status>=400 || mixedFail.error)
  assert.equal(await prisma.order.count(),before)
  const mixed=ok(await write('/api/orders/checkout',{cart:{items:[item,{productId:flower.id,unit:'枝',qty:1}]},payment:{method:'cash',paidAmount:44}},'cashier')).order
  assert.equal(await prisma.stockMovement.count(),1)
  console.log('PASS 非法组合/价格/数量拒绝，混合订单失败回滚及普通商品扣库')
  const adjustment=ok(await write(`/api/orders/${mixed.id}/adjustments`,{type:'return',reason:'饮品退款验收',lines:[{itemId:mixed.items.find(i=>i.variantId).id,qty:1}]},'cashier'))
  const approval={decision:'approve',refundMethod:'original',lines:adjustment.lines,idempotencyKey:randomUUID()}
  ok(await write(`/api/orders/${mixed.id}/adjustments/${adjustment.id}/approve`,approval))
  ok(await write(`/api/orders/${mixed.id}/adjustments/${adjustment.id}/approve`,approval))
  assert.equal(await prisma.stockMovement.count(),1)
  const updated = {...payload,name:'改名后柠檬茶',drinkVariants:variants.map((v,i)=>({...v,price:i===0?'15.00':v.price}))}
  ok(await request(`/api/products/${drink.id}`,'admin','PUT',updated))
  assert.equal((await write('/api/orders/checkout',saleBody(), 'cashier')).status,409)
  assert.equal((await prisma.orderItem.findUnique({where:{id:sold.items[0].id}})).productNameSnapshot,'验收柠檬茶')
  const trimmed={...updated,drinkGroups:[groups[0],{...groups[1],options:[groups[1].options[0]]}],drinkVariants:updated.drinkVariants.filter(v=>v.options[1].optionId===groups[1].options[0].id)}
  const edited=ok(await request(`/api/products/${drink.id}`,'admin','PUT',trimmed))
  assert.equal(edited.drinkVariants.length,2)
  assert.equal((await prisma.drinkVariant.findUnique({where:{id:variants[1].id}})).enabled,false)
  assert.ok((await request(`/api/products/${drink.id}`,'admin','PUT',{...trimmed,productType:'standard'})).error)
  const report=ok(await request('/api/reports/dashboard'))
  assert.ok(JSON.stringify(report).includes('uncostedDrink'), '报表缺少未核算饮品成本指标')
  console.log('PASS 饮品退款无库存变化、价格变化拦截、改名/移除组合历史保留、类型锁定、报表指标')
  if(process.argv.includes('--serve')) {
    await mkdir('.cache',{recursive:true})
    await writeFile('.cache/drink-browser.json',JSON.stringify({origin,password,drinkId:drink.id,orderId:mixed.id}))
    console.log(`Browser acceptance: ${origin}`)
    await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve);process.once('SIGINT',resolve)})
    process.stdin.pause()
  }
} finally { await env.dispose() }
