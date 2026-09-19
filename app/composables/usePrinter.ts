import { onMounted } from 'vue'
import { resolveShopName } from '../../shared/shopIdentity'
import { defaultPrinterSettings, normalizePrinterSettings, parsePrinterSettings, PRINTER_SETTINGS_KEY, type PrinterSettings } from '../utils/printing/settings'
import { renderSaleReceipt } from '../utils/printing/saleReceipt'
import { renderPreorderReceipt } from '../utils/printing/preorderReceipt'
import { printBrowserHtml } from '../utils/printing/browser'
import { connectQz, disconnectQz, isQzConnected, listQzPrinters, findQzPrinter, printQzHtml } from '../utils/printing/qz'

export type PrintResult = { backend: 'browser'; status: 'dialog-opened' } | { backend: 'qz'; status: 'submitted' }
export interface PrintOptions { forceBrowser?: boolean; paperWidth?: 58 | 80 }
export function usePrinter() {
  const settings = useState<PrinterSettings>('terminal-printer-settings', defaultPrinterSettings)
  onMounted(() => {
    try { settings.value = parsePrinterSettings(localStorage.getItem(PRINTER_SETTINGS_KEY)) } catch { settings.value = defaultPrinterSettings() }
  })
  function saveSettings(patch: Partial<PrinterSettings>) {
    const next = normalizePrinterSettings({ ...settings.value, ...patch })
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(next)) } catch { throw new Error('无法保存本机打印设置，请检查浏览器存储权限') }
    }
    settings.value = next
  }
  async function getShopName() {
    const response: any = await $fetch('/api/settings')
    if (!response.data || response.error) throw new Error('店铺名称加载失败，请重试')
    return resolveShopName(response.data)
  }
  async function send(html: string, options: PrintOptions = {}, override?: PrinterSettings): Promise<PrintResult> {
    const config = normalizePrinterSettings({ ...(override || settings.value), ...(options.paperWidth ? { paperWidth: options.paperWidth } : {}) })
    if (options.forceBrowser || config.mode === 'browser') {
      await printBrowserHtml(html, config.copies)
      return { backend: 'browser', status: 'dialog-opened' }
    }
    await printQzHtml(html, config)
    return { backend: 'qz', status: 'submitted' }
  }
  async function printSaleReceipt(orderId: number, options: PrintOptions = {}) {
    if (!Number.isSafeInteger(orderId) || orderId < 1) throw new Error('订单尚未保存，无法打印')
    const [response, shopName]: any = await Promise.all([$fetch(`/api/orders/${orderId}`), getShopName()])
    if (!response.data || response.error) throw new Error('订单加载失败，无法打印')
    return send(renderSaleReceipt(response.data, shopName, options.paperWidth || settings.value.paperWidth), options)
  }
  async function printPreorderReceipt(registrationId: number, options: PrintOptions = {}) {
    if (!Number.isSafeInteger(registrationId) || registrationId < 1) throw new Error('预售登记尚未保存，无法打印')
    const [response, shopName]: any = await Promise.all([$fetch(`/api/preorder-registrations/${registrationId}`), getShopName()])
    if (!response.data || response.error) throw new Error('预售登记加载失败，无法打印')
    return send(renderPreorderReceipt(response.data, shopName, options.paperWidth || settings.value.paperWidth), options)
  }
  async function testPrint(draft?: PrinterSettings, options: PrintOptions = {}) {
    const config = normalizePrinterSettings(draft || settings.value)
    const html = renderPreorderReceipt({ orderNo: '测试小票（非业务单据）', createdAt: new Date().toISOString(), items: [{ name: '打印测试：中文、长商品名称与金额', qty: 1, amount: '0.00' }] }, await getShopName(), config.paperWidth)
    return send(html, options, config)
  }
  return { settings, saveSettings, connect: connectQz, disconnect: disconnectQz, isConnected: isQzConnected, listPrinters: listQzPrinters, findPrinter: findQzPrinter, testPrint, printSaleReceipt, printPreorderReceipt }
}
