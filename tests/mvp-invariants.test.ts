import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
test('财务边界：分币退货、积分债务、特价/FIFO、并发补款和销售确认', {skip:process.env.MVP_DATABASE_TEST!=='1'},async()=>{
 Object.assign(process.env,parseEnv(readFileSync('.cache/pos-test.env','utf8')))
 assert.match(new URL(process.env.DATABASE_URL!).searchParams.get('schema')!,/^pos_acceptance_\d+$/)
 ;(globalThis as any).createError=createError
 const {prisma:db}=await import('../server/utils/prisma')
 const {businessTransaction}=await import('../server/utils/businessTransaction')
 const {createSale}=await import('../server/utils/createOrder')
 const {quoteOrder}=await import('../server/utils/orderPricing')
 const {collectOrderPayment}=await import('../server/utils/accounts')
 const {requestAdjustment,approveAdjustment}=await import('../server/utils/orderAdjustments')
 const {businessReport}=await import('../server/utils/businessReports')
 const {reconcile}=await import('../server/utils/reconciliation')
 const uid=JSON.parse(readFileSync('.cache/pos-test-fixtures.json','utf8')).userId
 const event={context:{user:{sub:uid,type:'staff',role:'admin'}}}
 const run=(fn:any)=>businessTransaction(event,'invariant',{idempotencyKey:randomUUID()},fn)
 const purchase=(customerId:number,productId:number,qty:any=1,paidAmount:any='100',extra:any={})=>run((tx:any,a:number,k:string)=>createSale(tx,a,k,{cart:{customerId,items:[{productId,qty,unit:'枝'}],...extra},payment:{method:Number(paidAmount)===0?'credit':'wechat',paidAmount}},'admin'))
 const refund=async(o:any,qty:any)=>{const r=await run((tx:any,a:number)=>requestAdjustment(tx,o.id,{type:'return',reason:'边界验收',lines:[{itemId:o.items[0].id,qty,disposition:'restock'}]},a));return run((tx:any,a:number,k:string)=>approveAdjustment(tx,o.id,r.id,{decision:'approve',externalReference:'test-only-confirmation'},a,k))}
 try{
  const product=await db.product.create({data:{name:'边界测试鲜花',baseUnit:'枝',defaultPrice:100,memberPrice:90,vipPrice:80,wholesalePrice:70,stockBatches:{create:{batchNo:randomUUID(),inboundDate:new Date(),expiryDate:new Date(Date.now()+86400000),inboundQty:100,currentQty:100,costPrice:20}}}})
  const clients:any[]=[]
  for(const [level,total] of [['normal','100.00'],['member','90.00'],['vip','80.00'],['wholesale','70.00']]){
   const c=await db.customer.create({data:{name:`测试 ${level}`,level}});clients.push(c)
   const q=await quoteOrder(db,{customerId:c.id,items:[{productId:product.id,qty:1,unit:'枝'}]},'cashier');assert.equal(q.total,total)
  }
  const c=clients[0], first=await purchase(c.id,product.id)
  await purchase(c.id,product.id,1,'99',{pointsToRedeem:100})
  await refund(first.order,1)
  assert.equal((await db.customer.findUniqueOrThrow({where:{id:c.id}})).availablePoints,-1)
  await assert.rejects(purchase(c.id,product.id,1,'99',{pointsToRedeem:100}),/积分/)
  const wholesale=await purchase(clients[3].id,product.id,1,'70')
  assert.equal(await db.pointEntry.count({where:{orderId:wholesale.order.id}}),0)
  const credit=await purchase(c.id,product.id,1,0)
  const concurrent=await Promise.allSettled([1,2].map(()=>run((tx:any,a:number,k:string)=>collectOrderPayment(tx,credit.order.id,100,'wechat',a,k))))
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(await db.payment.count({where:{orderId:credit.order.id}}),1)
  const cheap=await db.product.create({data:{name:'分币花材',baseUnit:'枝',defaultPrice:'0.01',stockBatches:{create:{batchNo:randomUUID(),inboundDate:new Date(),expiryDate:new Date(Date.now()+86400000),inboundQty:10,currentQty:10,costPrice:'0.01'}}}})
  const distributed=await quoteOrder(db,{customerId:c.id,items:Array.from({length:4},()=>({productId:cheap.id,qty:1,unit:'枝'})),discount:'0.02',priceReason:'多行分币'},'admin')
  assert.deepEqual(distributed.items.map((i:any)=>i.subtotal),['0.01','0.01','0.00','0.00'])
  const tiny=await purchase(c.id,cheap.id,3,'0.01',{discount:'0.02',priceReason:'分币验证'})
  await refund(tiny.order,1);await refund(tiny.order,1);await refund(tiny.order,1)
  const partial=await db.orderAdjustment.findMany({where:{orderId:tiny.order.id},orderBy:{id:'asc'}})
  assert.deepEqual(partial.map(a=>Number(a.amount)),[0,0.01,0])
  assert.equal(Number((await db.order.findUniqueOrThrow({where:{id:tiny.order.id}})).refundedAmount),0.01)
  const batch=await db.stockBatch.create({data:{productId:product.id,batchNo:randomUUID(),inboundDate:new Date(Date.now()-86400000),expiryDate:new Date(Date.now()+86400000),inboundQty:5,currentQty:5,costPrice:10,status:'discounted',specialPrice:50,specialQty:2,specialUntil:new Date(Date.now()+86400000)}})
  const special=await run((tx:any,a:number,k:string)=>createSale(tx,a,k,{cart:{customerId:c.id,items:[{productId:product.id,qty:2,unit:'枝',specialBatchId:batch.id}]},payment:{method:'wechat',paidAmount:100}},'admin'))
  assert.equal(Number((await db.stockBatch.findUniqueOrThrow({where:{id:batch.id}})).currentQty),3)
  assert.equal(special.order.items[0].batchId,batch.id)
  const normal=await purchase(c.id,product.id,1,100)
  assert.equal(normal.order.items[0].batchId,batch.id)
  await assert.rejects(run((tx:any,a:number,k:string)=>createSale(tx,a,k,{cart:{customerId:c.id,items:[{productId:product.id,qty:1,unit:'枝',specialBatchId:batch.id}]},payment:{method:'wechat',paidAmount:50}},'admin')),/特价/)
  const future=new Date(Date.now()+86400000)
  const pre=await run((tx:any,a:number,k:string)=>createSale(tx,a,k,{customerId:c.id,items:[{productId:product.id,qty:1,unit:'枝'}],deliveryTime:future.toISOString(),payment:{method:'wechat',paidAmount:10}},'admin',true))
  const report=await businessReport(db,{basis:'sales'})
  assert.ok(!report.missingCostOrders.includes(pre.order.id))
  assert.ok(report.dailyTrend.every((d:any)=>typeof d.amount==='string'))
  const aggregate:any[]=await db.$queryRawUnsafe(`SELECT
   (SELECT COALESCE(SUM("totalAmount"),0) FROM "Order" WHERE "completedAt" IS NOT NULL)-(SELECT COALESCE(SUM(a.amount),0) FROM "OrderAdjustment" a JOIN "Order" o ON o.id=a."orderId" WHERE a.status='approved' AND o."completedAt" IS NOT NULL) AS sales,
   (SELECT COALESCE(SUM(amount),0) FROM "Payment" WHERE "paymentMethod"<>'balance') AS cash,
   (SELECT COALESCE(SUM(c."totalCost"),0) FROM "OrderCostAllocation" c JOIN "Order" o ON o.id=c."orderId" WHERE o."completedAt" IS NOT NULL) AS cost`)
  assert.equal(Number(report.summary.totalSales),Number(aggregate[0].sales))
  assert.equal(Number(report.summary.totalPaid),Number(aggregate[0].cash))
  assert.equal(Number(report.summary.totalCost),Number(aggregate[0].cost))
  const check=await reconcile(db);assert.deepEqual(check.mismatches,[])
  console.log(JSON.stringify({checks:['four customer tiers','points redemption and negative debt','wholesale exclusion','competing installments','cent rounding across 3 refunds','special batch binding','normal FIFO after special quantity exhausted','preorder not recognized before delivery','customer ledger invariants']}))
 }finally{await db.$disconnect()}
})
