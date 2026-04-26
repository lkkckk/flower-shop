import { message } from 'ant-design-vue'

export interface StaffUser {
  id: number
  username: string
  name: string
  role: string // 'admin' | 'staff' | 'cashier'
}

export type LoginScope = 'admin' | 'pos'

export interface LoginOptions {
  scope?: LoginScope // 兼容旧调用；权限仅由账号角色决定
  silent?: boolean // 不显示 message 提示
}

/**
 * 员工鉴权状态
 * - token 持久化在 useCookie('auth_token')
 * - user 使用 useState 跨组件共享
 * - 统一从 /login 登录，权限由 user.role 决定
 */
export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 天
    sameSite: 'lax',
  })
  const user = useState<StaffUser | null>('auth_user', () => null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isCashier = computed(() => user.value?.role === 'cashier')
  // isAdmin：admin 或 staff 均有管理后台访问权（注意：user management 等敏感操作另用 isStrictAdmin）
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'staff')
  // isStrictAdmin：仅限 admin 角色，用于用户管理、高级设置
  const isStrictAdmin = computed(() => user.value?.role === 'admin')

  const login = async (
    username: string,
    password: string,
    opts: LoginOptions = {},
  ): Promise<boolean> => {
    const { silent = false } = opts
    try {
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      if (res.error) {
        if (!silent) message.error(res.error.message || '登录失败')
        return false
      }
      token.value = res.data.token
      user.value = res.data.user
      if (!silent) message.success('登录成功')
      return true
    } catch (e: any) {
      if (!silent) message.error(e.data?.message || e.message || '登录失败')
      return false
    }
  }

  const fetchMe = async (): Promise<boolean> => {
    if (!token.value) return false
    try {
      const res: any = await $fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (res.error || !res.data || res.data.type !== 'staff') {
        logout()
        return false
      }
      user.value = res.data.user
      return true
    } catch {
      logout()
      return false
    }
  }

  /**
   * 退出登录
   */
  const logout = async (_scope?: LoginScope) => {
    token.value = null
    user.value = null
    await navigateTo('/login')
  }

  return {
    token,
    user,
    isLoggedIn,
    isCashier,
    isAdmin,
    isStrictAdmin,
    login,
    logout,
    fetchMe,
  }
}
