<template>
  <div class="h-full flex flex-col bg-white overflow-hidden relative">
    
    <!-- 空状态处理 -->
    <div v-if="!cart" class="flex-1 flex items-center justify-center text-gray-400">
      请先创建一单
    </div>

    <template v-else>
      <!-- 客户选择区 -->
      <div class="p-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition" @click="customerDrawerVisible = true">
        <div v-if="!cart.customerId" class="flex items-center justify-center p-2 rounded border-2 border-dashed border-gray-300 text-gray-500 font-medium">
          👤 散客（点击选择客户）
        </div>
        <div v-else class="flex justify-between items-center bg-white p-2 rounded shadow-sm">
          <div>
            <div class="font-bold text-gray-800">{{ cart.customerName }}</div>
            <div class="flex items-center gap-2 mt-1">
              <a-tag :color="getLevelColor(cart.customerLevel)">{{ getLevelName(cart.customerLevel) }}</a-tag>
              <span class="text-xs text-red-500" v-if="cart.customerBalance < 0">欠款 ￥{{ Math.abs(cart.customerBalance).toFixed(2) }}</span>
            </div>
          </div>
          <a-button type="link" size="small" @click.stop="clearCustomer">清除</a-button>
        </div>
      </div>

      <!-- 购物车列表区域 -->
      <div class="flex-1 overflow-y-auto bg-gray-50 p-2">
        <a-empty v-if="cart.items.length === 0" description="购物车为空，请从左侧选择商品" class="mt-20" />
        
        <div v-else class="space-y-2">
          <div v-for="item in cart.items" :key="item.id" class="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <!-- 行1：名称/操作 -->
            <div class="flex justify-between items-start mb-2">
              <div class="font-medium text-gray-800 leading-tight">
                {{ item.productName }}
                <a-tag v-if="item.grade" class="ml-1 text-[10px]">{{ item.grade }}</a-tag>
                <div class="text-xs text-gray-400 mt-0.5">{{ item.specification }}</div>
              </div>
              <a-button type="text" danger size="small" @click="cartStore.removeItem(cart.id, item.id)">删除</a-button>
            </div>
            
            <!-- 行2：数量/单位/单价 -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <a-input-number 
                  :value="item.qty" 
                  @change="(val) => cartStore.updateItemQty(cart.id, item.id, Number(val))"
                  :min="1" 
                  size="small" 
                  class="w-16"
                />
                <a-select 
                  :value="item.unit"
                  @change="(val) => cartStore.updateItemUnit(cart.id, item.id, val as string)"
                  size="small" 
                  class="w-20"
                >
                  <a-select-option :value="item.baseUnit">{{ item.baseUnit }}</a-select-option>
                  <a-select-option 
                    v-for="uc in item.unitConversions" 
                    :key="uc.fromUnit" 
                    :value="uc.fromUnit"
                  >
                    {{ uc.fromUnit }}
                  </a-select-option>
                </a-select>
              </div>
              
              <div class="text-right">
                <div class="font-bold text-pink-600">¥{{ item.subtotal.toFixed(2) }}</div>
                <div class="text-xs text-gray-400 cursor-pointer hover:text-indigo-500" @click="editPrice(item)">
                  @ ¥{{ item.unitPrice.toFixed(2) }}/{{ item.unit }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部统计与操作区 -->
      <div class="bg-white border-t border-gray-200">
        <!-- 备注与杂项 -->
        <div class="px-4 py-2 border-b border-gray-100">
          <a-collapse :bordered="false" class="bg-transparent" ghost>
            <a-collapse-panel key="1" header="添加备注 / 配送信息" class="p-0">
              <div class="space-y-2 mt-2">
                <a-textarea 
                  :value="cart.notes" 
                  @update:value="val => cartStore.setNotes(cart.id, val)" 
                  placeholder="订单备注..." 
                  auto-size 
                />
                <a-input 
                  :value="cart.deliveryAddress" 
                  @update:value="val => cartStore.setDeliveryAddress(cart.id, val)" 
                  placeholder="配送地址" 
                />
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <!-- 价格合计 -->
        <div class="px-4 py-3 flex justify-between items-end">
          <div>
            <div class="text-sm text-gray-500 flex justify-between w-32">
              <span>小计：</span>
              <span>¥{{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="text-sm text-gray-500 flex justify-between w-32 mt-1 cursor-pointer hover:text-indigo-500" @click="editDiscount(cart)">
              <span>优惠：</span>
              <span>-¥{{ cart.discount.toFixed(2) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500 mb-1">应付金额</div>
            <div class="text-2xl font-bold text-red-600 leading-none">¥{{ total.toFixed(2) }}</div>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-2 p-3 bg-gray-50">
          <a-button size="large" class="w-1/3 font-medium" :disabled="cart.items.length === 0">
            挂单 (Ctrl+S)
          </a-button>
          <a-button type="primary" size="large" class="bg-pink-500 border-none w-2/3 font-bold text-lg" :disabled="cart.items.length === 0" @click="$emit('checkout')">
            结账 (Ctrl+Enter)
          </a-button>
        </div>
      </div>
    </template>

    <!-- 客户选择抽屉 -->
    <a-drawer
      title="选择客户"
      placement="right"
      :open="customerDrawerVisible"
      @close="customerDrawerVisible = false"
      width="400"
    >
      <a-input-search
        placeholder="搜索姓名或手机号"
        v-model:value="customerSearchKeyword"
        @search="fetchCustomers"
        allow-clear
        class="mb-4"
      />
      <div class="space-y-2">
        <div 
          v-for="c in customers" 
          :key="c.id" 
          class="p-3 border rounded cursor-pointer hover:border-pink-500 hover:shadow-sm"
          @click="selectCustomer(c)"
        >
          <div class="flex justify-between">
            <span class="font-bold">{{ c.name }}</span>
            <span>{{ c.phone }}</span>
          </div>
          <div class="flex justify-between mt-2 text-sm">
            <a-tag :color="getLevelColor(c.level)">{{ getLevelName(c.level) }}</a-tag>
            <span v-if="c.balance < 0" class="text-red-500">欠款 ￥{{ Math.abs(c.balance).toFixed(2) }}</span>
            <span v-else class="text-green-500">余额 ￥{{ c.balance.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </a-drawer>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import { useCartStore } from '~/stores/cart'
import debounce from 'lodash-es/debounce'

defineEmits(['checkout'])

const cartStore = useCartStore()

const cart = computed(() => {
  return cartStore.carts.find(c => c.id === cartStore.activeCartId)
})

const subtotal = computed(() => {
  if (!cart.value) return 0
  return cartStore.cartSubtotal(cart.value.id)
})

const total = computed(() => {
  if (!cart.value) return 0
  return cartStore.cartTotal(cart.value.id)
})

// 客户处理
const customerDrawerVisible = ref(false)
const customerSearchKeyword = ref('')
const customers = ref<any[]>([])

const fetchCustomers = async () => {
  const res: any = await $fetch('/api/customers', {
    query: { keyword: customerSearchKeyword.value }
  })
  if (res.data) {
    customers.value = res.data.list
  }
}

watch(customerDrawerVisible, (val) => {
  if (val && customers.value.length === 0) fetchCustomers()
})

watch(customerSearchKeyword, debounce(fetchCustomers, 500))

const selectCustomer = (c: any) => {
  if (cart.value) {
    cartStore.setCustomer(cart.value.id, c)
  }
  customerDrawerVisible.value = false
}

const clearCustomer = () => {
  if (cart.value) {
    cartStore.setCustomer(cart.value.id, null)
  }
}

const getLevelName = (level: string) => {
  const map: any = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || '普通'
}

const getLevelColor = (level: string) => {
  const map: any = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}

// 辅助方法：快速编辑当前项单价或整体优惠
const editPrice = (item: any) => {
  const newPriceStr = prompt(`修改 "${item.productName}" 的单价 (¥/${item.unit})`, String(item.unitPrice))
  if (newPriceStr !== null) {
    const newPrice = Number(newPriceStr)
    if (!isNaN(newPrice) && newPrice >= 0 && cart.value) {
      cartStore.updateItemPrice(cart.value.id, item.id, newPrice)
    }
  }
}

const editDiscount = (cart: any) => {
  const newDiscountStr = prompt('设置整单优惠金额', String(cart.discount))
  if (newDiscountStr !== null) {
    const newDiscount = Number(newDiscountStr)
    if (!isNaN(newDiscount) && newDiscount >= 0) {
      cartStore.setDiscount(cart.id, newDiscount)
    }
  }
}

</script>

<style scoped>
:deep(.ant-collapse-header) {
  padding: 0 !important;
  color: #6b7280 !important;
}
</style>
