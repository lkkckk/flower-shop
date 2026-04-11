<template>
  <div class="space-y-4">
    <!-- 欢迎条 -->
    <div class="welcome-bar">
      <div>
        <div class="welcome-title">{{ greetingText }}，花店老板 🌸</div>
        <div class="welcome-sub">{{ todayStr }} · 祝你生意兴隆</div>
      </div>
      <div class="welcome-actions">
        <a-button type="primary" size="large" @click="router.push('/pos')">
          <template #icon><ShoppingCartOutlined /></template>
          立即开单
        </a-button>
      </div>
    </div>

    <!-- 今日核心指标 -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="metric-card">
          <a-statistic
            title="今日销售额"
            :value="todaySummary.totalSales"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#db2777' }"
          />
          <div class="metric-footer text-gray-400 text-xs mt-2">
            <DollarOutlined />
            <span class="ml-1">含已收 + 欠款</span>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="metric-card">
          <a-statistic
            title="今日订单数"
            :value="todaySummary.orderCount"
            suffix="单"
            :value-style="{ color: '#2563eb' }"
          />
          <div class="metric-footer text-gray-400 text-xs mt-2">
            <ShoppingOutlined />
            <span class="ml-1">客单价 ¥{{ todaySummary.avgOrderValue.toFixed(2) }}</span>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="metric-card">
          <a-statistic
            title="今日新增欠款"
            :value="todaySummary.totalOwed"
            :precision="2"
            prefix="¥"
            :value-style="{ color: todaySummary.totalOwed > 0 ? '#dc2626' : '#9ca3af' }"
          />
          <div class="metric-footer text-gray-400 text-xs mt-2">
            <ExclamationCircleOutlined />
            <span class="ml-1">已收 ¥{{ todaySummary.totalPaid.toFixed(2) }}</span>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="metric-card">
          <a-statistic
            title="临期批次"
            :value="totalCount"
            suffix="批"
            :value-style="{ color: totalCount > 0 ? '#d97706' : '#9ca3af' }"
          />
          <div class="metric-footer text-gray-400 text-xs mt-2">
            <ClockCircleOutlined />
            <span class="ml-1">包含已过期 {{ expired.length }} 批</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 主内容区 -->
    <a-row :gutter="[16, 16]">
      <!-- 今日订单 -->
      <a-col :xs="24" :md="14">
        <a-card class="page-card h-full">
          <template #title>
            <span>今日订单</span>
            <a-tag v-if="todayOrders.length > 0" color="pink" class="ml-2">{{ todayOrders.length }}</a-tag>
          </template>
          <template #extra>
            <a-button type="link" size="small" @click="router.push('/pos')">去开单</a-button>
          </template>

          <a-spin :spinning="ordersLoading">
            <a-empty v-if="!ordersLoading && todayOrders.length === 0" description="今天还没有订单" />
            <a-list v-else :data-source="todayOrders" item-layout="horizontal">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>
                      <span class="font-mono text-xs text-gray-500">{{ item.orderNo }}</span>
                      <span class="ml-2 font-medium">{{ item.customer?.name || '散客' }}</span>
                      <a-tag v-if="item.owedAmount > 0" color="red" class="ml-2">欠 ¥{{ item.owedAmount.toFixed(2) }}</a-tag>
                    </template>
                    <template #description>
                      {{ formatTime(item.createdAt) }} · 已付 ¥{{ item.paidAmount.toFixed(2) }}
                    </template>
                  </a-list-item-meta>
                  <div class="text-right">
                    <div class="font-bold text-pink-600">¥{{ item.totalAmount.toFixed(2) }}</div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
        </a-card>
      </a-col>

      <!-- 临期批次 -->
      <a-col :xs="24" :md="10">
        <a-card class="page-card h-full">
          <template #title>
            <span>临期与过期批次</span>
            <a-tag v-if="totalCount > 0" color="red" class="ml-2">{{ totalCount }}</a-tag>
          </template>
          <template #extra>
            <a-button type="link" size="small" @click="goAllExpiring">查看全部</a-button>
          </template>

          <a-spin :spinning="loading">
            <a-empty v-if="!loading && displayList.length === 0" description="暂无临期批次" />
            <a-list v-else :data-source="displayList" item-layout="horizontal">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>
                      <span class="font-medium">{{ item.product?.name }}</span>
                      <a-tag v-if="item.product?.grade" :color="getGradeColor(item.product.grade)" class="ml-2">
                        {{ item.product.grade }}
                      </a-tag>
                    </template>
                    <template #description>
                      剩余 <b>{{ formatQty(item.currentQty) }} {{ item.product?.baseUnit }}</b>
                      · 到期 {{ formatDate(item.expiryDate) }}
                    </template>
                  </a-list-item-meta>
                  <a-tag :color="item._kind === 'expired' ? 'red' : 'orange'">
                    {{ formatDistance(item.expiryDate) }}
                  </a-tag>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
        </a-card>
      </a-col>
    </a-row>

    <!-- 快捷操作 -->
    <a-card title="快捷操作" class="page-card">
      <a-row :gutter="[16, 16]">
        <a-col :xs="12" :sm="12" :md="6">
          <div class="quick-action quick-pink" @click="router.push('/pos')">
            <ShoppingCartOutlined class="quick-icon" />
            <div class="quick-title">开单收银</div>
            <div class="quick-sub">快速下单 / 收款</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <div class="quick-action quick-blue" @click="router.push('/stocks/inbound')">
            <InboxOutlined class="quick-icon" />
            <div class="quick-title">新增入库</div>
            <div class="quick-sub">登记进货批次</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <div class="quick-action quick-green" @click="router.push('/payments')">
            <FileTextOutlined class="quick-icon" />
            <div class="quick-title">客户对账</div>
            <div class="quick-sub">生成 / 打印对账单</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <div class="quick-action quick-orange" @click="router.push('/reports')">
            <BarChartOutlined class="quick-icon" />
            <div class="quick-title">经营报表</div>
            <div class="quick-sub">销售 / 毛利 / 榜单</div>
          </div>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue'
