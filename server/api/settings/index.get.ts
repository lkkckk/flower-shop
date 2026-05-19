import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

/**
 * 读取全局设置
 * - admin/staff：返回全部
 * - cashier：仅返回 lowStockThreshold
 */
export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  const isCashier = payload?.type === 'staff' && payload?.role === 'cashier'

  try {
    const rows = isCashier
      ? await prisma.setting.findMany({ where: { key: 'lowStockThreshold' } })
      : await prisma.setting.findMany()

    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value

    // 补上默认值（防止数据库未初始化）
    const defaults: Record<string, string> = isCashier
      ? { lowStockThreshold: '20' }
      : {
          lowStockThreshold: '20',
          expiringDays: '3',
          debtOverdueDays: '30',
          safetyStockDays: '5',
          notificationQuietStart: '22:00',
          notificationQuietEnd: '08:00',
        }
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in map)) map[key] = value
    }

    return { data: map, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '读取设置失败', code: 'FETCH_ERROR' } }
  }
})
