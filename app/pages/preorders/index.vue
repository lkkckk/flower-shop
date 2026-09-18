<template>
  <div class="preorders-page">
    <a-card class="page-card">
      <div class="page-header-row">
        <div>
          <h1 class="text-xl font-bold text-gray-800">预售管理</h1>
          <p class="text-xs text-gray-500 mt-1">独立预售自由登记，不占用库存与账务，随时登记、随心打印。</p>
        </div>
        <div>
          <a-button type="primary" size="large" @click="goNew">
            <template #icon><PlusOutlined /></template>
            预售登记
          </a-button>
        </div>
      </div>

      <a-tabs v-model:activeKey="activeTab" class="mt-4" @change="onTabChange">
        <!-- Tab 1: 登记记录 (新自由登记) -->
        <a-tab-pane key="registrations" tab="登记记录">
          <div class="toolbar">
            <div class="toolbar-left">
              <a-input-search
                v-model:value="regKeyword"
                placeholder="搜索订单编号 / 电话 / 商品名称"
                allow-clear
                class="search-input"
                @search="loadRegList"
              />
              <a-range-picker
                v-model:value="regDeliveryRange"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :allow-clear="true"
                :placeholder="['履约开始', '履约结束']"
                @change="loadRegList"
              />
              <a-button @click="resetRegFilter">重置</a-button>
            </div>
          </div>

          <!-- 桌面/平板表格 -->
          <div class="hidden sm:block mt-4">
            <a-table
              :columns="regColumns"
              :data-source="regList"
              :loading="regLoading"
              :pagination="false"
              row-key="id"
              size="middle"
              :scroll="{ x: 900 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'orderNo'">
                  <div>
                    <span class="font-bold text-gray-800 text-base">{{ record.orderNo }}</span>
                    <span class="text-xs text-gray-400 ml-2">#{{ record.id }}</span>
                  </div>
                </template>

                <template v-else-if="column.key === 'contactPhone'">
                  <span>{{ record.contactPhone || '-' }}</span>
                </template>

                <template v-else-if="column.key === 'deliveryTime'">
                  <div class="text-sm font-medium text-pink-700">
                    {{ record.deliveryTime ? formatDateTime(record.deliveryTime) : '未指定时间' }}
                  </div>
                </template>

                <template v-else-if="column.key === 'summary'">
                  <div class="max-w-xs">
                    <div class="text-sm text-gray-800 line-clamp-2">{{ record.summary || '-' }}</div>
                    <div v-if="record.previewPhotos && record.previewPhotos.length > 0" class="flex gap-1 mt-1">
                      <img
                        v-for="(p, idx) in record.previewPhotos"
                        :key="idx"
                        :src="p"
                        class="w-7 h-7 object-cover rounded border border-gray-200"
                      />
                      <span v-if="record.totalPhotos > 4" class="text-xs text-gray-400 self-center">
                        +{{ record.totalPhotos - 4 }}
                      </span>
                    </div>
                  </div>
                </template>

                <template v-else-if="column.key === 'createdAt'">
                  <div class="text-xs text-gray-500">
                    <div>{{ formatDateTime(record.createdAt) }}</div>
                    <div class="text-gray-400">{{ record.createdBy?.name || '员工' }}</div>
                  </div>
                </template>

                <template v-else-if="column.key === 'action'">
                  <a-space size="small">
                    <a-button type="link" size="small" @click="goRegDetail(record.id)">详情</a-button>
                    <a-button type="link" size="small" @click="goRegEdit(record.id)">修改</a-button>
                    <a-button type="link" size="small" @click="goRegPrint(record.id)">打印配送单</a-button>
                    <a-popconfirm
                      v-if="isAdmin"
                      title="确定将此预售登记移入回收站吗？"
                      ok-text="移入回收站"
                      cancel-text="取消"
                      @confirm="onTrashReg(record.id)"
                    >
                      <a-button type="link" size="small" danger>移入回收站</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>

          <!-- 手机端卡片列表 -->
          <div class="sm:hidden mt-4 space-y-3">
            <a-spin :spinning="regLoading">
              <div v-if="regList.length === 0" class="text-center py-8 text-gray-400">暂无预售登记</div>
              <div
                v-for="record in regList"
                :key="record.id"
                class="bg-white border rounded-lg p-3 shadow-sm"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <span class="text-base font-bold text-gray-800">{{ record.orderNo }}</span>
                    <span class="text-xs text-gray-400 ml-1">#{{ record.id }}</span>
                  </div>
                  <div class="text-xs text-pink-600 font-medium">
                    {{ record.deliveryTime ? formatDateTime(record.deliveryTime) : '未指定时间' }}
                  </div>
                </div>

                <div v-if="record.contactPhone" class="text-xs text-gray-600 mt-1">
                  电话：{{ record.contactPhone }}
                </div>

                <div class="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                  {{ record.summary || '-' }}
                </div>

                <div v-if="record.previewPhotos && record.previewPhotos.length > 0" class="flex gap-1 mt-2">
                  <img
                    v-for="(p, idx) in record.previewPhotos"
                    :key="idx"
                    :src="p"
                    class="w-10 h-10 object-cover rounded border border-gray-200"
                  />
                  <span v-if="record.totalPhotos > 4" class="text-xs text-gray-400 self-center">
                    +{{ record.totalPhotos - 4 }}
                  </span>
                </div>

                <div class="flex justify-between items-center mt-3 pt-2 border-t text-xs">
                  <span class="text-gray-400">{{ formatDateTime(record.createdAt) }}</span>
                  <div class="space-x-1">
                    <a-button size="small" @click="goRegDetail(record.id)">详情</a-button>
                    <a-button size="small" @click="goRegEdit(record.id)">修改</a-button>
                    <a-button size="small" type="primary" ghost @click="goRegPrint(record.id)">打印</a-button>
                    <a-popconfirm
                      v-if="isAdmin"
                      title="移入回收站？"
                      @confirm="onTrashReg(record.id)"
                    >
                      <a-button size="small" danger>回收站</a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </div>
            </a-spin>
          </div>

          <div class="mt-4 flex justify-end">
            <a-pagination
              v-model:current="regPage"
              v-model:page-size="regPageSize"
              :total="regTotal"
              :show-size-changer="true"
              :show-total="(t: number) => `共 ${t} 条`"
              @change="loadRegList"
              @show-size-change="loadRegList"
            />
          </div>
        </a-tab-pane>

        <!-- Tab 2: 历史预售 (只读) -->
        <a-tab-pane key="history" tab="历史预售">
          <div class="toolbar">
            <div class="toolbar-left">
              <a-input-search
                v-model:value="oldKeyword"
                placeholder="搜索单号 / 客户 / 收货人 / 电话"
                allow-clear
                class="search-input"
                @search="loadOldList"
              />
              <a-range-picker
                v-model:value="oldDeliveryRange"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :allow-clear="true"
                :placeholder="['履约开始', '履约结束']"
                @change="loadOldList"
              />
              <a-select
                v-model:value="oldFilterStatus"
                placeholder="状态"
                allow-clear
                class="w-28"
                :options="oldStatusOptions"
                @change="loadOldList"
              />
              <a-button @click="resetOldFilter">重置</a-button>
            </div>
          </div>

          <div class="mt-4">
            <a-table
              :columns="oldColumns"
              :data-source="oldList"
              :loading="oldLoading"
              :pagination="false"
              row-key="id"
              size="middle"
              :scroll="{ x: 1000 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'orderNo'">
                  <span class="font-mono text-sm font-semibold">{{ record.orderNo }}</span>
                  <a-tag color="purple" class="ml-1">历史预售</a-tag>
                </template>

                <template v-else-if="column.key === 'deliveryTime'">
                  <div>{{ formatDateTime(record.deliveryTime) }}</div>
                  <a-tag v-if="record.reminderStage && record.reminderStage !== 'none'" :color="reminderColor(record.reminderStage)">
                    {{ reminderLabel(record.reminderStage) }}
                  </a-tag>
                </template>

                <template v-else-if="column.key === 'receiver'">
                  <div>{{ record.receiverName || '-' }}</div>
                  <div class="text-xs text-gray-400">{{ record.receiverPhone || '-' }}</div>
                </template>

                <template v-else-if="column.key === 'customer'">
                  <span v-if="record.customer">{{ record.customer.name }}</span>
                  <span v-else class="text-gray-400">散客</span>
                </template>

                <template v-else-if="column.key === 'totalAmount'">
                  <span class="font-bold text-pink-600">¥{{ Number(record.totalAmount).toFixed(2) }}</span>
                </template>

                <template v-else-if="column.key === 'status'">
                  <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
                </template>

                <template v-else-if="column.key === 'action'">
                  <a-space size="small">
                    <a-button type="link" size="small" @click="goOldDetail(record.id)">只读详情</a-button>
                    <a-button type="link" size="small" @click="goOldPrint(record.id)">打印配送单</a-button>
                    <a-popconfirm
                      v-if="isAdmin"
                      title="确定将此历史预售移入回收站吗？（不影响账务与库存）"
                      ok-text="移入回收站"
                      cancel-text="取消"
                      @confirm="onTrashOld(record.id)"
                    >
                      <a-button type="link" size="small" danger>移入回收站</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>

            <div class="mt-4 flex justify-end">
              <a-pagination
                v-model:current="oldPage"
                v-model:page-size="oldPageSize"
                :total="oldTotal"
                :show-size-changer="true"
                :show-total="(t: number) => `共 ${t} 条`"
                @change="loadOldList"
                @show-size-change="loadOldList"
              />
            </div>
          </div>
        </a-tab-pane>

        <!-- Tab 3: 回收站 (仅管理员可见) -->
        <a-tab-pane v-if="isAdmin" key="trash" tab="回收站">
          <div class="mb-4 flex items-center justify-between">
            <a-segmented v-model:value="trashSubTab" :options="trashSubOptions" @change="loadTrashList" />
            <a-button @click="loadTrashList">刷新回收站</a-button>
          </div>

          <div v-if="trashSubTab === 'reg_trash'">
            <a-table
              :columns="trashRegColumns"
              :data-source="trashRegList"
              :loading="trashLoading"
              :pagination="false"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'orderNo'">
                  <span class="font-bold">{{ record.orderNo }}</span>
                  <span class="text-xs text-gray-400 ml-1">#{{ record.id }}</span>
                </template>
                <template v-else-if="column.key === 'trashedAt'">
                  <span class="text-xs text-gray-500">
                    {{ formatDateTime(record.trashedAt) }}
                    <span v-if="record.trashedBy">({{ record.trashedBy.name }})</span>
                  </span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="onRestoreReg(record.id)">恢复</a-button>
                </template>
              </template>
            </a-table>
          </div>

          <div v-else>
            <a-table
              :columns="trashOldColumns"
              :data-source="trashOldList"
              :loading="trashLoading"
              :pagination="false"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'orderNo'">
                  <span class="font-bold">{{ record.orderNo }}</span>
                </template>
                <template v-else-if="column.key === 'trashedAt'">
                  <span class="text-xs text-gray-500">
                    {{ formatDateTime(record.trashedAt) }}
                    <span v-if="record.trashedBy">({{ record.trashedBy.name }})</span>
                  </span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="onRestoreOld(record.id)">恢复</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { usePreorderRegistrations } from '~/composables/usePreorderRegistrations'
