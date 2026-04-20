import { message } from 'ant-design-vue'

export interface StaffUser {
  id: number
  username: string
  name: string
  role: string // 'admin' | 'staff' | 'cashier'
}

export type LoginScope = 'admin' | 'pos'

export interface LoginOptions {
  scope?: LoginScope
  silent?: boolean // 不显示 message 提示
}

/**
 * 收银台/后台鉴权状态
 * - token 持久化在 useCookie('auth_token')
 * - user 使用 useState 跨组件共享
 * - scope 区分：POS 登录（允许 cashier）与 后台登录（不允许 cashier）
 */
export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 天
    sameSite: 'lax',
  })
  const user = useState<StaffUser | null>('auth_user', () => null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isCashier = computed(() => user.value?.role === 'cashier')
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'staff')

  const login = async (
    username: string,
    password: string,
    opts: LoginOptions = {},
  ): Promise<boolean> => {
    const { scope = 'admin', silent = false } = opts
    try {
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { username, password, scope },
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
   * @param scope 若提供，跳转到对应的登录页；否则由调用方自行 navigateTo
   */
  const logout = async (scope?: LoginScope) => {
    token.value = null
    user.value = null
    if (scope === 'pos') {
      await navigateTo('/pos/login')
    } else if (scope === 'admin') {
      await navigateTo('/login')
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isCashier,
    isAdmin,
    login,
    logout,
    fetchMe,
  }
}
