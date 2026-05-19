<template>
  <div class="h-full flex flex-col items-stretch max-w-7xl mx-auto w-full">
    <!-- 顶部工具栏 -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索商品名称"
          class="w-full sm:w-64"
          allow-clear
        />
        <a-select
          v-model:value="filters.status"
          class="w-full sm:w-32"
          placeholder="全部状态"
          allow-clear
          @change="handleFilterChange"
        >
          <a-select-option value="active">在售</a-select-option>
          <a-select-option value="inactive">停售</a-select-option>
        </a-select>
      </div>
      <div class="flex gap-2 shrink-0">
        <a-button @click="categoryDrawerVisible = true" class="flex items-center gap-1">分类设置</a-button>
        <a-button type="primary" @click="openAddModal" class="bg-pink-500 hover:bg-pink-600 border-none shadow-sm flex items-center gap-1">
          <PlusOutlined />
          <span class="add-button-label">{{ addButtonText }}</span>
        </a-button>
      </div>
    </div>

    <!-- 分类筛选 + 主表格区域 -->
    <div class="products-workspace">
      <a-card :bordered="false" class="category-panel shadow-sm border border-gray-100">
        <div class="category-panel-header">
          <span>商品分类</span>
          <a-button type="link" size="small" class="p-0" @click="categoryDrawerVisible = true">设置</a-button>
        </div>
        <a-button
          block
          class="category-all-button"
          :type="filters.categoryPath.length ? 'default' : 'primary'"
          @click="selectAllCategories"
        >
          全部商品
        </a-button>
        <a-tree
          v-if="categoryOptions.length"
          :tree-data="categoryOptions"
          :field-names="{ title: 'name', key: 'id', children: 'children' }"
          :selected-keys="selectedCategoryKeys"
          default-expand-all
          class="product-category-tree"
          @select="handleCategorySelect"
        />
        <a-empty v-else description="暂无分类" class="category-empty" />
      </a-card>

      <a-card :bordered="false" class="product-table-card flex-1 shadow-sm border border-gray-100 overflow-hidden body-no-padding">
        <a-table
          :columns="columns"
          :data-source="products"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          row-key="id"
          :scroll="{ x: 1320 }"
          table-layout="fixed"
          size="middle"
          :locale="{ emptyText: '暂无商品数据' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'image'">
              <a-avatar
                shape="square"
                :size="36"
                :src="record.imageUrl || undefined"
                :style="{ background: '#fce7f3', fontSize: '18px' }"
              >
                <template v-if="!record.imageUrl">🌸</template>
              </a-avatar>
            </template>

            <template v-else-if="column.key === 'name'">
              <a-tooltip :title="record.name">
                <span class="product-name-cell">{{ record.name || '-' }}</span>
              </a-tooltip>
            </template>

            <template v-else-if="column.key === 'grade'">
              <a-tag v-if="record.grade" :color="getGradeColor(record.grade)">
                {{ record.grade }}
              </a-tag>
            </template>
            
            <template v-else-if="column.key === 'price'">
              <span class="font-medium text-pink-600">¥{{ record.defaultPrice?.toFixed(2) }}</span>
              <div v-if="record.vipPrice || record.wholesalePrice" class="text-xs text-gray-400 mt-1">
                <span v-if="record.vipPrice">V: ¥{{ record.vipPrice.toFixed(2) }} </span>
                <span v-if="record.wholesalePrice">批: ¥{{ record.wholesalePrice.toFixed(2) }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'units'">
              <div class="font-medium">{{ record.baseUnit }} <span class="text-xs text-gray-400 font-normal">(基础)</span></div>
              <div v-if="record.unitConversions?.length" class="text-xs text-gray-500 mt-1">
                <span v-for="(uc, idx) in record.unitConversions" :key="idx" class="mr-1">
                  1{{ uc.fromUnit }}={{ uc.toBaseQty }}{{ record.baseUnit }}
                </span>
              </div>
            </template>

            <template v-else-if="column.key === 'status'">
              <a-badge :status="record.status === 'active' ? 'success' : 'default'" :text="record.status === 'active' ? '在售' : '停售'" />
            </template>
            
            <template v-else-if="column.key === 'action'">
              <div class="product-action-buttons">
                <a-button type="link" size="small" class="text-indigo-600 hover:text-indigo-800 p-0" @click="openEditModal(record)">
                  编辑
                </a-button>
                <a-popconfirm
                  :title="record.status === 'active' ? '确定要停售该商品吗？' : '确定要恢复在售吗？'"
                  @confirm="handleToggleStatus(record)"
                  ok-text="确定"
                  cancel-text="取消"
                  placement="topLeft"
                >
                  <a-button type="link" size="small" class="p-0" :class="record.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'">
                    {{ record.status === 'active' ? '停售' : '恢复' }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-if="!isCashier"
                  title="确定要永久删除该商品吗？（有订单或库存时会拒绝）"
                  @confirm="handleForceDelete(record.id)"
                  ok-text="确定删除"
                  cancel-text="取消"
                  placement="topLeft"
                  ok-button-props="{ danger: true }"
                >
                  <a-button type="link" size="small" danger class="p-0">删除</a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 商品表单弹窗 -->
    <ProductsProductForm
      v-model:visible="modalVisible"
      :product="editingProduct"
      :default-category-path="editingProduct ? [] : filters.categoryPath"
      :hide-wholesale-price="isCashier"
      @success="loadData"
    />

    <!-- 分类管理抽屉 -->
    <a-drawer
      v-model:open="categoryDrawerVisible"
      title="分类设置"
      width="480"
      :closable="true"
      @after-open-change="handleCategoryDrawerOpenChange"
    >
      <ProductsCategoryManager />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import debounce from 'lodash-es/debounce'

useHead({ title: '商品管理 - 花店管理系统' })

const { fetchProducts, updateProduct, loading } = useProducts()
const { isCashier } = useAuth()

const categoryDrawerVisible = ref(false)

// 状态
const products = ref<any[]>([])
const searchKeyword = ref('')
const filters = reactive({
  categoryPath: [] as number[],
  status: undefined as string | undefined,
})

const categoryOptions = ref<any[]>([])
const loadCategories = async () => {
  try {
    const res: any = await $fetch('/api/categories')
    categoryOptions.value = res.data || []
  } catch {
    categoryOptions.value = []
  }
}

const selectedCategoryKeys = computed(() => {
  const path = filters.categoryPath
  return path.length ? [path[path.length - 1]] : []
})

const selectedCategoryName = computed(() => {
  const id = selectedCategoryKeys.value[0]
  if (!id) return ''
  const findName = (nodes: any[]): string => {
    for (const node of nodes) {
      if (node.id === id) return node.name
      if (node.children?.length) {
        const name = findName(node.children)
        if (name) return name
      }
    }
    return ''
  }
  return findName(categoryOptions.value)
})

const addButtonText = computed(() => {
  return selectedCategoryName.value ? `新增到${selectedCategoryName.value}` : '新增商品'
})

const findCategoryPath = (tree: any[], targetId: number, path: number[] = []): number[] => {
  for (const node of tree) {
    const nextPath = [...path, node.id]
    if (node.id === targetId) return nextPath
    if (node.children?.length) {
      const found = findCategoryPath(node.children, targetId, nextPath)
      if (found.length) return found
    }
  }
  return []
}

const selectAllCategories = () => {
  filters.categoryPath = []
  handleFilterChange()
}

const handleCategorySelect = (keys: (string | number)[]) => {
  const key = keys[0]
  if (!key) {
    selectAllCategories()
    return
  }
  filters.categoryPath = findCategoryPath(categoryOptions.value, Number(key))
  handleFilterChange()
}
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
})

