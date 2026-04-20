/**
 * 浏览器原生 CSV 导出（无依赖）
 * - 中文加 \uFEFF BOM，防止 Excel 打开乱码
 * - 自动转义包含逗号/引号/换行的字段
 */

const escapeCell = (val: any): string => {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const useExport = () => {
  const exportToCsv = (
    filename: string,
    headers: string[],
    rows: Array<Array<any>>
  ) => {
    const lines: string[] = []
    lines.push(headers.map(escapeCell).join(','))
    for (const row of rows) {
      lines.push(row.map(escapeCell).join(','))
    }

    const csvContent = '\uFEFF' + lines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return { exportToCsv }
}
