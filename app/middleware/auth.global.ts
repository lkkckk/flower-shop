/**
 * 全局路由守卫（统一入口）：
 * - 登录入口：/login
 * - 未登录：访问任意受保护页 → /login
 * - 已登录访问登录页：cashier → /pos；admin/staff → /
 * - cashier 的业务 API 权限由服务端兜底，前端只隐藏完整后台入口
 */
const PUBLIC_PATHS = new Set(['/login'])
const CASHIER_ALLOWED_PREFIXES = [
  '/pos',
  '/customers',
  '/products',
  '/notifications',
]

const isPublicPath = (path: string) => PUBLIC_PATHS.has(path)

const isCashierRouteAllowed = (path: string) => {
  if (/^\/orders\/\d+\/print$/.test(path)) return true
  if (/^\/preorders\/\d+\/delivery-slip$/.test(path)) return true
  return CASHIER_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { token, user, fetchMe, isCashier } = useAuth()
  const isLoginPage = isPublicPath(to.path)

  if (!token.value) {
    user.value = null
  }

  // 已有 token 时，每次进入受保护页都走 /api/auth/me 校验，避免过期/禁用/权限变化的旧 token 停留在内页。
  if (token.value && !isLoginPage) {
    await fetchMe()
  } else if (token.value && !user.value) {
    await fetchMe()
  }

  const loggedIn = Boolean(token.value && user.value)

  // 已登录访问登录页
  if (loggedIn && isLoginPage) {
    if (isCashier.value) return navigateTo('/pos')
    return navigateTo('/')
  }

  // 未登录访问受保护页
  if (!loggedIn && !isLoginPage) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // 收银员不能进入后台首页、报表、设置等管理页，避免页面挂载后触发一批 403 API。
  if (loggedIn && isCashier.value && !isLoginPage && !isCashierRouteAllowed(to.path)) {
    return navigateTo('/pos')
  }
})
