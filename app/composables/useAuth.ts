import { message } from 'ant-design-vue'

export interface StaffUser {
  id: number
  username: string
  name: string
  role: string
}

/**
 * 收银台/后台鉴权状态
 * - token 持久化在 useCookie('auth_token')
 * - user 使用 useState 跨组件共享
 */
export const useAuth = () => {
  // useCookie 在 server/client 都可用，自动同步
  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 天
    sameSite: 'lax',
  })
  const user = useState<StaffUser | null>('auth_user', () => null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      if (res.error) {
        message.error(res.error.message || '登录失败')
        return false
      }
      token.value = res.data.token
      user.value = res.data.user
      message.success('登录成功')
      return true
    } catch (e: any) {
      message.error(e.data?.message || e.message || '登录失败')
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

  const logout = () => {
    token.value = null
    user.value = null
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    logout,
    fetchMe,
  }
}