import { usePreorders } from '~/composables/usePreorders'
import { useAuth } from '~/composables/useAuth'

useHead({ title: '预售管理 - 花店管理系统' })

const router = useRouter()
const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

const activeTab = ref('registrations')

// 1. 新预售登记状态
const {
  loading: regLoading,
  fetchRegistrations,
  trashRegistration,
  restoreRegistration,
} = usePreorderRegistrations()

const regList = ref<any[]>([])
const regTotal = ref(0)
const regPage = ref(1)
const regPageSize = ref(20)
const regKeyword = ref('')
const regDeliveryRange = ref<[string, string] | null>(null)

const regColumns = [
  { title: '订单编号', key: 'orderNo', width: 180 },
  { title: '联系电话', key: 'contactPhone', width: 140 },
  { title: '取花/送花时间', key: 'deliveryTime', width: 170 },
  { title: '商品摘要及照片', key: 'summary' },
  { title: '登记时间', key: 'createdAt', width: 160 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

async function loadRegList() {
  const data = await fetchRegistrations({
    page: regPage.value,
    pageSize: regPageSize.value,
    q: regKeyword.value,
    deliveryStart: regDeliveryRange.value?.[0],
    deliveryEnd: regDeliveryRange.value?.[1],
    trashed: false,
  })
  regList.value = data.list
  regTotal.value = data.total
}

function resetRegFilter() {
  regKeyword.value = ''
  regDeliveryRange.value = null
  regPage.value = 1
  loadRegList()
}

function goNew() {
  router.push('/preorders/new')
}

function goRegDetail(id: number) {
  router.push(`/preorders/registrations/${id}`)
}

function goRegEdit(id: number) {
  router.push(`/preorders/registrations/${id}/edit`)
}

function goRegPrint(id: number) {
  window.open(`/preorders/registrations/${id}/delivery-slip`, '_blank')
}

async function onTrashReg(id: number) {
  await trashRegistration(id)
  await loadRegList()
}

// 2. 历史预售状态
const {
  loading: oldLoading,
  fetchList: fetchOldList,
  trashPreorder: trashOldPreorder,
  restorePreorder: restoreOldPreorder,
} = usePreorders()

const oldList = ref<any[]>([])
const oldTotal = ref(0)
const oldPage = ref(1)
const oldPageSize = ref(20)
const oldKeyword = ref('')
const oldDeliveryRange = ref<[string, string] | null>(null)
const oldFilterStatus = ref<string | undefined>(undefined)

const oldStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已排单', value: 'booked' },
  { label: '制作中', value: 'making' },
  { label: '配送中', value: 'delivering' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const oldColumns = [
  { title: '订单编号', key: 'orderNo', width: 170 },
  { title: '履约时间', key: 'deliveryTime', width: 160 },
  { title: '收花人', key: 'receiver', width: 140 },
  { title: '客户', key: 'customer', width: 110 },
  { title: '金额', key: 'totalAmount', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

async function loadOldList() {
  const data = await fetchOldList({
    page: oldPage.value,
    pageSize: oldPageSize.value,
    q: oldKeyword.value,
    status: oldFilterStatus.value,
    deliveryStart: oldDeliveryRange.value?.[0],
    deliveryEnd: oldDeliveryRange.value?.[1],
  })
  oldList.value = data.list
  oldTotal.value = data.total
}

function resetOldFilter() {
  oldKeyword.value = ''
  oldDeliveryRange.value = null
  oldFilterStatus.value = undefined
  oldPage.value = 1
  loadOldList()
}

function goOldDetail(id: number) {
  router.push(`/preorders/${id}`)
}

function goOldPrint(id: number) {
  window.open(`/preorders/${id}/delivery-slip`, '_blank')
}

async function onTrashOld(id: number) {
  await trashOldPreorder(id)
  await loadOldList()
}

// 3. 回收站状态
const trashSubTab = ref('reg_trash')
const trashSubOptions = [
  { label: '新登记回收站', value: 'reg_trash' },
  { label: '历史预售回收站', value: 'old_trash' },
]

const trashLoading = ref(false)
const trashRegList = ref<any[]>([])
const trashOldList = ref<any[]>([])

const trashRegColumns = [
  { title: '订单编号', key: 'orderNo', width: 160 },
  { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
  { title: '商品摘要', dataIndex: 'summary' },
  { title: '移入时间与操作人', key: 'trashedAt', width: 200 },
  { title: '操作', key: 'action', width: 100 },
]

const trashOldColumns = [
  { title: '订单编号', key: 'orderNo', width: 160 },
  { title: '收花人', dataIndex: 'receiverName', width: 140 },
  { title: '原订单金额', dataIndex: 'totalAmount', width: 120 },
  { title: '移入时间与操作人', key: 'trashedAt', width: 200 },
  { title: '操作', key: 'action', width: 100 },
]

async function loadTrashList() {
  if (!isAdmin.value) return
  trashLoading.value = true
  try {
    if (trashSubTab.value === 'reg_trash') {
      const data = await fetchRegistrations({ trashed: true, pageSize: 50 })
      trashRegList.value = data.list
    } else {
      const res: any = await $fetch('/api/preorders', { query: { trashed: 'true', pageSize: 50 } })
      trashOldList.value = res?.data?.list || []
    }
  } finally {
    trashLoading.value = false
  }
}

async function onRestoreReg(id: number) {
  await restoreRegistration(id)
  await loadTrashList()
}

async function onRestoreOld(id: number) {
  await restoreOldPreorder(id)
  await loadTrashList()
}

function onTabChange(tab: string) {
  if (tab === 'registrations') loadRegList()
  else if (tab === 'history') loadOldList()
  else if (tab === 'trash') loadTrashList()
}

const formatDateTime = (val?: string | Date) => {
  if (!val) return '-'
  return dayjs(val).format('YYYY-MM-DD HH:mm')
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending_confirm: '待确认',
    booked: '已排单',
    making: '制作中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    pending_confirm: 'orange',
    booked: 'cyan',
    making: 'blue',
    delivering: 'purple',
    completed: 'green',
    cancelled: 'default',
  }
  return map[status] || 'default'
}

const reminderLabel = (stage?: string) => {
  const map: Record<string, string> = {
    d7: '7天内',
    d3: '3天内',
    due: '今日到期',
    overdue: '已逾期',
  }
  return map[stage || ''] || ''
}

const reminderColor = (stage?: string) => {
  const map: Record<string, string> = {
    d7: 'blue',
    d3: 'orange',
    due: 'red',
    overdue: 'magenta',
  }
  return map[stage || ''] || 'default'
}

onMounted(() => {
  loadRegList()
})
</script>

<style scoped>
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.search-input {
  width: 280px;
}

@media (max-width: 640px) {
  .search-input {
    width: 100%;
  }
}
</style>
