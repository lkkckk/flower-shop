<template>
  <div class="min-h-screen bg-[#f7f7f4] p-4 md:p-6">
    <div class="mx-auto max-w-[1600px] space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">订单排单</h1>
          <p class="text-sm text-gray-500">按履约时间自动排序，快速查看预售花束制作与配送任务。</p>
        </div>
        <a-space wrap>
          <a-button type="primary" href="/orders/preparation">今日备货</a-button>
          <a-button href="/pos">返回收银</a-button>
        </a-space>
      </div>

      <a-card class="rounded-2xl shadow-sm" :body-style="{ padding: '16px' }">
        <div class="grid gap-3 md:grid-cols-[auto_180px_180px_180px_1fr_auto] md:items-center">
          <a-segmented v-model:value="filters.view" :options="viewOptions" @change="fetchOrders" />
          <a-date-picker v-model:value="filters.date" class="w-full" value-format="YYYY-MM-DD" @change="fetchOrders" />
          <a-select v-model:value="filters.fulfillmentType" class="w-full" @change="fetchOrders">
            <a-select-option value="">全部方式</a-select-option>
            <a-select-option value="delivery">配送</a-select-option>
            <a-select-option value="pickup">自提</a-select-option>
          </a-select>
          <a-select v-model:value="filters.isMade" class="w-full" @change="fetchOrders">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="false">未做好</a-select-option>
            <a-select-option value="true">已做好</a-select-option>
          </a-select>
          <a-input-search
            v-model:value="filters.keyword"
            allow-clear
            placeholder="搜索订单号、姓名、电话、地址、备注"
            @search="fetchOrders"
          />
          <a-button @click="fetchOrders">刷新</a-button>
        </div>
      </a-card>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">订单数</div>
          <div class="mt-1 text-2xl font-bold">{{ orders.length }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">未做好</div>
          <div class="mt-1 text-2xl font-bold text-orange-600">{{ unmadeCount }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">加急</div>
          <div class="mt-1 text-2xl font-bold text-red-600">{{ urgentCount }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">配送</div>
          <div class="mt-1 text-2xl font-bold text-green-600">{{ deliveryCount }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">自提</div>
          <div class="mt-1 text-2xl font-bold text-blue-600">{{ pickupCount }}</div>
        </a-card>
      </div>

      <a-spin :spinning="loading">
        <a-empty v-if="!loading && orders.length === 0" description="暂无排单订单" class="rounded-2xl bg-white py-16" />
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <OrderCard
            v-for="order in orders"
            :key="order.id"
            :order="order"
            @toggle-made="toggleMade"
            @toggle-urgent="toggleUrgent"
            @view-detail="openDetail"
          />
        </div>
      </a-spin>
    </div>

    <a-drawer v-model:open="detailVisible" width="560" title="订单详情">
      <template v-if="selectedOrder">
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="订单号">{{ selectedOrder.orderNo }}</a-descriptions-item>
          <a-descriptions-item label="收花人">{{ selectedOrder.receiverName }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ selectedOrder.receiverPhone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="履约时间">{{ selectedOrder.dateLabel }} {{ selectedOrder.timeLabel }}</a-descriptions-item>
          <a-descriptions-item label="方式">{{ selectedOrder.fulfillmentType === 'pickup' ? '自提' : '配送' }}</a-descriptions-item>
          <a-descriptions-item label="地址">{{ selectedOrder.deliveryAddress || '-' }}</a-descriptions-item>
          <a-descriptions-item label="金额">¥{{ Number(selectedOrder.totalAmount || 0).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="贺卡">{{ selectedOrder.cardMessage || '-' }}</a-descriptions-item>
          <a-descriptions-item label="备注">{{ selectedOrder.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider>商品明细</a-divider>
        <a-list :data-source="selectedOrder.items || []">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="`${item.qty}${item.unit || ''} × ¥${Number(item.unitPrice || 0).toFixed(2)}`">
                <template #avatar>
                  <a-avatar shape="square" :size="52" :src="item.imageUrl" />
                </template>
                <template #title>{{ item.productName }}</template>
              </a-list-item-meta>
              <div>¥{{ Number(item.subtotal || 0).toFixed(2) }}</div>
            </a-list-item>
          </template>
        </a-list>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import OrderCard from '~~/components/orders/OrderCard.vue'

definePageMeta({ layout: 'pos' })
useHead({ title: '订单排单 - 花店管理系统' })

const viewOptions = [
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '明日', value: 'tomorrow' },
  { label: '未来', value: 'future' },
]

const filters = reactive({
  view: 'all',
  date: dayjs().format('YYYY-MM-DD'),
  keyword: '',
  fulfillmentType: '',
  isMade: '',
})

const loading = ref(false)
const orders = ref<any[]>([])
const detailVisible = ref(false)
const selectedOrder = ref<any>(null)

const unmadeCount = computed(() => orders.value.filter((order) => !order.isMade).length)
const urgentCount = computed(() => orders.value.filter((order) => order.isUrgent).length)
const deliveryCount = computed(() => orders.value.filter((order) => order.fulfillmentType === 'delivery').length)
const pickupCount = computed(() => orders.value.filter((order) => order.fulfillmentType === 'pickup').length)

async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      view: filters.view,
      date: filters.date,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.fulfillmentType) params.fulfillmentType = filters.fulfillmentType
    if (filters.isMade) params.isMade = filters.isMade

    const result: any = await $fetch('/api/preorders/schedule', { params })
    orders.value = result.data || []
  } catch (error: any) {
    message.error(error?.data?.message || '加载排单失败')
  } finally {
    loading.value = false
  }
}

async function toggleMade(order: any) {
  const next = !order.isMade
  try {
    await $fetch(`/api/preorders/${order.id}/made`, {
      method: 'PATCH',
      body: { isMade: next },
    })
    order.isMade = next
    message.success(next ? '已标记为已做好' : '已取消已做好')
  } catch (error: any) {
    message.error(error?.data?.message || '更新制作状态失败')
  }
}

async function toggleUrgent(order: any) {
  const next = !order.isUrgent
  try {
    await $fetch(`/api/preorders/${order.id}/urgent`, {
      method: 'PATCH',
      body: { isUrgent: next },
    })
    order.isUrgent = next
    await fetchOrders()
    message.success(next ? '已设为加急' : '已取消加急')
  } catch (error: any) {
    message.error(error?.data?.message || '更新加急状态失败')
  }
}

function openDetail(order: any) {
  selectedOrder.value = order
  detailVisible.value = true
}

onMounted(fetchOrders)
</script>
