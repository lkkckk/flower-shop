export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false, closed = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else field += c
    } else if (c === '"') {
      if (field || closed) throw new Error('CSV 引号位置不合法')
      quoted = true
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field); field = ''; closed = false
      if (c !== ',') {
        if (row.some(v => v !== '')) rows.push(row)
        row = []
        if (c === '\r' && text[i + 1] === '\n') i++
      }
    } else {
      if (closed) throw new Error('CSV 结束引号后只能是分隔符')
      field += c
    }
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  row.push(field)
  if (row.some(v => v !== '')) rows.push(row)
  const headers = rows.shift()?.map(h => h.trim())
  if (!headers?.length || headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error('CSV 表头为空或重复')
  return rows.map((r, index) => {
    if (r.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 行列数不匹配`)
    return Object.fromEntries(headers.map((h, i) => [h, r[i].trim()]))
  })
}
export function makeCsv(rows: Record<string, any>[], headers = Object.keys(rows[0] || {})) {
  const quote = (v: any) => {
    let text = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [headers.map(quote).join(','), ...rows.map(r => headers.map(h => quote(r[h])).join(','))].join('\r\n')
}
