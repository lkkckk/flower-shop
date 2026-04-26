/**
 * 全局路由守卫（统一入口）：
 * - 登录入口：/login
 * - 未登录：访问任意受保护页 → /login
 * - 已登录访问登录页：cashier → /pos；admin/staff → /
 * - cashier 的业务 API 权限由服务端兜底，前端只隐藏完整后台入口
 */
const PUBLIC_PATHS = new Set(['/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  const { token, user, fetchMe, isCashier } = useAuth()

  // 已有 token 但还没拉 user（首次加载/刷新）→ 拉一次
  if (token.value && !user.value) {
    await fetchMe()
  }

  const loggedIn = !!token.value && !!user.value
  const isLoginPage = PUBLIC_PATHS.has(to.path)

  // 已登录访问登录页
  if (loggedIn && isLoginPage) {
    if (isCashier.value) return navigateTo('/pos')
    return navigateTo('/')
  }

  // 未登录访问受保护页
  if (!loggedIn && !isLoginPage) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
