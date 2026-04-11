import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartItem {
  id: string
  productId: number
  productName: string
  grade: string | null
  specification: string | null
  baseUnit: string
  unit: string
  unitConversions: { fromUnit: string; toBaseQty: number }[]
  qty: number
  baseQty: number
  unitPrice: number
  originalPrice: number
  subtotal: number
  notes: string
}

export interface Cart {
  id: string
  label: string
  customerId: number | null
  customerName: string
  customerLevel: string // normal/member/vip/wholesale
  customerBalance: number
  items: CartItem[]
  notes: string
  deliveryTime: Date | null
  deliveryAddress: string
  discount: number
  createdAt: Date
}

export interface PaymentInfo {
  method: 'cash' | 'wechat' | 'alipay' | 'credit' | 'mixed'
  paidAmount: number
  owedAmount: number
}

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15)
}

export const useCartStore = defineStore('cart', () => {
  const createEmptyCart = (): Cart => ({
    id: generateId(),
    label: '散客',
    customerId: null,
    customerName: '散客',
    customerLevel: 'normal',
    customerBalance: 0,
    items: [],
    notes: '',
    deliveryTime: null,
    deliveryAddress: '',
    discount: 0,
    createdAt: new Date(),
  })

  // State
  const carts = ref<Cart[]>([createEmptyCart()])
  const activeCartId = ref<string | null>(carts.value[0].id)

  // Getters
  const activeCart = computed(() => carts.value.find((c) => c.id === activeCartId.value))

  const cartSubtotal = computed(() => {
    return (cartId: string) => {
      const cart = carts.value.find((c) => c.id === cartId)
      if (!cart) return 0
      return cart.items.reduce((sum, item) => sum + item.subtotal, 0)
    }
  })

  const cartTotal = computed(() => {
    return (cartId: string) => {
      const subtotal = cartSubtotal.value(cartId)
      const cart = carts.value.find((c) => c.id === cartId)
      if (!cart) return 0
      return Math.max(0, subtotal - cart.discount)
    }
  })

  // Actions
  const createCart = () => {
    if (carts.value.length >= 10) {
      throw new Error('最多只能同时开 10 个单')
    }
    const newCart = createEmptyCart()
    carts.value.push(newCart)
    activeCartId.value = newCart.id
  }

  const closeCart = (cartId: string) => {
    const index = carts.value.findIndex((c) => c.id === cartId)
    if (index === -1) return

    carts.value.splice(index, 1)

    // 如果删空了，创建个新的
    if (carts.value.length === 0) {
      createCart()
    } else if (activeCartId.value === cartId) {
      // 激活前一个
      activeCartId.value = carts.value[Math.max(0, index - 1)].id
    }
  }

  const switchCart = (cartId: string) => {
    activeCartId.value = cartId
  }

  const getPriceForLevel = (product: any, level: string) => {
    if (level === 'vip' && product.vipPrice != null) return product.vipPrice
    if (level === 'wholesale' && product.wholesalePrice != null) return product.wholesalePrice
    return product.defaultPrice
  }

  const getLevelBasePrice = (prices: any, level: string) => {
    if (!prices) return 0
    if (level === 'vip' && prices.vipPrice != null) return prices.vipPrice
    if (level === 'wholesale' && prices.wholesalePrice != null) return prices.wholesalePrice
    return prices.defaultPrice || 0
  }

  const recalculatePrices = (cart: Cart) => {
    cart.items.forEach((item) => {
      const prices = (item as any)._prices
      if (!prices) return

      // 计算当前 item 单位下的换算系数
      let toBaseQty = 1
      if (item.unit !== item.baseUnit) {
        const conv = item.unitConversions.find((u) => u.fromUnit === item.unit)
        if (conv) toBaseQty = conv.toBaseQty
      }

      const basePrice = getLevelBasePrice(prices, cart.customerLevel)
      item.unitPrice = basePrice * toBaseQty
      item.originalPrice = item.unitPrice
      item.subtotal = item.qty * item.unitPrice
    })
  }

  const setCustomer = (cartId: string, customer: any | null) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return

    if (customer) {
      cart.customerId = customer.id
      cart.customerName = customer.name
      cart.customerLevel = customer.level || 'normal'
      cart.customerBalance = customer.balance || 0
      cart.label = customer.name || '客户'
      cart.deliveryAddress = customer.address || ''
    } else {
      cart.customerId = null
      cart.customerName = '散客'
      cart.customerLevel = 'normal'
      cart.customerBalance = 0
      cart.label = '散客'
    }

    // 根据新等级重算购物车里所有 item 的单价
    recalculatePrices(cart)
  }

  const addItem = (cartId: string, product: any, unit: string, qty: number) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return

    // 获取换算率
    let toBaseQty = 1
    if (unit !== product.baseUnit) {
      const conversion = product.unitConversions?.find((uc: any) => uc.fromUnit === unit)
      if (conversion) {
        toBaseQty = conversion.toBaseQty
      }
    }

    // 计算价格
    let unitPrice = getPriceForLevel(product, cart.customerLevel)
    if (unit !== product.baseUnit) {
      // 如果按不同单位卖，单价通常需要乘以包含的基础单位数量
      // 取决于业务设定，这里假定是基础数量 * 基础价
      unitPrice = unitPrice * toBaseQty
    }

    // 检查是否存在
    const existingItem = cart.items.find(
      (i) => i.productId === product.id && i.unit === unit
    )

    if (existingItem) {
      existingItem.qty += qty
      existingItem.baseQty = existingItem.qty * toBaseQty
      existingItem.subtotal = existingItem.qty * existingItem.unitPrice
    } else {
      cart.items.push({
        id: generateId(),
        productId: product.id,
        productName: product.name,
        grade: product.grade,
        specification: product.specification,
        baseUnit: product.baseUnit,
        unit,
        unitConversions: product.unitConversions || [],
        qty,
        baseQty: qty * toBaseQty,
        unitPrice,
        originalPrice: unitPrice,
        subtotal: qty * unitPrice,
        notes: '',
        // 将价格字典隐藏保存以便后续换客户重算
        _prices: {
          defaultPrice: product.defaultPrice,
          vipPrice: product.vipPrice,
          wholesalePrice: product.wholesalePrice,
        }
      } as any)
    }
  }

  const updateItemQty = (cartId: string, itemId: string, qty: number) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return

    item.qty = qty
    let toBaseQty = 1
    if (item.unit !== item.baseUnit) {
      const conv = item.unitConversions.find((u) => u.fromUnit === item.unit)
      if (conv) toBaseQty = conv.toBaseQty
    }
    item.baseQty = qty * toBaseQty
    item.subtotal = qty * item.unitPrice
  }

  const updateItemUnit = (cartId: string, itemId: string, unit: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return

    item.unit = unit
    let toBaseQty = 1
    if (unit !== item.baseUnit) {
      const conv = item.unitConversions.find((u) => u.fromUnit === unit)
      if (conv) toBaseQty = conv.toBaseQty
    }
    item.baseQty = item.qty * toBaseQty
    
    // 重算价格：当前等级的基础单价 * 换算数量
    const prices = (item as any)._prices || {}
    let baseLevelPrice = prices.defaultPrice
    if (cart.customerLevel === 'vip' && prices.vipPrice != null) baseLevelPrice = prices.vipPrice
    if (cart.customerLevel === 'wholesale' && prices.wholesalePrice != null) baseLevelPrice = prices.wholesalePrice

    item.unitPrice = baseLevelPrice * toBaseQty
    item.originalPrice = item.unitPrice
    item.subtotal = item.qty * item.unitPrice
  }

  const updateItemPrice = (cartId: string, itemId: string, price: number) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return

    item.unitPrice = price
    item.subtotal = item.qty * price
  }

  const removeItem = (cartId: string, itemId: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    cart.items = cart.items.filter((i) => i.id !== itemId)
  }

  const setDiscount = (cartId: string, amount: number) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    cart.discount = Math.max(0, amount)
  }

  const setNotes = (cartId: string, notes: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (cart) cart.notes = notes
  }

  const setDeliveryTime = (cartId: string, time: Date | null) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (cart) cart.deliveryTime = time
  }

  const setDeliveryAddress = (cartId: string, address: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (cart) cart.deliveryAddress = address
  }

  const clearCart = (cartId: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (cart) {
      cart.items = []
      cart.discount = 0
    }
  }

  return {
    carts,
    activeCartId,
    activeCart,
    cartSubtotal,
    cartTotal,
    createCart,
    closeCart,
    switchCart,
    setCustomer,
    addItem,
    updateItemQty,
    updateItemUnit,
    updateItemPrice,
    removeItem,
    setDiscount,
    setNotes,
    setDeliveryTime,
    setDeliveryAddress,
    clearCart,
  }
})
