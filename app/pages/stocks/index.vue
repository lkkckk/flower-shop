<template>
  <div>
    <a-card class="page-card">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-radio-group v-model:value="view" button-style="solid" @change="onViewChange">
            <a-radio-button value="by_product">按商品</a-radio-button>
            <a-radio-button value="by_batch">按批次</a-radio-button>
          </a-radio-group>

          <a-select
            v-model:value="filterProductId"
            placeholder="筛选商品"
            allow-clear
            show-search
            :options="productOptions"
            :filter-option="filterOption"
            class="w-48"
            @change="onFilterChange"
          />

          <a-select
            v-if="view === 'by_batch'"
            v-model:value="filterStatus"
            placeholder="批次状态"
            allow-clear
            class="w-32"
            :options="statusOptions"
            @change="onFilterChange"
          />

          <span class="flex items-center gap-2 ml-1">
            <a-switch v-model:checked="onlyExpiring" size="small" @change="onFilterChange" />
            <span class="text-sm text-gray-600">仅看临期</span>
          </span>
        </div>

        <div class="toolbar-right">
          <a-button type="primary" @click="goInbound">
            <template #icon><PlusOutlined /></template>
            新增入库
          </a-button>
        </div>
      </div>

      <!-- 表格区域 -->
      <a-table
        :columns="currentColumns"
        :data-source="list"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 900 }"
        class="mt-4"
      >
        <template #bodyCell="{ column, record }">
          <!-- ===== 按商品视图 ===== -->
          <template v-if="view === 'by_product'">
            <template v-if="column.key === 'name'">
              <div class="font-medium text-gray-800">
                {{ record.name }}
                <a-tag v-if="record.grade" :color="getGradeColor(record.grade)" class="ml-1">{{ record.grade }}</a-tag>
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                <span v-if="record.specification">{{ record.specification }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'category'">
              <span class="text-gray-600">{{ record.category || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'totalStock'">
              <span :class="stockColorClass(record.totalStock)">
                {{ formatQty(record.totalStock) }} {{ record.baseUnit }}
              </span>
            </template>

            <template v-else-if="column.key === 'batchCount'">
              <a-tag color="blue">{{ record.batchCount }} 批</a-tag>
            </template>

            <template v-else-if="column.key === 'earliestExpiry'">
              <template v-if="record.earliestExpiry">
                <span :class="expiryColorClass(record.earliestExpiry)">
                  {{ formatDate(record.earliestExpiry) }}
                  <span class="text-xs ml-1">({{ formatDistance(record.earliestExpiry) }})</span>
                </span>
              </template>
              <span v-else class="text-gray-400">-</span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="viewBatchesOf(record)">查看批次</a-button>
            </template>
          </template>

          <!-- ===== 按批次视图 ===== -->
          <template v-else>
            <template v-if="column.key === 'batchNo'">
              <span class="font-mono text-sm">{{ record.batchNo }}</span>
            </template>

            <template v-else-if="column.key === 'productName'">
              <div class="font-medium">{{ record.product?.name }}</div>
              <div class="text-xs text-gray-400">
                <a-tag v-if="record.product?.grade" :color="getGradeColor(record.product.grade)" class="mr-1">
                  {{ record.product.grade }}
                </a-tag>
                <span v-if="record.product?.specification">{{ record.product.specification }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'inboundDate'">
              {{ formatDate(record.inboundDate) }}
            </template>

            <template v-else-if="column.key === 'expiryDate'">
              <span :class="expiryColorClass(record.expiryDate)">
                {{ formatDate(record.expiryDate) }}
                <span class="text-xs ml-1">({{ formatDistance(record.expiryDate) }})</span>
              </span>
            </template>

            <template v-else-if="column.key === 'qty'">
              <span :class="stockColorClass(record.currentQty, record.inboundQty)">
                {{ formatQty(record.inboundQty) }} / {{ formatQty(record.currentQty) }}
              </span>
              <span class="text-xs text-gray-400 ml-1">{{ record.product?.baseUnit }}</span>
            </template>

            <template v-else-if="column.key === 'costPrice'">
              <span class="text-pink-600">¥{{ record.costPrice?.toFixed(2) }}</span>
            </template>

            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="onScrap(record)">报损</a-button>
            </template>
          </template>
        </template>
      </a-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-total="(t: number) => `共 ${t} 条`"
          @change="loadList"
          @show-size-change="loadList"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useStocks } from '~/composables/useStocks'
import { useProducts } from '~/composables/useProducts'

useHead({ title: '库存管理 - 花店管理系统' })

const route = useRoute()
const router = useRouter()
const { fetchStocks, loading } = useStocks()
const { fetchProducts } = useProducts()

const view = ref<'by_product' | 'by_batch'>('by_product')
const filterProductId = ref<number | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const onlyExpiring = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref<any[]>([])
const productOptions = ref<{ value: number; label: string }[]>([])

const statusOptions = [
  { value: 'in_stock', label: '在库' },
  { value: 'sold_out', label: '售罄' },
  { value: 'scrapped', label: '已报损' },
  { value: 'discounted', label: '已折价' },
]

// 列定义
const productColumns = [
  { title: '商品', key: 'name', width: 220 },
  { title: '分类', key: 'category', width: 100 },
  { title: '总库存', key: 'totalStock', width: 120 },
  { title: '批次数', key: 'batchCount', width: 100 },
  { title: '最早到期', key: 'earliestExpiry', width: 180 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' as const },
]

const batchColumns = [
  { title: '批次号', key: 'batchNo', width: 150 },
  { title: '商品', key: 'productName', width: 200 },
  { title: '入库日期', key: 'inboundDate', width: 110 },
  { title: '到期日期', key: 'expiryDate', width: 180 },
  { title: '入库/当前', key: 'qty', width: 140 },
  { title: '进价', key: 'costPrice', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' as const },
]

const currentColumns = computed(() => (view.value === 'by_product' ? productColumns : batchColumns))

// 加载商品筛选下拉
const loadProductOptions = async () => {
  try {
    const data = await fetchProducts({ pageSize: 200, status: 'active' })
    productOptions.value = data.list.map((p: any) => ({
      value: p.id,
      label: `${p.name}${p.specification ? ' · ' + p.specification : ''}`,
    }))
  } catch (e) {
    // ignore
  }
}

// 加载列表
const loadList = async () => {
  try {
    const data = await fetchStocks({
      view: view.value,
      page: page.value,
      pageSize: pageSize.value,
      productId: filterProductId.value,
      status: filterStatus.value,
      expiringSoon: onlyExpiring.value,
    })
    list.value = data.list
    total.value = data.total
  } catch (e) {
    list.value = []
    total.value = 0
  }
}

// 切换视图
const onViewChange = () => {
  page.value = 1
  if (view.value === 'by_product') {
    filterStatus.value = undefined
  }
  loadList()
}

const onFilterChange = () => {
  page.value = 1
  loadList()
}

const viewBatchesOf = (record: any) => {
  view.value = 'by_batch'
  filterProductId.value = record.id
  page.value = 1
  loadList()
}

const onScrap = (_record: any) => {
  message.info('报损功能即将上线')
}

const goInbound = () => {
  router.push('/stocks/inbound')
}

// 工具函数
const formatDate = (d: string | Date) => dayjs(d).format('YYYY-MM-DD')

const formatDistance = (d: string | Date) => {
  const days = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days < 0) return `已过期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `${days} 天后`
}

const expiryColorClass = (d: string | Date) => {
  const days = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days < 0) return 'text-red-600 font-semibold bg-red-50 px-1 rounded'
  if (days <= 3) return 'text-red-500 font-medium'
  return 'text-gray-700'
}

const stockColorClass = (current: number, total?: number) => {
  if (current <= 0) return 'text-gray-400'
  if (typeof total === 'number' && total > 0) {
    const ratio = current / total
    if (ratio > 0.3) return 'text-green-600 font-medium'
    if (ratio >= 0.1) return 'text-yellow-600 font-medium'
    return 'text-red-500 font-bold'
  }
  // 按商品视图：用绝对量启发式
  if (current > 30) return 'text-green-600 font-medium'
  if (current >= 10) return 'text-yellow-600 font-medium'
  return 'text-red-500 font-bold'
}

const formatQty = (n: number) => {
  if (n === undefined || n === null) return 0
  return Number.isInteger(n) ? n : n.toFixed(2)
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A级': return 'red'
    case 'B级': return 'orange'
    case 'C级': return 'default'
    default: return 'default'
  }
}

const statusColor = (s: string) => {
  switch (s) {
    case 'in_stock': return 'green'
    case 'sold_out': return 'default'
    case 'scrapped': return 'red'
    case 'discounted': return 'orange'
    default: return 'default'
  }
}

const statusText = (s: string) => {
  switch (s) {
    case 'in_stock': return '在库'
    case 'sold_out': return '售罄'
    case 'scrapped': return '已报损'
    case 'discounted': return '已折价'
    default: return s
  }
}

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 监听 query 参数（首页跳过来时支持 expiringSoon=true）
watch(
  () => route.query,
  (q) => {
    if (q.expiringSoon === 'true') {
      onlyExpiring.value = true
      view.value = 'by_batch'
    }
    if (q.productId) {
      filterProductId.value = Number(q.productId)
    }
    if (q.view === 'by_batch' || q.view === 'by_product') {
      view.value = q.view
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await loadProductOptions()
  await loadList()
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
