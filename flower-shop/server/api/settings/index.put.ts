import { prisma } from '../../utils/prisma'
import { getCurrentUser } from '../../utils/auth'

/**
 * 批量更新全局设置
 * body: { key: string, value: string }[]
 * 仅 admin / staff 可写
 */
export default defineEventHandler(async (event) => {
  const payload = getCurrentUser(event)
  if (!payload || payload.type !== 'staff' || payload.role === 'cashier') {
    return { data: null, error: { message: '权限不足', code: 'FORBIDDEN' } }
  }

  const body = await readBody<Array<{ key: string; value: string }>>(event)
  if (!Array.isArray(body) || body.length === 0) {
    return { data: null, error: { message: '请求体必须是非空数组', code: 'BAD_PARAMS' } }
  }

  for (const it of body) {
    if (!it.key || typeof it.value !== 'string') {
      return { data: null, error: { message: `字段错误：${JSON.stringify(it)}`, code: 'BAD_PARAMS' } }
    }
  }

  try {
    await prisma.$transaction(
      body.map((it) =>
        prisma.setting.upsert({
          where: { key: it.key },
          update: { value: it.value },
          create: { key: it.key, value: it.value },
        }),
      ),
    )
    const all = await prisma.setting.findMany()
    const map: Record<string, string> = {}
    for (const r of all) map[r.key] = r.value
    return { data: map, error: null }
  } catch (e: any) {
    return { data: null, error: { message: e.message || '保存失败', code: 'SAVE_ERROR' } }
  }
})
