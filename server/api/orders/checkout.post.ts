import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cart = body.cart
  const payment = body.payment

  if (!cart || !payment) {
    throw createError({ statusCode: 400, message: '无效的请求数据' })
  }

  if (cart.items.length === 0) {
    throw createError({ statusCode: 400, message: '购物车为空' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 生成订单号
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const orderCount = await tx.order.count({
        where: { createdAt: { gte: todayStart } },
      })
      const orderNo = `O${dateStr}${(orderCount + 1).toString().padStart(4, '0')}`

      // 计算总价
      const subtotal = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
      const totalAmount = Math.max(0, subtotal - cart.discount)

      // 确定状态
      let status = 'pending'
      if (payment.paidAmount >= totalAmount && totalAmount > 0) status = 'paid'
      else if (payment.paidAmount > 0) status = 'partial'
      if (payment.method === 'credit' || payment.owedAmount === totalAmount) status = 'unpaid'
      // 兼容一些特殊状态组合
      if (payment.paidAmount >= totalAmount) status = 'paid'

      // 2. 创建主订单
      const order = await tx.order.create({
        data: {
          orderNo,
          orderType: 'retail', // 如果是批发客户可以改
          customerId: cart.customerId || null,
          totalAmount,
          paidAmount: payment.paidAmount,
          owedAmount: payment.owedAmount,
          status,
          notes: cart.notes,
        },
      })

      // 3 & 4. 扣除库存 + 记录流水 + 创建订单明细
      for (const item of cart.items) {
        let remainingQtyToDeduct = item.baseQty
        
        // 查找有库存的批次 (FIFO)
        const batches = await tx.stockBatch.findMany({
          where: {
            productId: item.productId,
            status: 'in_stock',
            currentQty: { gt: 0 }
          },
          orderBy: { inboundDate: 'asc' },
        })

        const itemTotalQty = remainingQtyToDeduct
        let deductedQtySoFar = 0

        for (const batch of batches) {
          if (remainingQtyToDeduct <= 0) break

          const qtyFromThisBatch = Math.min(batch.currentQty, remainingQtyToDeduct)
          
          remainingQtyToDeduct -= qtyFromThisBatch
          deductedQtySoFar += qtyFromThisBatch

          // 更新批次库存
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              currentQty: batch.currentQty - qtyFromThisBatch,
              status: (batch.currentQty - qtyFromThisBatch) <= 0 ? 'sold_out' : 'in_stock'
            }
          })

          // 记录库存流水
          await tx.stockMovement.create({
            data: {
              batchId: batch.id,
              type: 'sale',
              qtyChange: -qtyFromThisBatch,
              relatedOrderId: order.id,
              operator: 'system' // 或者当前登录用户
            }
          })
          
          // 为了简化，我们只创建一条整体的 OrderItem（也可按批次拆分多条 Item 以应对精细溯源）
          // 提示词推荐："如果跨批次，按批次拆成多个 OrderItem"。这里我们按批次分拆创建 OrderItem：
          // 单件在此批次的销售数量、单价
          // 需要还原到销售单位的价格和量（如果 1箱=20枝，这次扣了10枝，其实就是卖了0.5箱）
          const proportion = qtyFromThisBatch / itemTotalQty
          
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              batchId: batch.id,
              unit: item.unit,
              qty: item.qty * proportion,     // 换算到销售单位的数量
              baseQty: qtyFromThisBatch,      // 这次扣的基础数量
              unitPrice: item.unitPrice, 
              subtotal: item.subtotal * proportion,
            }
          })
        }

        // 如果所有批次找完，还需要扣除的数量 > 0，说明库存不足
        if (remainingQtyToDeduct > 0) {
          throw new Error(`商品【${item.productName}】剩余可用库存不足（还缺 ${remainingQtyToDeduct} 基础单位）`)
        }
      }

      // 5. 更新客户余额/欠款/积分
      if (cart.customerId) {
        const customerUpdate: any = {}
        if (payment.owedAmount > 0) {
          customerUpdate.balance = { decrement: payment.owedAmount }   // balance 负数代表欠款
          customerUpdate.totalOwed = { increment: payment.owedAmount } // 欠款总额增加
        }
        // 每消费 1 元积 1 分
        const earnedPoints = Math.floor(totalAmount)
        if (earnedPoints > 0) {
          customerUpdate.points = { increment: earnedPoints }
        }
        if (Object.keys(customerUpdate).length > 0) {
          await tx.customer.update({
            where: { id: cart.customerId },
            data: customerUpdate,
          })
        }
      }

      // 6. 创建 Payment 收款流水
      if (payment.paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            customerId: cart.customerId || null,
            amount: payment.paidAmount,
            paymentMethod: payment.method,
            type: 'income',
            operator: 'system' // 或者当前用户
          }
        })
      }

      return order
    })

    return {
      data: { order: result, message: '结账成功' },
      error: null
    }

  } catch (error: any) {
    setResponseStatus(event, 400)
    return {
      data: null,
      error: { message: error.message || '结账失败', code: 'CHECKOUT_FAILED' }
    }
  }
})
