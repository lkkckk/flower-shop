/**
 * 全局路由守卫：
 * - 未登录访问任何非 /login 页面 → 重定向到 /login?redirect=...
 * - 已登录访问 /login → 重定向到首页
 * - 首次进入（SSR/刷新）会通过 cookie 中的 token 拉取 user 信息
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { token, user, fetchMe } = useAuth()

  // 已有 token 但还没拉 user（首次加载/刷新）→ 拉一次
  if (token.value && !user.value) {
    await fetchMe()
  }

  const loggedIn = !!token.value && !!user.value

  // 已登录用户访问登录页 → 重定向到首页
  if (to.path === '/login' && loggedIn) {
    return navigateTo('/')
  }

  // 未登录访问非登录页 → 去登录
  if (to.path !== '/login' && !loggedIn) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
