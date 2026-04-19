/**
 * 全局 $fetch 拦截器：
 * - 自动把 auth_token cookie 加到 Authorization 头
 * - 401 响应清空 token 并跳转 /login
 *
 * 通过覆盖 globalThis.$fetch，让所有 useXxx composable 自动带上 token
 * 无需逐个改造。
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
    onResponseError({ response }) {
      // 未登录 / token 过期 → 跳转登录
      if (response?.status === 401) {
        const token = useCookie<string | null>('auth_token')
        const user = useState<any>('auth_user')
        token.value = null
        user.value = null

        // 避免登录页内部调接口导致死循环
        if (import.meta.client) {
          try {
            const route = useRoute()
            const isLoginPage = route.path === '/login' || route.path === '/pos/login'
            if (!isLoginPage) {
              // POS 相关路径跳 POS 登录，其余跳管理登录
              const loginPath = route.path.startsWith('/pos') ? '/pos/login' : '/login'
              return navigateTo(`${loginPath}?redirect=${encodeURIComponent(route.fullPath)}`)
            }
          } catch {
            // useRoute 可能在某些上下文不可用，静默忽略
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
