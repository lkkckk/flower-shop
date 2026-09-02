<template>
  <div class="pos-cashier-page flex flex-col overflow-hidden bg-[#fafaf9] pos-container">
    <PosCartTabs />

    <div class="pos-workspace flex flex-1 overflow-hidden relative">
      <PosProductPicker
        ref="productPickerRef"
        class="flex-1 transition-all duration-300"
      />

      <!-- 桌面端右侧栏 -->
      <div class="hidden lg:block w-[360px] xl:w-[380px] bg-white border-l border-gray-200">
        <PosCartPanel @checkout="openCheckout" />
      </div>

      <!-- 手机 / 平板始终可见的购物车与结账入口 -->
      <div class="mobile-cart-dock lg:hidden">
        <button
          type="button"
          class="mobile-cart-summary"
          :aria-label="`查看购物车，${activeCartItemCount} 件商品，合计 ${activeCartTotal.toFixed(2)} 元`"
          @click="mobileDrawerVisible = true"
        >
          <span class="mobile-cart-icon" aria-hidden="true">
            <ShoppingCartOutlined />
            <span v-if="activeCartItemCount > 0" class="mobile-cart-count">{{ activeCartItemCount }}</span>
          </span>
          <span class="mobile-cart-copy">
            <strong>购物车</strong>
            <span>{{ activeCartItemCount > 0 ? `${activeCartItemCount} 件商品` : '点击查看收银台' }}</span>
          </span>
          <span class="mobile-cart-total">¥{{ activeCartTotal.toFixed(2) }}</span>
        </button>

        <a-button
          type="primary"
          class="mobile-checkout-button"
          @click="handleMobilePrimaryAction"
        >
          {{ canCheckout ? '去结账' : '打开收银台' }}
        </a-button>
      </div>

      <a-drawer
        v-model:open="mobileDrawerVisible"
        placement="bottom"
        height="min(88dvh, 760px)"
        :title="`购物车 · ${activeCartItemCount} 件`"
        class="lg:hidden pos-cart-drawer"
        :bodyStyle="{ padding: 0 }"
      >
        <PosCartPanel @checkout="openCheckout" />
      </a-drawer>
    </div>

    <!-- 结账弹窗 -->
    <PosCheckoutDialog
      v-model:visible="checkoutDialogVisible"
      @success="onCheckoutSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ShoppingCartOutlined } from '@ant-design/icons-vue'
import { useMagicKeys } from '@vueuse/core'
import { useCartStore } from '~/stores/cart'

useHead({ title: '收银台 - 花店管理系统' })

const cartStore = useCartStore()

// 低库存告警（同会话去重）
const { checkLowStock } = useLowStockAlert()
const { token: authToken } = useAuth()
onMounted(() => {
  // 冗余保护：只有已登录时才弹提示（中间件一般已拦截未登录）
  if (authToken.value) {
    checkLowStock({ target: '/pos/stocktake' })
  }
})

const productPickerRef = ref()
const checkoutDialogVisible = ref(false)
const mobileDrawerVisible = ref(false)
const activeCartItemCount = computed(() => cartStore.activeCart?.items.length ?? 0)
const activeCartTotal = computed(() => {
  const cartId = cartStore.activeCartId
  return cartId ? cartStore.cartTotal(cartId) : 0
})
const canCheckout = computed(() => activeCartItemCount.value > 0)

const openCheckout = () => {
  if (!canCheckout.value) {
    message.warning('请先选择商品，再进行结账')
    mobileDrawerVisible.value = true
    return
  }
  mobileDrawerVisible.value = false
  checkoutDialogVisible.value = true
}

const handleMobilePrimaryAction = () => {
  if (canCheckout.value) {
    openCheckout()
    return
  }
  mobileDrawerVisible.value = true
}

// 键盘快捷键
const { slash, escape, ctrl_enter, ctrl_s, ctrl_n } = useMagicKeys()

// 挂单
watch(ctrl_s, (v) => {
  if (v) {
    message.success('已暂时挂单')
    mobileDrawerVisible.value = false
  }
})

// 聚焦搜索
watch(slash, (v) => {
  if (v && !checkoutDialogVisible.value) {
    productPickerRef.value?.focusSearch()
  }
})

