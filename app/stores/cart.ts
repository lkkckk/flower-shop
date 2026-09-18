import { pickBasePrice } from '~~/shared/priceMode'
import { money, decimal, sumMoney } from '~~/shared/money'
import { createClientId } from '~~/shared/clientId'
// defineStore / ref / computed 由 @pinia/nuxt + Nuxt 自动导入提供

export interface CartItem {
  productType?: string
  variantId?: string
  variantLabel?: string
  variantError?: string
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

const generateId = createClientId

const roundMoney = (value: number) => money(value).toNumber()

export const useCartStore = defineStore('cart', () => {
  const catalogVerified = ref(false)
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
      return sumMoney(cart.items.map(item => item.subtotal)).toNumber()
    }
  })

  const cartTotal = computed(() => {
    return (cartId: string) => {
      const subtotal = cartSubtotal.value(cartId)
      const cart = carts.value.find((c) => c.id === cartId)
      if (!cart) return 0
      return Math.max(0, roundMoney(subtotal - cart.discount))
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
    if (product.productType === 'drink') return Number(product.selectedVariant.price)
    // 与结账接口一致：零售基础价，优惠在结账时统一计算。
    return product.specialBatchId ? Number(product.specialPrice) : pickBasePrice({ ...product, level }, 'retail')
  }

  const getLevelBasePrice = (prices: any, level: string) => {
    if (!prices) return 0
    if (prices.productType === 'drink') return Number(prices.defaultPrice)
    return prices.specialBatchId ? Number(prices.specialPrice) : pickBasePrice({ ...prices, level }, 'retail')
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
      item.unitPrice = money(decimal(basePrice).times(toBaseQty)).toNumber()
      item.originalPrice = item.unitPrice
      item.subtotal = money(decimal(item.qty).times(item.unitPrice)).toNumber()
    })
  }

  const setCustomer = (cartId: string, customer: any | null) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return

    if (customer) {
      cart.customerId = customer.id
      cart.customerName = customer.name
      cart.customerLevel = customer.level || 'normal'
      cart.customerBalance = customer.storedValueBalance ?? customer.balance ?? 0
      ;(cart as any).availablePoints = customer.availablePoints ?? 0
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
    if (product.productType === 'drink' && (!product.selectedVariant?.enabled || product.selectedVariant.price == null || !Number.isInteger(qty) || qty < 1)) return

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
      unitPrice = decimal(unitPrice).times(toBaseQty).toNumber()
    }

    unitPrice = roundMoney(unitPrice)

    // 检查是否存在
    const existingItem = cart.items.find(
      (i) => i.productId === product.id && i.unit === unit && i.variantId === product.selectedVariant?.id && (i as any).specialBatchId === product.specialBatchId
    )

    if (existingItem) {
      existingItem.qty += qty
      existingItem.baseQty = existingItem.qty * toBaseQty
      existingItem.subtotal = money(decimal(existingItem.qty).times(existingItem.unitPrice)).toNumber()
    } else {
      cart.items.push({
        id: generateId(),
        productId: product.id,
        productType: product.productType || 'standard',
        variantId: product.selectedVariant?.id,
        variantLabel: product.selectedVariant?.label,
        specialBatchId: product.specialBatchId,
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
        subtotal: money(decimal(qty).times(unitPrice)).toNumber(),
        notes: '',
        // 将价格字典隐藏保存以便后续换客户重算
        _prices: {
          productType: product.productType,
          specialBatchId: product.specialBatchId,
          specialPrice: product.specialPrice,
          defaultPrice: product.productType === 'drink' ? product.selectedVariant.price : product.defaultPrice,
          memberPrice: product.memberPrice,
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

    if (!Number.isFinite(qty) || qty <= 0) return
    if (item.productType === 'drink' && !Number.isInteger(qty)) return
    item.qty = qty
    let toBaseQty = 1
    if (item.unit !== item.baseUnit) {
      const conv = item.unitConversions.find((u) => u.fromUnit === item.unit)
      if (conv) toBaseQty = conv.toBaseQty
    }
    item.baseQty = qty * toBaseQty
    item.subtotal = money(decimal(qty).times(item.unitPrice)).toNumber()
  }

  const updateItemUnit = (cartId: string, itemId: string, unit: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return
    if (item.productType === 'drink') return

    item.unit = unit
    let toBaseQty = 1
    if (unit !== item.baseUnit) {
      const conv = item.unitConversions.find((u) => u.fromUnit === unit)
      if (conv) toBaseQty = conv.toBaseQty
    }
    item.baseQty = item.qty * toBaseQty
    
    // 重算价格：当前等级的基础单价 * 换算数量
    const prices = (item as any)._prices || {}
    let baseLevelPrice = getLevelBasePrice(prices, cart.customerLevel)

    item.unitPrice = money(decimal(baseLevelPrice).times(toBaseQty)).toNumber()
    item.originalPrice = item.unitPrice
    item.subtotal = money(decimal(item.qty).times(item.unitPrice)).toNumber()
  }

  const updateItemPrice = (cartId: string, itemId: string, price: number) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return

    item.unitPrice = price
    item.subtotal = money(decimal(item.qty).times(price)).toNumber()
  }

  const removeItem = (cartId: string, itemId: string) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return
    cart.items = cart.items.filter((i) => i.id !== itemId)
  }

  const batchUpdatePrices = (cartId: string, itemIds: string[], adjustment: { type: 'fixed' | 'percentage'; value: number }) => {
    const cart = carts.value.find((c) => c.id === cartId)
    if (!cart) return

    for (const item of cart.items) {
      if (!itemIds.includes(item.id)) continue

      if (adjustment.type === 'fixed') {
        item.unitPrice = adjustment.value
      } else {
        // percentage: value = -10 means 10% off, value = 20 means 20% markup
        item.unitPrice = decimal(item.originalPrice).times(decimal(adjustment.value).div(100).plus(1)).toNumber()
      }
      item.unitPrice = money(item.unitPrice).clamp(0,Infinity).toNumber()
      item.subtotal = money(decimal(item.qty).times(item.unitPrice)).toNumber()
    }
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
      cart.notes = ''
      cart.deliveryTime = null
      cart.deliveryAddress = ''
    }
  }

  const refreshProductPrices = (products: any[]) => {
    catalogVerified.value = true
    const byId = new Map(products.map(p => [p.id, p]))
    for (const cart of carts.value) {
      for (const item of cart.items) {
        const product = byId.get(item.productId)
        if (item.productType === 'drink') {
          const variant = product?.drinkVariants?.find((v: any) => v.id === item.variantId)
          item.variantError = !product || !variant?.enabled || variant.price == null ? '此规格已停售或移除，请删除后重新选择' : ''
          if (!item.variantError) {
            item.productName = product.name
            item.variantLabel = variant.label
            ;(item as any)._prices = { productType: 'drink', defaultPrice: variant.price }
          }
          continue
        }
        if (!product) continue
        const special = product.specialBatches?.find((b:any)=>b.id===(item as any).specialBatchId)
        ;(item as any)._prices = { ...product, specialBatchId:(item as any).specialBatchId, specialPrice:special?.specialPrice ?? (item as any)._prices?.specialPrice }
      }
      recalculatePrices(cart)
    }
  }

  return {
    catalogVerified,
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
    batchUpdatePrices,
    removeItem,
    setDiscount,
    setNotes,
    setDeliveryTime,
    setDeliveryAddress,
    clearCart,
    refreshProductPrices,
  }
})
