/**
 * 当前激活收银员状态
 * 允许管理员在自己的账号下为某个收银员"开台"，结账时将 cashierId 记录为该收银员
 * 默认为当前登录用户
 */
export interface ActiveCashier {
  id: number
  name: string
  username: string
}

export const useActiveCashier = () => {
  const { user } = useAuth()
  const activeCashier = useState<ActiveCashier | null>('active_cashier', () => null)

  const currentCashier = computed<ActiveCashier | null>(() => {
    if (activeCashier.value) return activeCashier.value
    if (user.value) {
      return { id: user.value.id, name: user.value.name, username: user.value.username }
    }
    return null
  })

  const setActiveCashier = (cashier: ActiveCashier) => {
    activeCashier.value = cashier
  }

  const clearActiveCashier = () => {
    activeCashier.value = null
  }

  return {
    activeCashier,
    currentCashier,
    setActiveCashier,
    clearActiveCashier,
  }
}