// 创建新单
watch(ctrl_n, (v) => {
  if (v) cartStore.createCart()
})

// 结账
watch(ctrl_enter, (v) => {
  if (v && cartStore.activeCart && cartStore.activeCart.items.length > 0) {
    checkoutDialogVisible.value = true
  }
})

// 关闭弹窗
watch(escape, (v) => {
  if (v) {
    checkoutDialogVisible.value = false
    mobileDrawerVisible.value = false
  }
})

// 结账成功后的回调
const onCheckoutSuccess = (orderId: number) => {
  checkoutDialogVisible.value = false
  mobileDrawerVisible.value = false
  setTimeout(() => {
    window.open(`/orders/${orderId}/print`, '_blank', 'width=400,height=600')
  }, 100)
}
</script>

<style scoped>
:deep(.pos-container) {
  --header-height: 50px;
}

.pos-cashier-page {
  height: 100%;
  min-height: 0;
}

.mobile-cart-dock {
  position: fixed;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  left: max(12px, env(safe-area-inset-left));
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 8px;
  border: 1px solid rgba(199, 210, 159, 0.9);
  border-radius: 18px;
  background: rgba(255, 254, 247, 0.96);
  box-shadow: 0 16px 40px rgba(46, 58, 31, 0.2), 0 2px 8px rgba(46, 58, 31, 0.08);
  backdrop-filter: blur(16px);
}

.mobile-cart-summary {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  min-height: 50px;
  padding: 4px 2px 4px 4px;
  border: 0;
  color: var(--ink-900);
  text-align: left;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mobile-cart-summary:focus-visible {
  outline: 3px solid var(--avo-300);
  outline-offset: 2px;
  border-radius: 12px;
}

.mobile-cart-summary:active {
  transform: translateY(1px);
}

.mobile-cart-icon {
  position: relative;
  display: inline-flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  margin-right: 10px;
  border-radius: 14px;
  color: var(--avo-800);
  font-size: 21px;
  background: var(--avo-100);
}

.mobile-cart-count {
  position: absolute;
  top: -5px;
  right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid var(--paper-3);
  border-radius: 10px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  background: var(--avo-700);
}

.mobile-cart-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.mobile-cart-copy strong {
  color: var(--ink-900);
  font-size: 15px;
}

.mobile-cart-copy span {
  margin-top: 3px;
  overflow: hidden;
  color: var(--ink-500);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-cart-total {
  flex: 0 0 auto;
  margin-left: auto;
  padding-left: 10px;
  color: var(--avo-800);
  font-family: Outfit, sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

:deep(.mobile-checkout-button) {
  flex: 0 0 auto;
  min-width: 104px;
  height: 50px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
}

:global(.pos-cart-drawer .ant-drawer-body) {
  height: 100%;
  overflow: hidden;
}

@media (max-width: 1023px) {
  .pos-workspace {
    padding-bottom: 92px;
  }
}

@media (min-width: 1024px) {
  .mobile-cart-dock {
    display: none;
  }
}

@media (max-width: 560px) {
  .mobile-cart-dock {
    right: max(8px, env(safe-area-inset-right));
    bottom: max(8px, env(safe-area-inset-bottom));
    left: max(8px, env(safe-area-inset-left));
    gap: 6px;
    min-height: 64px;
    padding: 7px;
    border-radius: 16px;
  }

  .mobile-cart-icon {
    flex-basis: 42px;
    width: 42px;
    height: 42px;
    margin-right: 8px;
    border-radius: 12px;
  }

  .mobile-cart-copy span {
    max-width: 118px;
  }

  .mobile-cart-total {
    padding-left: 6px;
    font-size: 17px;
  }

  :deep(.mobile-checkout-button) {
    min-width: 84px;
    height: 48px;
    padding-inline: 14px;
  }
}

@media (max-width: 400px) {
  .mobile-cart-copy span {
    display: none;
  }

  .mobile-cart-total {
    font-size: 16px;
  }

  :deep(.mobile-checkout-button) {
    min-width: 78px;
    padding-inline: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-cart-summary {
    transition: none;
  }
}
</style>
