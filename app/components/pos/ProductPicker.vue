<template>
  <div class="h-full flex flex-col bg-gray-50 border-r border-gray-200">
    <!-- 顶部搜索 -->
    <div class="p-4 bg-white border-b border-gray-200 flex gap-2">
      <a-input-search
        ref="searchInputRef"
        v-model:value="searchKeyword"
        placeholder="搜索商品名称 (快捷键 '/' 聚焦)"
        size="large"
        class="flex-1"
        allow-clear
      />
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧分类 -->
      <div class="w-28 bg-white border-r border-gray-200 overflow-y-auto">
        <a-menu
          v-model:selectedKeys="selectedCategories"
          mode="inline"
          :style="{ borderRight: 'none' }"
          @click="onCategoryClick"
        >
          <a-menu-item key="all">全部商品</a-menu-item>
          <a-menu-item key="鲜切花">鲜切花</a-menu-item>
          <a-menu-item key="绿植">绿植</a-menu-item>
          <a-menu-item key="花束">花束</a-menu-item>
          <a-menu-item key="配材">配材</a-menu-item>
          <a-menu-item key="其他">其他</a-menu-item>
        </a-menu>
      </div>

      <!-- 右侧商品列表 -->
      <div class="flex-1 overflow-y-auto p-2 bg-white">
        <a-table
          :columns="columns"
          :data-source="filteredProducts"
          :loading="loading"
          row-key="id"
          size="small"
          :pagination="false"
          :customRow="customRow"
          class="cursor-pointer"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="font-medium text-gray-800">{{ record.name }}</div>
              <div class="text-xs text-gray-400 mt-0.5">
                <a-tag v-if="record.grade" :color="getGradeColor(record.grade)" class="mr-1" style="font-size: 10px; padding: 0 4px; line-height: 16px;">{{ record.grade }}</a-tag>
                <span v-if="record.color">{{ record.color }} </span>
                <span v-if="record.specification">{{ record.specification }}</span>
              </div>
            </template>
            
            <template v-else-if="column.key === 'stock'">
              <span :class="{
                'text-green-600 font-medium': record.totalStock > 100,
                'text-yellow-600 font-medium': record.totalStock > 0 && record.totalStock <= 100,
                'text-red-500 font-bold': record.totalStock <= 0
              }">
                {{ record.totalStock }} {{ record.baseUnit }}
              </span>
            </template>
            
            <template v-else-if="column.key === 'price'">
              <span class="text-pink-600 font-medium">¥{{ record.defaultPrice?.toFixed(2) }}</span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-button type="primary" shape="circle" size="small" class="bg-pink-500 border-none" @click.stop="openAddModal(record)">
                <template #icon><PlusOutlined /></template>
              </a-button>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- 加入购物车弹窗 -->
    <a-modal
      v-model:open="addModalVisible"
      title="加入清单"
      @ok="handleAddToCart"
      @cancel="addModalVisible = false"
      :width="400"
      destroyOnClose
    >
      <div v-if="selectedProduct" class="py-4">
        <div class="mb-4">
          <h3 class="text-lg font-bold text-gray-800">{{ selectedProduct.name }}</h3>
          <div class="text-sm text-gray-500 mt-1">
            总库存：{{ selectedProduct.totalStock }} {{ selectedProduct.baseUnit }}
          </div>
        </div>

        <a-form layout="vertical">
          <a-form-item label="销售单位">
            <a-radio-group v-model:value="formUnit" class="w-full flex flex-wrap gap-2">
              <a-radio-button :value="selectedProduct.baseUnit">{{ selectedProduct.baseUnit }}</a-radio-button>
              <a-radio-button 
                v-for="uc in selectedProduct.unitConversions" 
                :key="uc.fromUnit" 
                :value="uc.fromUnit"
              >
                {{ uc.fromUnit }} <span class="text-xs text-gray-400">(= {{ uc.toBaseQty }}{{ selectedProduct.baseUnit }})</span>
              </a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="数量">
            <a-input-number 
              v-model:value="formQty" 
              :min="1" 
              class="w-full text-lg" 
              size="large" 
              autofocus
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import debounce from 'lodash-es/debounce'
import { useCartStore } from '~/stores/cart'
import { message } from 'ant-design-vue'

const cartStore = useCartStore()
const products = ref<any[]>([])
const loading = ref(false)

// 状态
const searchKeyword = ref('')
const selectedCategories = ref<string[]>(['all'])

const addModalVisible = ref(false)
const selectedProduct = ref<any>(null)
const formUnit = ref('')
const formQty = ref(1)

const searchInputRef = ref()

// API 请求
const fetchStoreProducts = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/products/with-stock')
    if (res.data) {
      products.value = res.data
    }
  } catch (error) {
    message.error('加载商品失败')
  } finally {
    loading.value = false
  }
}

// 暴露 focus 方法给快捷键使用
defineExpose({
  focusSearch: () => {
    searchInputRef.value?.focus()
  }
})

onMounted(() => {
  fetchStoreProducts()
})

const debouncedSearch = debounce(fetchStoreProducts, 300)

watch(searchKeyword, () => {
  debouncedSearch()
})

// 计算属性过滤
const filteredProducts = computed(() => {
  let list = products.value
  
  if (selectedCategories.value[0] !== 'all') {
    list = list.filter(p => p.category === selectedCategories.value[0])
  }
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(keyword))
  }
  
  return list
})

// 列定义
const columns = [
  { title: '商品信息', key: 'name', width: 140 },
  { title: '库存', key: 'stock', width: 70 },
  { title: '单价', key: 'price', width: 60 },
  { title: '', key: 'action', width: 40, align: 'center' },
]

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A级': return 'red'; case 'B级': return 'orange'; case 'C级': return 'default'; default: return 'default'
  }
}

const onCategoryClick = ({ key }: { key: string }) => {
  selectedCategories.value = [key]
}

const customRow = (record: any) => {
  return {
    onClick: () => {
      openAddModal(record)
    }
  }
}

const openAddModal = (product: any) => {
  selectedProduct.value = product
  formUnit.value = product.baseUnit
  formQty.value = 1
  addModalVisible.value = true
}

const handleAddToCart = () => {
  if (!cartStore.activeCartId) {
    message.error('请先新建一个开单')
    return
  }
  
  cartStore.addItem(
    cartStore.activeCartId,
    selectedProduct.value,
    formUnit.value,
    formQty.value
  )
  
  addModalVisible.value = false
}
</script>

<style scoped>
:deep(.ant-table-small) {
  font-size: 13px;
}
</style>
