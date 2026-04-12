<template>
  <div class="h-full flex flex-col bg-white overflow-hidden relative">
    
    <!-- 空状态处理 -->
    <div v-if="!cart" class="flex-1 flex items-center justify-center text-gray-400">
      请先创建一单
    </div>

    <template v-else>
      <!-- 客户选择区 -->
      <div class="p-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition" @click="openCustomerDrawer">
        <div v-if="!cart.customerId" class="flex items-center justify-center p-2 rounded border-2 border-dashed border-gray-300 text-gray-500 font-medium">
          👤 散客（点击选择客户）
        </div>
        <div v-else class="flex justify-between items-center bg-white p-2 rounded shadow-sm">
          <div class="flex items-center gap-3">
            <a-avatar :style="{ backgroundColor: '#ec4899' }">{{ (cart.customerName || '?').slice(0, 1) }}</a-avatar>
            <div>
              <div class="font-bold text-gray-800">{{ cart.customerName }}</div>
              <div class="flex items-center gap-2 mt-1">
                <a-tag :color="getLevelColor(cart.customerLevel)">{{ getLevelName(cart.customerLevel) }}</a-tag>
                <span class="text-xs text-red-500 font-medium" v-if="cart.customerBalance < 0">欠款 ¥{{ Math.abs(cart.customerBalance).toFixed(2) }}</span>
                <span class="text-xs text-green-600 font-medium" v-else-if="cart.customerBalance > 0">预存 ¥{{ cart.customerBalance.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <a-space :size="0">
            <a-button type="link" size="small" @click.stop="openCustomerDrawer">更换</a-button>
            <a-button type="link" size="small" danger @click.stop="clearCustomer">清除</a-button>
          </a-space>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="cart.items.length > 0" class="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <a-checkbox v-model:checked="selectionMode" @change="onSelectionModeChange">
          <span class="text-sm text-gray-600">批量操作</span>
        </a-checkbox>
        <div v-if="selectionMode && selectedItemIds.size > 0" class="flex gap-2">
          <a-button size="small" @click="selectAll">全选</a-button>
          <a-button size="small" type="primary" @click="batchPriceModalVisible = true">
            批量改价 ({{ selectedItemIds.size }})
          </a-button>
        </div>
      </div>

      <!-- 购物车列表区域 -->
      <div class="flex-1 overflow-y-auto bg-[#fafaf9] p-3">
        <a-empty v-if="cart.items.length === 0" description="购物车为空，请从左侧选择商品" class="mt-20" />

        <div v-else class="space-y-2">
          <div v-for="item in cart.items" :key="item.id" class="bg-white p-3 rounded-lg shadow-sm border border-gray-100" :class="{ 'ring-2 ring-pink-300': selectionMode && selectedItemIds.has(item.id) }">
            <!-- 行1：名称/操作 -->
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-start gap-2">
                <a-checkbox
                  v-if="selectionMode"
                  :checked="selectedItemIds.has(item.id)"
                  @change="toggleItemSelection(item.id)"
                  class="mt-0.5"
                />
              <div class="font-medium text-gray-800 leading-tight">
                {{ item.productName }}
                <a-tag v-if="item.grade" class="ml-1 text-[10px]">{{ item.grade }}</a-tag>
                <div class="text-xs text-gray-400 mt-0.5">{{ item.specification }}</div>
              </div>
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
            <div class="text-[32px] font-bold text-pink-600 font-display tracking-tight leading-none">¥{{ total.toFixed(2) }}</div>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-3 p-4 bg-white border-t border-gray-100">
          <a-button size="large" class="w-1/3 font-bold text-gray-600 h-14 rounded-xl" :disabled="cart.items.length === 0">
            挂单 (Ctrl+S)
          </a-button>
          <a-button type="primary" size="large" class="bg-gradient-to-r from-pink-500 to-pink-600 border-none w-2/3 font-bold text-xl h-14 rounded-xl shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 transition-transform" :disabled="cart.items.length === 0" @click="$emit('checkout')">
            结账 (Ctrl+Enter)
          </a-button>
        </div>
      </div>
    </template>

    <!-- 批量改价弹窗 -->
    <a-modal
      v-model:open="batchPriceModalVisible"
      title="批量改价"
      @ok="applyBatchPrice"
      @cancel="batchPriceModalVisible = false"
      destroy-on-close
      width="400px"
    >
      <div class="py-3">
        <div class="text-sm text-gray-500 mb-3">已选 {{ selectedItemIds.size }} 个商品</div>
        <a-radio-group v-model:value="batchPriceMode" class="mb-4">
          <a-radio value="fixed">统一定价</a-radio>
          <a-radio value="percentage">百分比调整</a-radio>
        </a-radio-group>
        <div v-if="batchPriceMode === 'fixed'">
          <a-input-number
            v-model:value="batchPriceValue"
            :min="0"
            :precision="2"
            class="w-full"
            size="large"
            prefix="¥"
            placeholder="统一单价"
            autofocus
          />
        </div>
        <div v-else>
          <a-input-number
            v-model:value="batchPriceValue"
            class="w-full"
            size="large"
            :formatter="(val: any) => `${val}%`"
            :parser="(val: any) => val.replace('%', '')"
            placeholder="如 -10 表示打9折，20 表示加价20%"
            autofocus
          />
          <div class="text-xs text-gray-400 mt-1">负数为折扣（如 -10 = 打9折），正数为加价</div>
        </div>
      </div>
    </a-modal>

    <!-- 客户选择抽屉 -->
    <a-drawer
      title="选择客户"
      placement="right"
      :open="customerDrawerVisible"
      :width="drawerWidth"
      :body-style="{ padding: 0, display: 'flex', flexDirection: 'column' }"
      @close="customerDrawerVisible = false"
    >
      <div class="p-4 border-b border-gray-100">
        <a-input-search
          v-model:value="customerSearchKeyword"
          placeholder="搜索姓名或手机号"
          allow-clear
          @search="fetchCustomers"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <a-empty v-if="!customersLoading && customers.length === 0" description="未找到匹配的客户" />
        <div v-else class="space-y-2">
          <div
            v-for="c in customers"
            :key="c.id"
            class="p-3 border border-gray-200 rounded cursor-pointer hover:border-pink-500 hover:shadow-sm transition"
            @click="selectCustomer(c)"
          >
            <div class="flex justify-between items-center">
              <span class="font-bold text-gray-800">{{ c.name }}</span>
              <span class="text-xs text-gray-500 font-mono">{{ c.phone || '—' }}</span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <a-tag :color="getLevelColor(c.level)">{{ getLevelName(c.level) }}</a-tag>
              <span v-if="c.balance < 0" class="text-xs text-red-500 font-medium">欠款 ¥{{ Math.abs(c.balance).toFixed(2) }}</span>
              <span v-else-if="c.balance > 0" class="text-xs text-green-600 font-medium">预存 ¥{{ c.balance.toFixed(2) }}</span>
              <span v-else class="text-xs text-gray-400">—</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
        <a-button class="flex-1" @click="openNewCustomerForm">
          <template #icon><PlusOutlined /></template>
          新增客户
        </a-button>
        <a-button class="flex-1" danger :disabled="!cart?.customerId" @click="clearCustomer">
          清除选择
        </a-button>
      </div>
    </a-drawer>

    <!-- 新增客户表单 -->
    <CustomerForm
      v-model:visible="newCustomerFormVisible"
      :customer="null"
      @success="onNewCustomerCreated"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useCartStore } from '~/stores/cart'
import { useCustomers } from '~/composables/useCustomers'
import CustomerForm from '~/components/customers/CustomerForm.vue'
import debounce from 'lodash-es/debounce'

defineEmits(['checkout'])

const cartStore = useCartStore()
const { searchCustomers } = useCustomers()

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
const customersLoading = ref(false)
const newCustomerFormVisible = ref(false)

// 抽屉宽度：手机端 100%
const drawerWidth = ref<number | string>(400)
const updateDrawerWidth = () => {
  drawerWidth.value = typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 400
}
onMounted(() => {
  updateDrawerWidth()
  window.addEventListener('resize', updateDrawerWidth)
})
onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateDrawerWidth)
})

