import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createError, createEvent } from 'h3'
import { prisma } from '../server/utils/prisma'
import { storePreorderImage, preorderImagePath } from '../server/utils/preorderImages'
import regListHandler from '../server/api/preorder-registrations/index.get'
import regCreateHandler from '../server/api/preorder-registrations/index.post'
import regGetHandler from '../server/api/preorder-registrations/[id].get'
import regPutHandler from '../server/api/preorder-registrations/[id].put'
import regTrashHandler from '../server/api/preorder-registrations/[id]/trash.post'
import regRestoreHandler from '../server/api/preorder-registrations/[id]/restore.post'
import oldPreorderListHandler from '../server/api/preorders/index.get'
import oldPreorderGetHandler from '../server/api/preorders/[id].get'
import oldPreorderPutHandler from '../server/api/preorders/[id].put'
import oldPreorderAdvanceHandler from '../server/api/preorders/[id]/advance.post'
import oldPreorderMadeHandler from '../server/api/preorders/[id]/made.patch'
import oldPreorderUrgentHandler from '../server/api/preorders/[id]/urgent.patch'
import oldPreorderTrashHandler from '../server/api/preorders/[id]/trash.post'
import oldPreorderRestoreHandler from '../server/api/preorders/[id]/restore.post'

import { createError, createEvent, defineEventHandler, readBody, getRouterParam } from 'h3'

;(globalThis as any).createError = createError
;(globalThis as any).defineEventHandler = defineEventHandler
;(globalThis as any).readBody = readBody
;(globalThis as any).getRouterParam = getRouterParam