const modalVisible = ref(false)
const editingProduct = ref<any | null>(null)

// 表格列定义
const columns = [
  { title: '图片', key: 'image', width: 60, fixed: 'left' as const },
  { title: '商品名称', dataIndex: 'name', key: 'name', fixed: 'left' as const, width: 120, ellipsis: true },
  { title: '分类', key: 'category', width: 120, customRender: ({ record }: any) => record.categoryRef?.name || record.category || '-' },
  { title: '等级/规格/颜色', key: 'specs', width: 180, customRender: ({ record }: any) => {
      const parts = []
      if (record.color) parts.push(record.color)
      if (record.specification) parts.push(record.specification)
      return parts.join(' / ') || '-'
  } },
  { title: '等级', key: 'grade', width: 80 },
  { title: '单位配置', key: 'units', width: 120 },
  { title: '价格体系', key: 'price', width: 120 },
  { title: '花期(天)', dataIndex: 'shelfLifeDays', key: 'shelfLifeDays', width: 90, align: 'center' },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const, align: 'center' },
]

// 辅助函数
const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A级': return 'red'
    case 'B级': return 'orange'
    case 'C级': return 'default'
    default: return 'default'
  }
}

// 数据加载
const loadData = async () => {
  try {
    const catId = filters.categoryPath?.length
      ? filters.categoryPath[filters.categoryPath.length - 1]
      : undefined
    const res = await fetchProducts({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value,
      categoryId: catId,
      status: filters.status,
    })
    products.value = res.list
    pagination.total = res.total
  } catch (error) {
    // 错误已在 composable 中处理
  }
}