const fetchCustomers = async () => {
  customersLoading.value = true
  try {
    const data = await searchCustomers(customerSearchKeyword.value || '')
    customers.value = data.list || []
  } catch {
    customers.value = []
  } finally {
    customersLoading.value = false
  }
}

const openCustomerDrawer = () => {
  customerDrawerVisible.value = true
}

watch(customerDrawerVisible, (val) => {
  if (val) fetchCustomers()
})

watch(customerSearchKeyword, debounce(fetchCustomers, 300))

const applyCustomer = (c: any | null) => {
  if (cart.value) {
    cartStore.setCustomer(cart.value.id, c)
  }
}

const confirmAndApply = (c: any | null, onDone: () => void) => {
  if (!cart.value) return
  const hasItems = cart.value.items.length > 0
  const isSwitching =
    (c && cart.value.customerId !== c.id) || (!c && cart.value.customerId !== null)

  if (hasItems && isSwitching) {
    Modal.confirm({
      title: '切换客户将重新计算价格',
      content: '当前购物车有商品，按新客户等级重算单价后金额可能变动，确认继续？',
      okText: '确认切换',
      cancelText: '取消',
      onOk() {
        applyCustomer(c)
        onDone()
      },
    })
  } else {
    applyCustomer(c)
    onDone()
  }
}

const selectCustomer = (c: any) => {
  confirmAndApply(c, () => {
    customerDrawerVisible.value = false
  })
}

const clearCustomer = () => {
  confirmAndApply(null, () => {
    customerDrawerVisible.value = false
  })
}

const openNewCustomerForm = () => {
  newCustomerFormVisible.value = true
}

const onNewCustomerCreated = (newCustomer: any) => {
  // 自动选中刚创建的客户
  if (cart.value) {
    cartStore.setCustomer(cart.value.id, newCustomer)
  }
  newCustomerFormVisible.value = false
  customerDrawerVisible.value = false
  // 刷新搜索列表
  fetchCustomers()
}

const getLevelName = (level: string) => {
  const map: any = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || '普通'
}

const getLevelColor = (level: string) => {
  const map: any = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}

// 批量操作
const selectionMode = ref(false)
const selectedItemIds = ref<Set<string>>(new Set())
const batchPriceModalVisible = ref(false)
const batchPriceMode = ref<'fixed' | 'percentage'>('fixed')
const batchPriceValue = ref<number>(0)

const onSelectionModeChange = () => {
  if (!selectionMode.value) {
    selectedItemIds.value = new Set()
  }
}

const toggleItemSelection = (id: string) => {
  const newSet = new Set(selectedItemIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedItemIds.value = newSet
}

const selectAll = () => {
  if (!cart.value) return
  selectedItemIds.value = new Set(cart.value.items.map((i) => i.id))
}

const applyBatchPrice = () => {
  if (!cart.value || selectedItemIds.value.size === 0) return
  cartStore.batchUpdatePrices(cart.value.id, [...selectedItemIds.value], {
    type: batchPriceMode.value,
    value: batchPriceValue.value,
  })
  batchPriceModalVisible.value = false
  selectedItemIds.value = new Set()
  selectionMode.value = false
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
