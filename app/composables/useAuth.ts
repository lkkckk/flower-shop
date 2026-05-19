import { message } from 'ant-design-vue'

export interface StaffUser {
  id: number
  username: string
  name: string
  role: string // 'admin' | 'staff' | 'cashier'
  status?: string
}

export type LoginScope = 'admin' | 'pos'

export interface LoginOptions {
  scope?: LoginScope // 兼容旧调用；权限仅由账号角色决定
  silent?: boolean // 不显示 message 提示
}

/**
 * 员工鉴权状态
 * - token 持久化 1 天，admin/staff/cashier 统一过期策略
 * - user 使用 useState 跨组件共享
 * - 统一从 /login 登录，权限由 user.role 决定
 */
export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  })
  const user = useState<StaffUser | null>('auth_user', () => null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isCashier = computed(() => user.value?.role === 'cashier')
  // isAdmin：admin 或 staff 均有管理后台访问权（注意：user management 等敏感操作另用 isStrictAdmin）
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'staff')
  // isStrictAdmin：仅限 admin 角色，用于用户管理、高级设置
  const isStrictAdmin = computed(() => user.value?.role === 'admin')

  const clearAuthState = () => {
    token.value = null
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_user')
    }
  }

  const redirectToLogin = async (redirect?: string) => {
    const target = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
    await navigateTo(target)
  }

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
    if (!token.value) {
      clearAuthState()
      return false
    }
    try {
      const res: any = await $fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      const currentUser = res.data?.user
      if (res.error || !currentUser || res.data.type !== 'staff' || currentUser.status !== 'active') {
        clearAuthState()
        return false
      }
      user.value = currentUser
      return true
    } catch {
      clearAuthState()
      return false
    }
  }

  /**
   * 退出登录
   */
  const logout = async (_scope?: LoginScope) => {
    clearAuthState()
    await redirectToLogin()
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
    clearAuthState,
    redirectToLogin,
  }
}
