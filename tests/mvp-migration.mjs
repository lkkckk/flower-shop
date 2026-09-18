import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
const env={...process.env,...parseEnv(readFileSync('.env','utf8'))}
const url=new URL(env.DATABASE_URL), schema=`mvp_migration_${Date.now()}`
url.searchParams.set('schema',schema);env.DATABASE_URL=url.toString()
// Derive the previous schema from the committed baseline, never from a production database.
const old=spawnSync('git',['show','196b194ac87facfc5cb5fe96bd4494be0f864918:prisma/schema.prisma'],{encoding:'utf8'})
assert.equal(old.status,0);writeFileSync('.cache/migration-old.prisma',old.stdout)
const cli=(args)=>{const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{env,encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout)}
cli(['db','push','--skip-generate','--schema','.cache/migration-old.prisma'])
const db=new PrismaClient({datasources:{db:{url:url.toString()}}})
try {
 await db.$executeRawUnsafe(`INSERT INTO "Customer"(id,name,balance,"totalOwed",points,"updatedAt") VALUES (1,'混合还款',-20,70,100,now()),(2,'超额还款',20,100,100,now()),(3,'负预存',-25,0,25,now()),(4,'积分期初',0,0,50,now()),(5,'预售漏记应收',0,0,0,now())`)
 await db.$executeRawUnsafe(`INSERT INTO "Order"(id,"orderNo","customerId","totalAmount","paidAmount","owedAmount",status,"updatedAt") VALUES(1,'MIG-1',1,100,30,70,'partial',now()),(2,'MIG-2',2,100,0,100,'unpaid',now()),(3,'MIG-3',3,25,25,0,'paid',now())`)
 await db.$executeRawUnsafe(`INSERT INTO "Order"(id,"orderNo","customerId","orderType","totalAmount","paidAmount","owedAmount",status,"updatedAt") VALUES(5,'MIG-5',5,'preorder',2.5,0,0,'pending_confirm',now())`)
 await db.$executeRawUnsafe(`INSERT INTO "Payment"("customerId","orderId",amount,type,"paymentMethod") VALUES(1,null,50,'recharge','cash'),(1,1,20,'income','balance'),(1,1,10,'income','cash'),(1,null,30,'repay','wechat'),(2,null,120,'repay','cash'),(3,3,25,'income','balance')`)
 cli(['db','execute','--schema','.cache/migration-old.prisma','--file','prisma/migrations/20260907000000_mvp_foundation/migration.sql'])
 const customers=await db.customer.findMany({orderBy:{id:'asc'}})
 assert.deepEqual(customers.map(c=>[Number(c.storedValueBalance),Number(c.receivableBalance),c.availablePoints]),[[30,40,100],[20,0,100],[0,0,25],[0,0,50],[0,2.5,0]])
 assert.equal(Number((await db.order.findUnique({where:{id:1}})).paidAmount),60)
 const allocations=await db.auditLog.findMany({where:{action:'migration.repay.allocate'}})
 assert.equal(allocations.length,2)
 assert.ok(allocations.every(a=>a.details.paymentId&&a.details.paymentMethod))
 assert.equal(await db.auditLog.count({where:{action:'migration.discrepancy'}}),4)
 assert.equal(await db.auditLog.count({where:{action:'migration.resolve'}}),1)
 assert.equal(Number((await db.customerAccountEntry.findFirst({where:{customerId:5,type:'opening_adjustment'}})).amount),2.5)
 assert.equal(await db.auditLog.count({where:{action:'migration.points.in_opening'}}),3)
 for(const c of customers){
  const sums=await db.customerAccountEntry.groupBy({by:['account'],where:{customerId:c.id},_sum:{amount:true}})
  assert.equal(Number(sums.find(s=>s.account==='stored_value')._sum.amount),Number(c.storedValueBalance))
  assert.equal(Number(sums.find(s=>s.account==='receivable')._sum.amount),Number(c.receivableBalance))
  assert.equal((await db.pointEntry.aggregate({where:{customerId:c.id},_sum:{amount:true}}))._sum.amount,c.availablePoints)
 }
 await assert.rejects(db.pointEntry.updateMany({data:{amount:0}}),/immutable/)
 console.log(JSON.stringify({status:'passed',schema,cases:['mixed customer/order repayment','excess repayment to stored value','negative stored value flagged','opening points','repayment provenance','immutable ledgers']}))
}finally{
 assert.match(schema,/^mvp_migration_\d+$/)
 await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
 await db.$disconnect()
}
