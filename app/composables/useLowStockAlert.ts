import { Modal } from 'ant-design-vue'
import { h } from 'vue'

/**
 * 低库存弹窗提醒
 * - 同一会话只弹一次（sessionStorage 去重）
 * - POS 首页 & 后台首页 onMounted 时调用
 */
export function useLowStockAlert() {
  const STORAGE_KEY = 'lowStockAlertShown'

  const checkLowStock = async (opts: { force?: boolean; target?: string } = {}) => {
    if (!import.meta.client) return
    if (!opts.force && sessionStorage.getItem(STORAGE_KEY) === '1') return

    try {
      const { data }: any = await $fetch('/api/stocks/stocktake/summary')
      if (!data || !data.lowStockCount) return

      const lowItems = (data.items || []).filter((it: any) => it.isLow)
      if (lowItems.length === 0) return

      sessionStorage.setItem(STORAGE_KEY, '1')

      Modal.warning({
        title: `⚠️ 库存偏低提示（共 ${data.lowStockCount} 项）`,
        width: 520,
        content: h(
          'div',
          { style: 'max-height:320px;overflow:auto;' },
          [
            h(
              'p',
              { style: 'color:#6b7280;margin-bottom:8px;' },
              `低于阈值（${data.threshold}）的商品：`,
            ),
            h(
              'ul',
              { style: 'padding-left:20px;margin:0;' },
              lowItems.map((it: any) =>
                h('li', { style: 'margin-bottom:4px;' }, [
                  h('span', { style: 'font-weight:600;' }, it.name),
                  h(
                    'span',
                    { style: 'color:#ef4444;margin-left:8px;' },
                    `剩余 ${it.totalStock} ${it.baseUnit || ''}`,
                  ),
                ]),
              ),
            ),
          ],
        ),
        okText: '去盘点',
        onOk: () => navigateTo(opts.target || '/stocks/stocktake'),
      })
    } catch (e) {
      console.warn('[lowStockAlert] fetch failed', e)
    }
  }

  const resetAlert = () => {
    if (import.meta.client) sessionStorage.removeItem(STORAGE_KEY)
  }

  return { checkLowStock, resetAlert }
}
