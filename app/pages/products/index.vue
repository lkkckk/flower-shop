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
          v-model:value="filters.category"
          class="w-full sm:w-32"
          placeholder="全部分类"
          allow-clear
          @change="handleFilterChange"
        >
          <a-select-option value="鲜切花">鲜切花</a-select-option>
          <a-select-option value="绿植">绿植</a-select-option>
          <a-select-option value="花束">花束</a-select-option>
          <a-select-option value="配材">配材</a-select-option>
          <a-select-option value="其他">其他</a-select-option>
        </a-select>
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
      <a-button type="primary" @click="openAddModal" class="bg-pink-500 hover:bg-pink-600 border-none shadow-sm flex items-center gap-1 shrink-0">
        <PlusOutlined /> 新增商品
      </a-button>
    </div>

    <!-- 主表格区域 -->
    <a-card :bordered="false" class="flex-1 shadow-sm border border-gray-100 overflow-hidden body-no-padding">
      <a-table
        :columns="columns"
        :data-source="products"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :scroll="{ x: 1000 }"
        size="middle"
        :locale="{ emptyText: '暂无商品数据' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grade'">
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
            <div class="flex gap-2 whitespace-nowrap">
              <a-button type="link" size="small" class="text-indigo-600 hover:text-indigo-800 p-0" @click="openEditModal(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要软删除该商品吗？（将设为停售状态）"
                @confirm="handleDelete(record.id)"
                ok-text="确定"
                cancel-text="取消"
                placement="topLeft"
              >
                <a-button type="link" size="small" danger class="p-0">删除</a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 商品表单弹窗 -->
    <ProductsProductForm
      v-model:visible="modalVisible"
      :product="editingProduct"
      @success="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import debounce from 'lodash-es/debounce'

useHead({ title: '商品管理 - 花店管理系统' })

const { fetchProducts, deleteProduct, loading } = useProducts()

// 状态
const products = ref<any[]>([])
const searchKeyword = ref('')
const filters = reactive({
  category: undefined as string | undefined,
  status: undefined as string | undefined,
})
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
  { title: '商品名称', dataIndex: 'name', key: 'name', fixed: 'left' as const, width: 200 },
  { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
  { title: '等级/规格/颜色', key: 'specs', width: 180, customRender: ({ record }: any) => {
      const parts = []
      if (record.color) parts.push(record.color)
      if (record.specification) parts.push(record.specification)
      return parts.join(' / ') || '-'
  } },
  { title: '等级', key: 'grade', width: 80 },
  { title: '单位配置', key: 'units', width: 180 },
  { title: '价格体系', key: 'price', width: 160 },
  { title: '花期(天)', dataIndex: 'shelfLifeDays', key: 'shelfLifeDays', width: 90, align: 'center' },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const, align: 'center' },
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
    const res = await fetchProducts({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value,
      category: filters.category,
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

// 删除操作
const handleDelete = async (id: number) => {
  await deleteProduct(id)
  loadData()
}

// 初始化
onMounted(() => {
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
</style>
