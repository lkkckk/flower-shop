<template>
  <div class="cart-tabs-container bg-white border-b border-gray-200">
    <a-tabs
      v-model:activeKey="cartStore.activeCartId"
      type="editable-card"
      hide-add
      @edit="onEdit"
      @change="onChange"
      class="pt-2 px-2"
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
  /* 定制 tabs 的样式让它更好看一点 */
}
:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab) {
  padding: 6px 16px;
  background: #f9fafb;
  border-color: #e5e7eb;
}
:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active) {
  background: #fff;
  border-bottom-color: #fff;
}
:deep(.ant-tabs-nav) {
  margin-bottom: 0 !important;
}
</style>
