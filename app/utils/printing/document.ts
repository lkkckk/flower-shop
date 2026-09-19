import { escapeHtml } from './escapeHtml'

export function receiptDate(value: unknown): string {
  if (!value) return '未填写'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
export const line = (label: string, value: unknown) => `<div class="line"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`
export function receiptDocument(title: string, shopName: string, body: string, paperWidth: 58 | 80): string {
  const width = paperWidth === 80 ? 80 : 58
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:black;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;font-size:12px;line-height:1.5}body{width:${width}mm;max-width:100%}.receipt{width:${width}mm;max-width:100%;padding:3mm;overflow-wrap:anywhere}.shop-name{text-align:center;font-size:17px;font-weight:bold;margin:0 0 3mm;white-space:pre-wrap}.title{text-align:center;font-size:14px;margin-bottom:3mm}.divider{border-top:1px dashed black;margin:3mm 0}.line{display:flex;justify-content:space-between;gap:2mm}.line>span{min-width:0;overflow-wrap:anywhere}.item{break-inside:avoid;margin:3mm 0}.item-name{font-weight:bold;white-space:pre-wrap}.sub{font-size:11px}.total{font-weight:bold;font-size:14px}.notes{white-space:pre-wrap;margin-top:3mm}.footer{text-align:center;margin-top:5mm;font-size:11px}@media print{html,body{margin:0!important;padding:0!important}.receipt{margin:0}.line{break-inside:avoid}@page{margin:0;size:auto}}
</style></head><body><main class="receipt"><div class="shop-name">${escapeHtml(shopName)}</div>${body}</main></body></html>`
}
