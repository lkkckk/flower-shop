<template>
  <div class="cart-tabs-container pt-2 px-4 shadow-sm relative z-10">
    <a-tabs
      v-model:activeKey="cartStore.activeCartId"
      type="editable-card"
      hide-add
      @edit="onEdit"
      @change="onChange"
      class="pb-2"
    >
      <a-tab-pane
        v-for="cart in cartStore.carts"
        :key="cart.id"
        :closable="true"
      >
        <template #tab>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ cart.label }}</span>
            <a-badge
              v-if="cart.items.length > 0"
              :count="cart.items.length"
              :number-style="{ backgroundColor: '#ec4899' }"
              size="small"
            />
            <span v-if="cart.items.length > 0" class="text-gray-500 text-xs ml-1">
              ¥{{ cartStore.cartTotal(cart.id).toFixed(2) }}
            </span>
          </div>
        </template>
      </a-tab-pane>
      <template #rightExtra>
        <a-button type="dashed" class="mr-2" @click="cartStore.createCart">
          <PlusOutlined /> 新开一单
        </a-button>
      </template>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { PlusOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'

const cartStore = useCartStore()

const onChange = (activeKey: string) => {
  cartStore.switchCart(activeKey)
}

const onEdit = (targetKey: string | MouseEvent, action: string) => {
  if (action === 'remove' && typeof targetKey === 'string') {
    const cart = cartStore.carts.find(c => c.id === targetKey)
    if (cart && cart.items.length > 0) {
      Modal.confirm({
        title: '确认关闭该单？',
        content: '该订单中有未结账的商品，关闭后将被清空，确认关闭吗？',
        okText: '确认关闭',
        okType: 'danger',
        cancelText: '取消',
        onOk() {
          cartStore.closeCart(targetKey)
        },
      })
    } else if (typeof targetKey === 'string') {
      cartStore.closeCart(targetKey)
    }
  }
}
</script>

<style scoped>
.cart-tabs-container {
  background: #fafaf9; /* match body background */
}

/* Customizing the editable card tabs to look like soft pills */
:deep(.ant-tabs-card > .ant-tabs-nav) {
  margin-bottom: 0 !important;
  background: transparent !important;
  border-bottom: none !important;
}

:deep(.ant-tabs-card > .ant-tabs-nav::before) {
  display: none !important;
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab) {
  padding: 8px 20px;
  background: white;
  border: 1px solid #f3f4f6;
  border-radius: 9999px !important; /* Fully rounded pill */
  margin-right: 8px !important;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active) {
  background: #fdf2f8 !important; /* pink-50 */
  border-color: #fbcfe8 !important; /* pink-200 */
  box-shadow: 0 4px 6px -1px rgba(236, 72, 153, 0.1), 0 2px 4px -1px rgba(236, 72, 153, 0.06) !important;
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .font-medium) {
  color: #db2777; /* pink-600 */
}

:deep(.ant-tabs-tab-remove) {
  margin-left: 8px !important;
}
</style>
