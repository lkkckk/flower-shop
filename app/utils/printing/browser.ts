// Keep the iframe alive until the native dialog closes; no popup is opened after an async fetch.
export async function printBrowserHtml(html: string, copies = 1): Promise<void> {
  if (typeof document === 'undefined') throw new Error('请在浏览器中打印')
  const frame = document.createElement('iframe')
  frame.title = '小票打印'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:600px;border:0'
  document.body.appendChild(frame)
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => { if (cleanupTimer) clearTimeout(cleanupTimer); frame.remove() }
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('小票加载超时，请重试')), 15000)
      frame.onload = () => { clearTimeout(timeout); resolve() }
      // Browser copy counts are represented by repeated documents. Select one copy in the native dialog.
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const receipt = doc.querySelector('.receipt')
      if (receipt) for (let i = 1; i < copies; i++) {
        const clone = receipt.cloneNode(true) as HTMLElement
        clone.style.breakBefore = 'page'
        doc.body.appendChild(clone)
      }
      frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML
    })
    const target = frame.contentWindow
    if (!target) throw new Error('无法打开打印预览')
    await frame.contentDocument?.fonts?.ready
    target.addEventListener('afterprint', cleanup, { once: true })
    cleanupTimer = setTimeout(cleanup, 10 * 60 * 1000)
    target.focus()
    target.print()
  } catch (error) { cleanup(); throw error }
}