import { useStocks } from '~/composables/useStocks'
import { useReports } from '~/composables/useReports'

useHead({ title: '首页 - 花店管理系统' })

const router = useRouter()
const { fetchExpiring, loading } = useStocks()
const { fetchDashboard } = useReports()

const now = dayjs()
const todayStr = now.format('YYYY 年 MM 月 DD 日 dddd')

const greetingText = computed(() => {
  const hour = now.hour()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const expiring = ref<any[]>([])
const expired = ref<any[]>([])
const todayOrders = ref<any[]>([])
const ordersLoading = ref(false)

const todaySummary = ref({
  totalSales: 0,
  orderCount: 0,
  totalPaid: 0,
  totalOwed: 0,
  avgOrderValue: 0,
})

const displayList = computed(() => {
  const all = [
    ...expired.value.map((b) => ({ ...b, _kind: 'expired' })),
    ...expiring.value.map((b) => ({ ...b, _kind: 'expiring' })),
  ]
  return all.slice(0, 8)
})

const totalCount = computed(() => expiring.value.length + expired.value.length)

const formatDate = (d: string | Date) => dayjs(d).format('YYYY-MM-DD')
const formatTime = (d: string | Date) => dayjs(d).format('HH:mm')

const formatDistance = (d: string | Date) => {
  const days = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days < 0) return `已过期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `${days} 天后过期`
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A级': return 'red'
    case 'B级': return 'orange'
    case 'C级': return 'default'
    default: return 'default'
  }
}

const formatQty = (n: number) => {
  if (n === undefined || n === null) return 0
  return Number.isInteger(n) ? n : n.toFixed(2)
}

const goAllExpiring = () => {
  router.push('/stocks?expiringSoon=true&view=by_batch')
}

const loadExpiring = async () => {
  try {
    const data = await fetchExpiring()
    expiring.value = data.expiring || []
    expired.value = data.expired || []
  } catch {
    // ignore
  }
}

const loadTodayDashboard = async () => {
  const today = dayjs().format('YYYY-MM-DD')
  try {
    const data = await fetchDashboard({ startDate: today, endDate: today })
    if (data) {
      todaySummary.value = {
        totalSales: data.summary?.totalSales || 0,
        orderCount: data.summary?.orderCount || 0,
        totalPaid: data.summary?.totalPaid || 0,
        totalOwed: data.summary?.totalOwed || 0,
        avgOrderValue: data.summary?.avgOrderValue || 0,
      }
    }
  } catch {
    // ignore
  }
}

const loadTodayOrders = async () => {
  ordersLoading.value = true
  try {
    const today = dayjs().format('YYYY-MM-DD')
    const res: any = await ($fetch as any)('/api/orders', {
      query: { startDate: today, endDate: today, page: 1, pageSize: 10 },
    })
    if (res?.data?.list) {
      todayOrders.value = res.data.list
    }
  } catch {
    todayOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

onMounted(() => {
  loadExpiring()
  loadTodayDashboard()
  loadTodayOrders()
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.welcome-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #9d174d;
}

.welcome-sub {
  font-size: 13px;
  color: #be185d;
  margin-top: 4px;
}

.metric-card {
  border-radius: 8px;
}

.metric-card :deep(.ant-statistic-title) {
  color: #6b7280;
  font-size: 13px;
}

.metric-card :deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: bold;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  color: #fff;
}

.quick-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.quick-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.quick-title {
  font-size: 16px;
  font-weight: 600;
}

.quick-sub {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 2px;
}

.quick-pink {
  background: linear-gradient(135deg, #ec4899, #db2777);
}

.quick-blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.quick-green {
  background: linear-gradient(135deg, #10b981, #059669);
}

.quick-orange {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

@media (max-width: 768px) {
  .welcome-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
