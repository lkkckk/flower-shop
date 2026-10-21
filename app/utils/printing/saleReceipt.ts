import { amountString, decimal } from '../../../shared/money'
import { escapeHtml } from './escapeHtml'
import { line, receiptDate, receiptDocument } from './document'

const currency = (value: unknown) => `¥${amountString(value ?? 0)}`
const positive = (value: unknown) => decimal(value ?? 0).gt(0)
export function renderSaleReceipt(order: any, shopName: string, paperWidth: 58 | 80): string {
  const items = (order.items || []).map((item: any) => {
    const name = escapeHtml(item.productNameSnapshot || item.product?.name || '')
    const variant = item.variantLabel ? `<div class="sale-item-detail">${escapeHtml(item.variantLabel)}</div>` : ''
    const returned = positive(item.returnedQty) ? `<div class="sale-item-detail">已退 ${escapeHtml(`${decimal(item.returnedQty).toString()}${item.unit || ''}`)}</div>` : ''
    return `<tr class="sale-item"><td><div class="sale-item-name">${name}</div>${variant}${returned}</td><td>${escapeHtml(`${decimal(item.qty ?? 0).toString()}${item.unit || ''}`)}</td><td>${escapeHtml(amountString(item.unitPrice ?? 0))}</td><td>${escapeHtml(amountString(item.subtotal ?? 0))}</td></tr>`
  }).join('')
  const table = `<table class="sale-items"><colgroup><col style="width:40%"><col style="width:14%"><col style="width:23%"><col style="width:23%"></colgroup><thead><tr><th scope="col">品名</th><th scope="col">数量</th><th scope="col">单价</th><th scope="col">金额</th></tr></thead><tbody>${items}</tbody></table>`
  const customer = order.customer?.name && order.customer.name !== '散客' ? line('客户：', order.customer.name) : ''
  return receiptDocument(`小票 ${order.orderNo}`, shopName, `${line('单号：', order.orderNo)}${line('时间：', receiptDate(order.createdAt))}${customer}${order.customer?.phone ? line('电话：', order.customer.phone) : ''}${order.deliveryTime ? line('配送时间：', receiptDate(order.deliveryTime)) : ''}${order.deliveryAddress ? line('配送地址：', order.deliveryAddress) : ''}${table}<div class="total">${line('合计：', currency(order.totalAmount))}</div>${line('已收：', currency(order.paidAmount))}${positive(order.pointsDiscount) ? line('已含积分抵扣：', currency(order.pointsDiscount)) : ''}${positive(order.refundedAmount) ? line('已退款：', currency(order.refundedAmount)) : ''}${positive(order.owedAmount) ? line('欠款：', currency(order.owedAmount)) : ''}${order.fulfillmentStatus === 'cancelled' ? '<strong>订单已作废</strong>' : ''}${order.notes ? `<div class="notes">备注：${escapeHtml(order.notes)}</div>` : ''}<div class="footer">谢谢惠顾</div>`, paperWidth, 'sale')
}
