export interface PrinterSettings {
  mode: 'browser' | 'qz'
  printerName: string
  paperWidth: 58 | 80
  copies: number
  autoPrintPos: boolean
}
export const PRINTER_SETTINGS_KEY = 'flower-shop-printer-settings-v1'
export const defaultPrinterSettings = (): PrinterSettings => ({ mode: 'browser', printerName: '', paperWidth: 58, copies: 1, autoPrintPos: false })
export function normalizePrinterSettings(value: unknown): PrinterSettings {
  const v = value && typeof value === 'object' ? value as Partial<PrinterSettings> : {}
  return {
    mode: v.mode === 'qz' ? 'qz' : 'browser',
    printerName: typeof v.printerName === 'string' ? v.printerName.trim() : '',
    paperWidth: v.paperWidth === 80 ? 80 : 58,
    copies: Number.isInteger(v.copies) && v.copies! >= 1 && v.copies! <= 10 ? v.copies! : 1,
    autoPrintPos: v.autoPrintPos === true,
  }
}
export function parsePrinterSettings(raw: string | null): PrinterSettings {
  try { return normalizePrinterSettings(JSON.parse(raw || 'null')) } catch { return defaultPrinterSettings() }
}
