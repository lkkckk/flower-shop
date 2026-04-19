/**
 * 全局路由守卫（多入口）：
 * - 后台入口：/login；收银入口：/pos/login
 * - 未登录：访问 /pos/** → /pos/login；访问其它受保护页 → /login
 * - 已登录：cashier 仅能访问 /pos/**，访问其它路径强制回到 /pos
 * - 已登录访问对应登录页：cashier → /pos；admin/staff → /
 */
const PUBLIC_PATHS = new Set(['/login', '/pos/login'])

function isPosPath(path: string) {
  return path === '/pos' || path.startsWith('/pos/')
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { token, user, fetchMe, isCashier } = useAuth()

  // 已有 token 但还没拉 user（首次加载/刷新）→ 拉一次
  if (token.value && !user.value) {
    await fetchMe()
  }

  const loggedIn = !!token.value && !!user.value
  const toPos = isPosPath(to.path)
  const isLoginPage = PUBLIC_PATHS.has(to.path)

  // 已登录访问登录页
  if (loggedIn && isLoginPage) {
    if (isCashier.value) return navigateTo('/pos')
    return navigateTo('/')
  }

  // 未登录访问受保护页
  if (!loggedIn && !isLoginPage) {
    const target = toPos ? '/pos/login' : '/login'
    return navigateTo(`${target}?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // 已登录的 cashier 访问非 POS 路径 → 强制回 /pos
  if (loggedIn && isCashier.value && !toPos && !isLoginPage) {
    return navigateTo('/pos')
  }
})
