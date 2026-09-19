import type { PrinterSettings } from './settings'

export interface QzSecurityHooks {
  certificatePromise?: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void
  signaturePromise?: (payload: string) => (resolve: (signature: string) => void, reject: (error: unknown) => void) => void
}
let client: any
let connecting: Promise<void> | null = null
let securityHooks: QzSecurityHooks = {}
// Hooks must call a trusted signing service; never include a private key in this client.
export function configureQzSecurity(hooks: QzSecurityHooks) {
  if (client) throw new Error('请在连接打印服务之前配置签名服务')
  securityHooks = hooks
}
async function getClient() {
  if (typeof window === 'undefined') throw new Error('打印服务仅可在浏览器中使用')
  if (!client) {
    const module = await import('qz-tray')
    client = module.default || module
    if (securityHooks.certificatePromise) client.security.setCertificatePromise(securityHooks.certificatePromise)
    if (securityHooks.signaturePromise) client.security.setSignaturePromise(securityHooks.signaturePromise)
  }
  return client
}
export const isQzConnected = () => !!client?.websocket.isActive()
export async function connectQz() {
  const qz = await getClient()
  if (qz.websocket.isActive()) return
  if (!connecting) connecting = qz.websocket.connect().catch(() => { throw new Error('未检测到系统打印服务，请启动/安装 QZ Tray，或使用浏览器打印。') }).finally(() => { connecting = null })
  await connecting
}
export async function disconnectQz() {
  const qz = await getClient()
  if (connecting) await connecting
  if (qz.websocket.isActive()) await qz.websocket.disconnect()
}
export async function listQzPrinters(): Promise<string[]> {
  await connectQz()
  const printers = await client.printers.find()
  return Array.isArray(printers) ? printers : printers ? [printers] : []
}
export async function findQzPrinter(name: string): Promise<string> {
  const printers = await listQzPrinters()
  if (!name || !printers.includes(name)) throw new Error('请选择有效打印机')
  return name
}
export function qzPrintPayload(html: string, settings: PrinterSettings) {
  return {
    config: { units: 'mm', margins: 0, copies: settings.copies, scaleContent: false },
    data: [{ type: 'pixel', format: 'html', flavor: 'plain', data: html, options: { pageWidth: settings.paperWidth / 25.4 } }],
  }
}
export async function printQzHtml(html: string, settings: PrinterSettings) {
  const printer = await findQzPrinter(settings.printerName)
  const payload = qzPrintPayload(html, settings)
  await client.print(client.configs.create(printer, payload.config), payload.data)
}
