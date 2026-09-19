import { formatRegistrationAmount, sumRegistrationAmounts } from '../../../shared/preorderMoney'
import { escapeHtml } from './escapeHtml'
import { line, receiptDate, receiptDocument } from './document'

export function renderPreorderReceipt(registration: any, shopName: string, paperWidth: 58 | 80): string {
  const items = registration.items || []
  const body = `<div class="title">预售登记</div>${line('订单编号：', registration.orderNo)}${line('登记时间：', receiptDate(registration.createdAt))}${line('联系电话：', registration.contactPhone || '未填写')}${line('取花/送花时间：', receiptDate(registration.deliveryTime))}<div class="divider"></div>${items.map((item: any) => `<section class="item"><div class="item-name">${escapeHtml(item.name)}</div>${line('数量：', item.qty)}${line('金额：', formatRegistrationAmount(item.amount))}</section>`).join('')}<div class="divider"></div><div class="total">${line('订单金额：', formatRegistrationAmount(sumRegistrationAmounts(items)))}</div>${registration.notes ? `<div class="notes">备注：\n${escapeHtml(registration.notes)}</div>` : ''}${registration.cardMessage ? `<div class="notes">贺卡：\n${escapeHtml(registration.cardMessage)}</div>` : ''}<div class="divider"></div><div class="footer">请凭本单信息核对预订内容</div>`
  return receiptDocument(`预售登记 ${registration.orderNo}`, shopName, body, paperWidth)
}
