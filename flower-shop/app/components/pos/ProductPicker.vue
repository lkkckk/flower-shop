<template>
  <div class="h-full flex flex-col bg-[#fafaf9] border-r border-[#f3f4f6]">
    <!-- 顶部搜索 -->
    <div class="p-4 bg-white border-b border-[#f3f4f6] flex gap-2">
      <a-input-search
        ref="searchInputRef"
        v-model:value="searchKeyword"
        placeholder="搜索商品名称 (快捷键 '/' 聚焦)"
        size="large"
        class="flex-1"
        allow-clear
      />
    </div>

    <div class="flex flex-1 overflow-hidden pt-2">
      <!-- 左侧分类（动态三级） -->
      <div class="w-36 bg-transparent overflow-y-auto px-2">
        <a-menu
          v-model:selectedKeys="selectedCategories"
          v-model:openKeys="openCategoryKeys"
          mode="inline"
          :style="{ borderRight: 'none' }"
          @click="onCategoryClick"
        >
          <a-menu-item key="all">全部商品</a-menu-item>
          <template v-for="cat in categoryTree" :key="`cat-${cat.id}`">
            <a-sub-menu v-if="cat.children?.length" :key="`sub-${cat.id}`">
              <template #title>{{ cat.name }}</template>
              <a-menu-item :key="`cat-${cat.id}`">全部 {{ cat.name }}</a-menu-item>
              <template v-for="sub in cat.children" :key="`cat-${sub.id}`">
                <a-sub-menu v-if="sub.children?.length" :key="`sub-${sub.id}`">
                  <template #title>{{ sub.name }}</template>
                  <a-menu-item :key="`cat-${sub.id}`">全部 {{ sub.name }}</a-menu-item>
                  <a-menu-item
                    v-for="leaf in sub.children"
                    :key="`cat-${leaf.id}`"
                  >{{ leaf.name }}</a-menu-item>
                </a-sub-menu>
                <a-menu-item v-else :key="`cat-${sub.id}`">{{ sub.name }}</a-menu-item>
              </template>
            </a-sub-menu>
            <a-menu-item v-else :key="`cat-${cat.id}`">{{ cat.name }}</a-menu-item>
          </template>
        </a-menu>
      </div>

      <!-- 右侧商品列表 -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
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
              <div class="flex items-center gap-2">
                <a-avatar
                  :size="36"
                  shape="square"
                  :src="record.imageUrl || undefined"
                  class="flex-shrink-0"
                  :style="{ background: '#fce7f3', fontSize: '18px' }"
                >
                  <template v-if="!record.imageUrl">🌸</template>
                </a-avatar>
                <div>
                  <div class="font-medium text-gray-800">{{ record.name }}</div>
                  <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <span v-if="record.grade" :class="[
                      'px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider',
                      record.grade === 'A级' ? 'bg-pink-100 text-pink-700' :
                      record.grade === 'B级' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    ]">{{ record.grade }}</span>
                    <span v-if="record.color">{{ record.color }} </span>
                    <span v-if="record.specification">{{ record.specification }}</span>
                  </div>
                </div>
              </div>
            </template>
            
            <template v-else-if="column.key === 'stock'">
              <span :class="{
                'text-sage-600 font-bold font-display tracking-tight': record.totalStock > 100,
                'text-amber-500 font-bold font-display tracking-tight': record.totalStock > 0 && record.totalStock <= 100,
                'text-red-500 font-bold': record.totalStock <= 0
              }">
                {{ record.totalStock }} {{ record.baseUnit }}
              </span>
            </template>
            
            <template v-else-if="column.key === 'price'">
              <span class="text-pink-600 font-bold font-display tracking-tight text-sm">¥{{ record.defaultPrice?.toFixed(2) }}</span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-tooltip :title="record.totalStock <= 0 ? '无库存' : ''">
                <a-button
                  type="primary"
                  shape="circle"
                  size="small"
                  class="bg-pink-500 hover:bg-pink-600 border-none shadow-md shadow-pink-500/20"
                  :disabled="record.totalStock <= 0"
                  @click.stop="openAddModal(record)"
                >
                  <template #icon><PlusOutlined /></template>
                </a-button>
              </a-tooltip>
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
const openCategoryKeys = ref<string[]>([])
const categoryTree = ref<any[]>([])

const fetchCategories = async () => {
  try {
    const res: any = await $fetch('/api/categories')
    categoryTree.value = res.data || []
  } catch {
    categoryTree.value = []
  }
}

// 收集分类树中所有后代 ID（含自身）
const collectDescendantIds = (tree: any[], targetId: number): number[] => {
  const result: number[] = []
  const walk = (nodes: any[], collecting: boolean) => {
    for (const n of nodes) {
      const isSelf = n.id === targetId
      if (isSelf || collecting) result.push(n.id)
      if (n.children?.length) walk(n.children, collecting || isSelf)
    }
  }
  walk(tree, false)
  return result
}

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
    if (res.error) {
      throw new Error(res.error.message)
    }
    products.value = res.data?.list || []
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
  // SPA 模式下组件可能在 auth 中间件重定向前就挂载，先检查 token 避免无效 401
  const { token } = useAuth()
  if (token.value) {
    fetchStoreProducts()
    fetchCategories()
  }
})

const debouncedSearch = debounce(fetchStoreProducts, 300)

watch(searchKeyword, () => {
  debouncedSearch()
})

// 计算属性过滤
const filteredProducts = computed(() => {
  let list = products.value
  const sel = selectedCategories.value[0]

  if (sel && sel !== 'all') {
    if (sel.startsWith('cat-')) {
      const cid = Number(sel.slice(4))
      const ids = new Set(collectDescendantIds(categoryTree.value, cid))
      list = list.filter(p => p.categoryId && ids.has(p.categoryId))
    }
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(keyword))
  }

  return list
})

// 列定义
const columns = [
  { title: '商品信息', key: 'name', width: 180 },
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
      if (record.totalStock <= 0) {
        message.warning('该商品当前无库存')
        return
      }
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
