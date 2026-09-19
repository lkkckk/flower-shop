import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultPrinterSettings, normalizePrinterSettings, parsePrinterSettings, PRINTER_SETTINGS_KEY } from '../app/utils/printing/settings'
import { renderSaleReceipt } from '../app/utils/printing/saleReceipt'
import { renderPreorderReceipt } from '../app/utils/printing/preorderReceipt'
import { qzPrintPayload } from '../app/utils/printing/qz'

test('terminal printer configuration round trip and corrupt fallback', () => {
  assert.equal(PRINTER_SETTINGS_KEY, 'flower-shop-printer-settings-v1')
  assert.deepEqual(defaultPrinterSettings(), { mode: 'browser', printerName: '', paperWidth: 58, copies: 1, autoPrintPos: false })
  const settings = { mode: 'qz', printerName: 'POS-80', paperWidth: 80, copies: 2, autoPrintPos: true } as const
  assert.deepEqual(parsePrinterSettings(JSON.stringify(settings)), settings)
  assert.deepEqual(parsePrinterSettings('{broken'), defaultPrinterSettings())
  assert.deepEqual(normalizePrinterSettings({ mode: 'raw', paperWidth: 100, copies: -1, autoPrintPos: 'yes' }), defaultPrinterSettings())
  assert.equal(normalizePrinterSettings({ copies: 11 }).copies, 1)
})
test('sale receipt preserves accounting snapshots and escapes all user content', () => {
  const attack = '<script>alert(1)</script>'
  const html = renderSaleReceipt({ orderNo: attack, createdAt: '2026-09-19T02:20:00Z', customer: { name: attack, phone: attack }, deliveryAddress: attack, deliveryTime: '2026-09-20', notes: attack, fulfillmentStatus: 'cancelled', totalAmount: '396.50', paidAmount: '300.00', owedAmount: '90.00', pointsDiscount: '6.50', refundedAmount: '20.00', items: [{ productNameSnapshot: attack, product: { name: '不得使用修改后的商品名' }, variantLabel: '热／900ml', qty: '2.000', unit: '杯', grade: attack, unitPrice: '198.25', subtotal: '396.50', returnedQty: '1.000' }] }, attack, 58)
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  for (const text of ['热／900ml', '已退', '¥198.25', '¥396.50', '¥300.00', '¥90.00', '¥6.50', '¥20.00', '订单已作废', 'box-sizing:border-box', 'width:58mm']) assert.ok(html.includes(text), text)
  assert.ok(!html.includes('不得使用修改后的商品名'))
})
test('preorder receipt uses line amount once, no images or invented accounting fields', () => {
  const html = renderPreorderReceipt({ orderNo: 'ABC', contactPhone: '13800000000', createdAt: '2026-09-19', deliveryTime: '2026-09-21', notes: '<img src=x onerror=alert(1)>', cardMessage: '生日快乐', items: [{ name: '玫瑰花束', qty: 1, amount: '268.00', photos: [{ url: '/uploads/a.png' }] }, { name: '百合花束', qty: 2, amount: '128.50', photos: [] }] }, '花店', 80)
  for (const text of ['ABC', '13800000000', '玫瑰花束', '生日快乐', '订单金额：', '¥396.50', 'width:80mm']) assert.ok(html.includes(text), text)
  for (const text of ['<img', '/uploads/a.png', '已付', '欠款', '支付方式']) assert.ok(!html.includes(text), text)
  const historical = renderPreorderReceipt({ items: [{ name: '历史商品', qty: 2, amount: null }] }, '花店', 58)
  assert.ok(historical.includes('未填写'))
  assert.ok(!historical.includes('¥0.00'))
})
test('QZ HTML payload uses inches only for pageWidth and retains driver height', () => {
  const payload = qzPrintPayload('<html>safe</html>', { ...defaultPrinterSettings(), paperWidth: 80, copies: 3 })
  assert.equal(payload.data[0]?.options.pageWidth, 80 / 25.4)
  assert.equal(payload.data[0]?.type, 'pixel')
  assert.equal(payload.data[0]?.format, 'html')
  assert.equal(payload.data[0]?.flavor, 'plain')
  assert.deepEqual(payload.config, { units: 'mm', margins: 0, copies: 3, scaleContent: false })
  assert.ok(!('size' in payload.config))
})
