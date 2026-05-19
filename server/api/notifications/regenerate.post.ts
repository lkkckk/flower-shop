import { generateNotifications } from '../../utils/notificationGenerator'

/** 手动触发通知扫描（admin 调试用） */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.type !== 'staff' || user.role !== 'admin') {
    return { data: null, error: { message: '仅管理员可操作', code: 'FORBIDDEN' } }
  }
  try {
    await generateNotifications()
    return { data: { success: true }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '通知生成失败', code: 'GENERATE_ERROR' },
    }
  }
})
