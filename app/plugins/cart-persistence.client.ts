import { useCartStore } from '~/stores/cart'

export default defineNuxtPlugin(() => {
  const cart = useCartStore()
  const key = 'flower-pos-carts-v1'
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (Array.isArray(saved?.carts) && saved.carts.length && saved.carts.every((c: any) => typeof c.id === 'string' && Array.isArray(c.items))) {
      cart.carts = saved.carts
      cart.activeCartId = saved.carts.some((c: any) => c.id === saved.activeCartId) ? saved.activeCartId : saved.carts[0].id
    }
  } catch { /* A damaged local draft must not block the cashier. */ }
  cart.catalogVerified = false
  cart.$subscribe((_mutation, state) => {
    try { localStorage.setItem(key, JSON.stringify({ carts: state.carts, activeCartId: state.activeCartId })) } catch { /* Storage may be unavailable. */ }
  }, { detached: true })
})