// 事件处理
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

const handleFilterChange = () => {
  pagination.current = 1
  loadData()
}

const debouncedSearch = debounce(() => {
  pagination.current = 1
  loadData()
}, 300)

watch(searchKeyword, () => {
  debouncedSearch()
})

// 弹窗操作
const openAddModal = () => {
  editingProduct.value = null
  modalVisible.value = true
}

const openEditModal = (record: any) => {
  editingProduct.value = record
  modalVisible.value = true
}

const handleCategoryDrawerOpenChange = (open: boolean) => {
  if (!open) {
    loadCategories()
    loadData()
  }
}

// 停售 / 恢复
const handleToggleStatus = async (record: any) => {
  try {
    await $fetch(`/api/products/${record.id}`, {
      method: 'PUT',
      body: { ...record, status: record.status === 'active' ? 'inactive' : 'active' },
    })
    message.success(record.status === 'active' ? '已停售' : '已恢复在售')
    loadData()
  } catch (e: any) {
    message.error(e.message || '操作失败')
  }
}

// 真删除
const handleForceDelete = async (id: number) => {
  try {
    const res: any = await $fetch(`/api/products/${id}?force=true`, { method: 'DELETE' })
    if (res.error) {
      message.error(res.error.message || '删除失败')
    } else {
      message.success('商品已永久删除')
      loadData()
    }
  } catch (e: any) {
    message.error(e.data?.error?.message || e.message || '删除失败')
  }
}

// 初始化
onMounted(() => {
  loadCategories()
  loadData()
})
</script>

<style scoped>
:deep(.body-no-padding .ant-card-body) {
  padding: 0;
}

:deep(.ant-table-wrapper) {
  border-radius: 0;
}

.products-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 16px;
}

.product-table-card {
  min-width: 0;
}

.add-button-label {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.category-panel {
  width: 240px;
  flex: 0 0 240px;
  overflow: hidden;
}

.category-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--ink-900, #1f2618);
  font-weight: 600;
}

.category-all-button {
  margin-bottom: 12px;
  text-align: left;
}

.product-category-tree {
  max-height: calc(100vh - 250px);
  overflow: auto;
}

.category-empty {
  margin-top: 16px;
}

.product-action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 124px;
  white-space: nowrap;
}

.product-name-cell {
  display: block;
  max-width: 148px;
  overflow: hidden;
  color: var(--ink-900, #1f2618);
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.ant-table-cell-fix-left .product-name-cell) {
  max-width: 148px;
}

@media (max-width: 767px) {
  .products-workspace {
    flex-direction: column;
  }

  .category-panel {
    width: 100%;
    flex-basis: auto;
  }

  .product-category-tree {
    max-height: 220px;
  }
}
</style>
