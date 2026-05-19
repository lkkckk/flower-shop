import { generateNotifications } from '../utils/notificationGenerator'

/**
 * Nitro 服务启动时挂载的轻量定时器：
 *   - 启动后 60 秒首次扫描（避开冷启动竞争）
 *   - 之后每 30 分钟扫描一次
 *
 * 单实例部署，无需分布式锁；进程重启时定时器一并重置（依赖 dedupeKey 防止重复）
 */
const INTERVAL_MS = 30 * 60 * 1000
const FIRST_DELAY_MS = 60 * 1000

export default defineNitroPlugin(() => {
  if (process.env.NOTIFICATION_TICK_DISABLED === '1') return

  const safeRun = async () => {
    try {
      await generateNotifications()
    } catch (e) {
      // 静默 — 不阻塞主进程
      console.error('[notification-tick] failed:', e)
    }
  }

  setTimeout(() => {
    safeRun()
    setInterval(safeRun, INTERVAL_MS)
  }, FIRST_DELAY_MS)
})
