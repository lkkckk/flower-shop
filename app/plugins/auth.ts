import { message } from 'ant-design-vue'

const resolveRequestPath = (request: unknown) => {
  if (typeof request !== 'string') return ''
  try {
    return request.startsWith('http') ? new URL(request).pathname : request.split('?')[0]
  } catch {
    return request
  }
}

const clearClientAuth = () => {
  const token = useCookie<string | null>('auth_token')
  const user = useState<any>('auth_user')
  token.value = null
  user.value = null
  if (import.meta.client) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
  }
}

const redirectToLogin = async () => {
  if (!import.meta.client) return
  const route = useRoute()
  if (route.path === '/login') return
  await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
}

const notifyAuthError = (content: string) => {
  const authErrorMessageShown = useState<boolean>('auth_error_message_shown', () => false)
  if (!import.meta.client || authErrorMessageShown.value) return
  authErrorMessageShown.value = true
  message.warning(content)
  window.setTimeout(() => {
    authErrorMessageShown.value = false
  }, 1200)
}

/**
 * 全局 $fetch 拦截器：
 * - 自动把 auth_token cookie 加到 Authorization 头
 * - 401 / auth 自检 403：清空登录态并跳转 /login
 * - 其他 403：提示无权限；cashier 停留在管理页时退回 /pos
 *
 * 通过覆盖 globalThis.$fetch，让所有 useXxx composable 自动带上 token。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const originalFetch = globalThis.$fetch

  const wrappedFetch = originalFetch.create({
    onRequest({ options }) {
      // 使用 useCookie 拿 token（与 useAuth 一致）
      const token = useCookie<string | null>('auth_token').value
      if (token) {
        options.headers = new Headers(options.headers || {})
        if (!options.headers.has('Authorization')) {
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    },
    async onResponseError({ request, response }) {
      const requestPath = resolveRequestPath(request)
      // 未登录 / token 过期 → 跳转登录
      if (response?.status === 401) {
        clearClientAuth()
        await redirectToLogin()
        return
      }

      if (response?.status === 403) {
        const isAuthCheck = requestPath === '/api/auth/me'
        if (isAuthCheck) {
          clearClientAuth()
          await redirectToLogin()
          return
        }

        notifyAuthError('无权限访问该功能')
        if (import.meta.client) {
          const route = useRoute()
          const user = useState<any>('auth_user')
          const isCashier = user.value?.role === 'cashier'
          if (isCashier && route.path !== '/pos' && !route.path.startsWith('/pos/')) {
            await navigateTo('/pos')
          }
        }
      }
    },
  })

  // 覆盖全局 $fetch
  globalThis.$fetch = wrappedFetch as typeof $fetch
  nuxtApp.$fetch = wrappedFetch as any

  return {
    provide: {
      api: wrappedFetch,
    },
  }
})