test('预售自由登记核心流程、真实并发冲突、权限、幂等、旧接口封锁与绝对隔离性测试', async () => {
  const TEST_PREFIX = `TEST_ISO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const createdRegistrationIds: number[] = []
  const createdOrderIds: number[] = []
  const createdUserIds: number[] = []
  const createdImageFiles: string[] = []

  try {
    // 1. 准备专属隔离测试用户 (admin, cashier, staff)
    const admin = await prisma.user.create({
      data: {
        username: `${TEST_PREFIX}_admin`,
        passwordHash: 'hash',
        name: '隔离测试管理员',
        role: 'admin',
        status: 'active',
      },
    })
    createdUserIds.push(admin.id)

    const cashier = await prisma.user.create({
      data: {
        username: `${TEST_PREFIX}_cashier`,
        passwordHash: 'hash',
        name: '隔离测试收银员',
        role: 'cashier',
        status: 'active',
      },
    })
    createdUserIds.push(cashier.id)

    const staff = await prisma.user.create({
      data: {
        username: `${TEST_PREFIX}_staff`,
        passwordHash: 'hash',
        name: '隔离测试店员',
        role: 'staff',
        status: 'active',
      },
    })
    createdUserIds.push(staff.id)

    // 构造标准 H3Event
    const makeEvent = (user: any, body: any = {}, query: any = {}, params: any = {}, method = 'POST') => {
      const qStr = new URLSearchParams(query).toString()
      const req = new IncomingMessage(new Socket())
      req.method = method
      req.url = qStr ? `/?${qStr}` : '/'
      req.headers = { 'content-type': 'application/json' }
      const res = new ServerResponse(req)
      const event = createEvent(req, res)
      event.context.user = { sub: user.id, type: 'staff', role: user.role }
      event.context.params = params
      ;(event.node.req as any).body = body
      ;(event as any)._body = body
      return event
    }

    // 2. 准备一张合法的订单照片
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
    const uploadedUrl = await storePreorderImage('.png', pngBuffer)
    createdImageFiles.push(uploadedUrl)
    assert.ok(uploadedUrl.startsWith('/preorder-images/'))

    // 3. 记录基线指标：Order 表、StockMovement 表、CustomerAccountEntry 表行数
    const initOrderCount = await prisma.order.count()
    const initMovementCount = await prisma.stockMovement.count()
    const initAccountEntryCount = await prisma.customerAccountEntry.count()

    // 4. 收银员（cashier）自由登记：无客户、无商品资料也能创建
    const orderNo1 = `${TEST_PREFIX}_ORD_1`
    const idempotencyKey1 = `${TEST_PREFIX}_idemp_1`
    const createPayload1 = {
      orderNo: orderNo1,
      contactPhone: '13800000000',
      deliveryTime: new Date(Date.now() + 86400000).toISOString(),
      notes: '自由登记备注：不挑花材',
      cardMessage: '生日快乐！',
      idempotencyKey: idempotencyKey1,
      items: [
        {
          name: '手填香槟玫瑰混搭',
          qty: '11.000',
          photos: [{ url: uploadedUrl, sort: 0 }],
        },
        {
          name: '尤加利叶配草',
          qty: '3.5',
          photos: [],
        },
      ],
    }

    const createRes1: any = await regCreateHandler(makeEvent(cashier, createPayload1, {}, {}, 'POST'))
    assert.equal(createRes1.error, null)
    const reg1 = createRes1.data
    createdRegistrationIds.push(reg1.id)
    assert.ok(reg1.id > 0)
    assert.equal(reg1.orderNo, orderNo1)
    assert.equal(reg1.version, 1)
    assert.equal(reg1.createdById, cashier.id)
    assert.equal(reg1.items.length, 2)
    assert.equal(reg1.items[0].photos.length, 1)

    // 5. 相同订单编号允许再次创建不同登记（手填单号不唯一约束）
    const idempotencyKey2 = `${TEST_PREFIX}_idemp_2`
    const createPayload2 = {
      ...createPayload1,
      idempotencyKey: idempotencyKey2,
      notes: '同一编号的第二张登记',
    }
    const createRes2: any = await regCreateHandler(makeEvent(staff, createPayload2, {}, {}, 'POST'))
    assert.equal(createRes2.error, null)
    const reg2 = createRes2.data
    createdRegistrationIds.push(reg2.id)
    assert.notEqual(reg1.id, reg2.id)
    assert.equal(reg1.orderNo, reg2.orderNo) // 单号相同但分配不同内部 ID

    // 6. 幂等性测试：携带相同 idempotencyKey 重复提交，返回初次结果且不新增
    const repeatRes: any = await regCreateHandler(makeEvent(cashier, createPayload1, {}, {}, 'POST'))
    assert.equal(repeatRes.error, null)
    assert.equal(repeatRes.data.id, reg1.id)

    // 7. 查询单条与列表：支持按单号、电话、商品名称搜索
    const singleRes: any = await regGetHandler(makeEvent(cashier, {}, {}, { id: String(reg1.id) }, 'GET'))
    assert.equal(singleRes.error, null)
    assert.equal(singleRes.data.orderNo, orderNo1)

    const listByOrderNo: any = await regListHandler(makeEvent(cashier, {}, { q: orderNo1 }, {}, 'GET'))
    assert.equal(listByOrderNo.error, null)
    assert.equal(listByOrderNo.data.list.length, 2)

    const listByItemName: any = await regListHandler(makeEvent(cashier, {}, { q: '香槟玫瑰' }, {}, 'GET'))
    assert.ok(listByItemName.data.list.some((r: any) => r.id === reg1.id))

    // 8. 真实并发更新竞争测试（Promise.all 双请求同时提交基于 version: 1 的修改）
    // 验证：严格有且仅有一个请求成功进入并提交（version 升为 2），另一个请求必须被 409 并发乐观锁拦截！
    const updatePayloadA = {
      orderNo: orderNo1,
      contactPhone: '13811112222',
      deliveryTime: reg1.deliveryTime,
      notes: '并发请求 A 备注',
      cardMessage: 'A 祝贺',
      version: 1,
      idempotencyKey: `${TEST_PREFIX}_concurrent_A`,
      items: [
        {
          name: '并发 A 商品',
          qty: '10',
          photos: [{ url: uploadedUrl, sort: 0 }],
        },
      ],
    }

    const updatePayloadB = {
      orderNo: orderNo1,
      contactPhone: '13833334444',
      deliveryTime: reg1.deliveryTime,
      notes: '并发请求 B 备注',
      cardMessage: 'B 祝贺',
      version: 1,
      idempotencyKey: `${TEST_PREFIX}_concurrent_B`,
      items: [
        {
          name: '并发 B 商品',
          qty: '20',
          photos: [{ url: uploadedUrl, sort: 0 }],
        },
      ],
    }

    const concurrentResults = await Promise.allSettled([
      regPutHandler(makeEvent(cashier, updatePayloadA, {}, { id: String(reg1.id) }, 'PUT')),
      regPutHandler(makeEvent(staff, updatePayloadB, {}, { id: String(reg1.id) }, 'PUT')),
    ])

    const fulfilledCount = concurrentResults.filter(r => r.status === 'fulfilled').length
    const rejectedCount = concurrentResults.filter(r => r.status === 'rejected').length
    assert.equal(fulfilledCount, 1, '真实并发修改必须严格仅有 1 个请求成功')
    assert.equal(rejectedCount, 1, '真实并发修改必须严格有 1 个请求被拒绝拦截')

    const rejectedResult = concurrentResults.find(r => r.status === 'rejected') as PromiseRejectedResult
    assert.equal(rejectedResult.reason?.statusCode, 409, '并发冲突必须返回 409')

    // 校验数据库中的实际版本与明细完整性（绝无两组明细混入）
    const afterConcurrent = await prisma.preorderRegistration.findUniqueOrThrow({
      where: { id: reg1.id },
      include: { items: true },
    })
    assert.equal(afterConcurrent.version, 2, '成功更新后版本号必须递增为 2')
    assert.equal(afterConcurrent.items.length, 1, '商品明细必须严格为成功的那次提交，无混杂项')

    // 再次基于过期旧版本提交：依然被 409 拦截
    const stalePayload = {
      ...updatePayloadA,
      version: 1,
      idempotencyKey: `${TEST_PREFIX}_stale_update`,
    }
    await assert.rejects(
      regPutHandler(makeEvent(staff, stalePayload, {}, { id: String(reg1.id) }, 'PUT')),
      (err: any) => err.statusCode === 409
    )

    // 9. 权限控制：非管理员不能执行移入回收站和恢复操作
    await assert.rejects(
      regTrashHandler(makeEvent(cashier, {}, {}, { id: String(reg1.id) }, 'POST')),
      (err: any) => err.statusCode === 403
    )
    await assert.rejects(
      regTrashHandler(makeEvent(staff, {}, {}, { id: String(reg1.id) }, 'POST')),
      (err: any) => err.statusCode === 403
    )

    // 管理员移入回收站：成功
    const trashRes: any = await regTrashHandler(makeEvent(admin, {}, {}, { id: String(reg1.id) }, 'POST'))
    assert.equal(trashRes.error, null)
    assert.equal(trashRes.data.success, true)

    // 检查列表可见性：普通列表默认不再包含已删除项
    const normalList: any = await regListHandler(makeEvent(cashier, {}, { q: orderNo1 }, {}, 'GET'))
    assert.ok(!normalList.data.list.some((r: any) => r.id === reg1.id))

    // 管理员查看回收站：包含该项
    const trashList: any = await regListHandler(makeEvent(admin, {}, { q: orderNo1, trashed: 'true' }, {}, 'GET'))
    assert.ok(trashList.data.list.some((r: any) => r.id === reg1.id))

    // 管理员恢复
    const restoreRes: any = await regRestoreHandler(makeEvent(admin, {}, {}, { id: String(reg1.id) }, 'POST'))
    assert.equal(restoreRes.error, null)

    // 恢复后重新出现在正常列表中
    const restoredList: any = await regListHandler(makeEvent(cashier, {}, { q: orderNo1 }, {}, 'GET'))
    assert.ok(restoredList.data.list.some((r: any) => r.id === reg1.id))

    // 10. 历史预售隔离测试：在测试内部自建独立测试 Order，严禁碰触数据库中任何真实历史数据
    const testHistOrder = await prisma.order.create({
      data: {
        orderNo: `${TEST_PREFIX}_HIST_ORD`,
        orderType: 'preorder',
        status: 'pending',
        fulfillmentStatus: 'pending',
        totalAmount: 100,
        paidAmount: 50,
        owedAmount: 50,
      },
    })
    createdOrderIds.push(testHistOrder.id)

    // 测试历史预售纯只读查询
    const oldDetail: any = await oldPreorderGetHandler(makeEvent(cashier, {}, {}, { id: String(testHistOrder.id) }, 'GET'))
    assert.equal(oldDetail.error, null)
    const dbPreorder = await prisma.order.findUniqueOrThrow({ where: { id: testHistOrder.id } })
    assert.equal(dbPreorder.reminderUpdatedAt?.getTime(), testHistOrder.reminderUpdatedAt?.getTime())

    // 测试历史预售移入回收站（管理员）与恢复
    const oldTrashRes: any = await oldPreorderTrashHandler(makeEvent(admin, {}, {}, { id: String(testHistOrder.id) }, 'POST'))
    assert.equal(oldTrashRes.error, null)
    const oldRestoreRes: any = await oldPreorderRestoreHandler(makeEvent(admin, {}, {}, { id: String(testHistOrder.id) }, 'POST'))
    assert.equal(oldRestoreRes.error, null)

    // 11. 历史预售写接口彻底封锁测试（修改、制作推进、加急均返回 403）
    await assert.rejects(
      oldPreorderPutHandler(makeEvent(admin, {}, {}, { id: String(testHistOrder.id) }, 'PUT')),
      (err: any) => err.statusCode === 403
    )
    await assert.rejects(
      oldPreorderAdvanceHandler(makeEvent(admin, { to: 'in_production' }, {}, { id: String(testHistOrder.id) }, 'POST')),
      (err: any) => err.statusCode === 403
    )
    await assert.rejects(
      oldPreorderMadeHandler(makeEvent(admin, { isMade: true }, {}, { id: String(testHistOrder.id) }, 'PATCH')),
      (err: any) => err.statusCode === 403
    )
    await assert.rejects(
      oldPreorderUrgentHandler(makeEvent(admin, { isUrgent: true }, {}, { id: String(testHistOrder.id) }, 'PATCH')),
      (err: any) => err.statusCode === 403
    )

    // 12. 验证新预售流程对销售订单、库存批次流水与财务账户绝对零污染
    // （在排除本测试显式自建的独立测试历史单前提下）
    const finalOrderCount = await prisma.order.count({ where: { id: { notIn: createdOrderIds } } })
    const finalMovementCount = await prisma.stockMovement.count()
    const finalAccountEntryCount = await prisma.customerAccountEntry.count()

    assert.equal(finalOrderCount, initOrderCount, '预售自由登记全生命周期不得创建任何销售订单')
    assert.equal(finalMovementCount, initMovementCount, '预售自由登记全生命周期不得变动任何库存批次流水')
    assert.equal(finalAccountEntryCount, initAccountEntryCount, '预售自由登记全生命周期不得产生任何账务账户流水')
  } finally {
    // 彻底清理测试产生的全部数据与临时文件，做到绝对零污染
    if (createdRegistrationIds.length > 0) {
      await prisma.preorderRegistrationItem.deleteMany({
        where: { registrationId: { in: createdRegistrationIds } },
      })
      await prisma.preorderRegistration.deleteMany({
        where: { id: { in: createdRegistrationIds } },
      })
    }

    if (createdOrderIds.length > 0) {
      await prisma.fulfillmentEvent.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      })
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      })
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      })
    }

    // 清理创建的幂等记录
    await prisma.operation.deleteMany({
      where: { id: { contains: TEST_PREFIX } },
    })

    // 清理创建的隔离用户
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      })
    }

    // 清理测试上传的磁盘文件
    for (const imgUrl of createdImageFiles) {
      try {
        const fname = imgUrl.replace('/preorder-images/', '')
        const p = preorderImagePath(fname)
        if (p) await unlink(p).catch(() => {})
      } catch {}
    }
  }
})

