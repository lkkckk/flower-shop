<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-50 pos-container">
    <PosCartTabs />
    
    <div class="flex flex-1 overflow-hidden relative">
      <PosProductPicker 
        ref="productPickerRef"
        class="flex-1 transition-all duration-300"
      />
      
      <!-- 桌面端右侧栏 -->
      <div class="hidden md:block w-[380px] bg-white border-l border-gray-200">
        <PosCartPanel @checkout="checkoutDialogVisible = true" />
      </div>

      <!-- 移动端悬浮按钮 & 抽屉 -->
      <div class="md:hidden fixed bottom-6 right-6 z-10" v-if="cartStore.activeCart?.items.length">
        <a-badge :count="cartStore.activeCart.items.length" :number-style="{ backgroundColor: '#ec4899' }">
          <a-button 
            type="primary" 
            shape="circle" 
            size="large" 
            class="w-14 h-14 bg-pink-500 border-none shadow-lg shadow-pink-500/40 flex items-center justify-center"
            @click="mobileDrawerVisible = true"
          >
            <ShoppingCartOutlined class="text-xl" />
          </a-button>
        </a-badge>
      </div>

      <a-drawer
        v-model:open="mobileDrawerVisible"
        placement="bottom"
        height="85vh"
        title="收银台"
        class="md:hidden p-0"
        :bodyStyle="{ padding: 0 }"
      >
        <PosCartPanel @checkout="checkoutDialogVisible = true" />
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ShoppingCartOutlined } from '@ant-design/icons-vue'
import { useMagicKeys } from '@vueuse/core'
import { useCartStore } from '~/stores/cart'

definePageMeta({ layout: 'pos' })
useHead({ title: '开单收银 - 花店管理系统' })

const cartStore = useCartStore()
const router = useRouter()

const productPickerRef = ref()
const checkoutDialogVisible = ref(false)
const mobileDrawerVisible = ref(false)

// 键盘快捷键
const { slash, escape, ctrl_enter, ctrl_s, ctrl_n } = useMagicKeys()

// 挂单（保存一下提示即可，因为目前在 pinia 里已经是保存状态了）
watch(ctrl_s, (v) => { if (v) { message.success('已暂时挂单'); mobileDrawerVisible.value = false } })

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
    // 新窗口打开打印页
    window.open(`/orders/${orderId}/print`, '_blank', 'width=400,height=600')
  }, 100)
}
</script>

<style scoped>
:deep(.pos-container) {
  --header-height: 50px;
}
</style>
