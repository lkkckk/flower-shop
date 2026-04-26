<template>
  <div class="av-page dashboard">
    <section class="hero">
      <div class="hero-text">
        <h1>{{ greetingText }}，花店老板</h1>
        <div class="hero-meta">
          <span>{{ todayStr }}</span>
          <i />
          <span>今日店内 {{ todaySummary.orderCount }} 位员工已签到</span>
          <i />
          <span>气温 18° · 适合鲜花保养</span>
        </div>
      </div>
      <a-button type="primary" size="large" class="hero-cta" @click="router.push('/pos')">
        <template #icon><ShoppingCartOutlined /></template>
        立即开单
      </a-button>
    </section>

    <div class="kpi-grid">
      <a-card v-for="item in kpis" :key="item.label" class="metric-card kpi-card" :body-style="{ padding: '18px' }">
        <div class="kpi-top">
          <span>{{ item.label }}</span>
          <span class="kpi-icon" :class="item.tone"><component :is="item.icon" /></span>
        </div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-foot">
          <span>{{ item.sub }}</span>
          <b :class="{ attention: item.attention }">{{ item.meta }}</b>
        </div>
      </a-card>
    </div>

    <div class="main-grid">
      <a-card v-if="upcomingPreorders.length > 0" class="av-card upcoming-card">
        <template #title>
          即将履约预售单
          <a-tag color="green" class="ml-2">{{ upcomingPreorders.length }}</a-tag>
        </template>
        <template #extra>
          <a-button type="link" size="small" @click="router.push('/preorders')">查看全部</a-button>
        </template>
        <div class="reservation-list">
          <div
            v-for="item in upcomingPreorders.slice(0, 6)"
            :key="item.id"
            class="reservation"
            @click="router.push(`/preorders/${item.id}`)"
          >
            <div class="resv-day" :class="item.daysUntil <= 3 ? 'urgent' : ''">
              <b>{{ dayNumber(item.deliveryTime) }}</b>
              <span>{{ monthLabel(item.deliveryTime) }}</span>
            </div>
            <div class="resv-info">
              <div class="resv-title">
                <span class="mono">{{ item.orderNo }}</span>
                <b>{{ item.receiverName || item.customer?.name || '散客' }}</b>
                <a-tag v-if="item.reminderStage && item.reminderStage !== 'none'" :color="reminderColor(item.reminderStage)">
                  {{ reminderLabel(item.reminderStage) }}
                </a-tag>
              </div>
              <div class="resv-sub">
                {{ formatDeliveryTime(item.deliveryTime) }}
                <span v-if="item.daysUntil != null">
                  · {{ item.daysUntil < 0 ? `已逾期 ${-item.daysUntil} 天` : item.daysUntil === 0 ? '今日' : `还剩 ${item.daysUntil} 天` }}
                </span>
              </div>
            </div>
            <div class="resv-amount">
              <b>¥{{ Number(item.totalAmount).toFixed(2) }}</b>
              <span>{{ statusLabel(item.status) }}</span>
            </div>
          </div>
        </div>
      </a-card>

      <a-card class="av-card chart-card">
        <template #title>销售趋势 · 7 天</template>
        <template #extra>
          <a-button type="link" size="small" @click="router.push('/reports')">详情</a-button>
        </template>
        <div v-if="hasWeeklyTrend" class="trend-chart">
          <svg viewBox="0 0 420 180" preserveAspectRatio="none">
            <path class="grid-line" d="M0 45 H420 M0 90 H420 M0 135 H420" />
            <path class="area" :d="trendAreaPath" />
            <path class="line" :d="trendLinePath" />
          </svg>
          <div class="trend-labels">
            <span v-for="item in weeklyTrend" :key="item.date">{{ dayjs(item.date).format('MM/DD') }}</span>
          </div>
        </div>
        <div v-else class="trend-empty">
          <BarChartOutlined />
          <b>暂无近 7 天销售趋势</b>
          <span>有订单后这里会显示真实销售曲线。</span>
        </div>
        <div class="chart-summary">
          <div>
            <span>近 7 天累计</span>
            <b>¥{{ weeklySummary.totalSales.toFixed(2) }}</b>
          </div>
          <div>
            <span>订单数</span>
            <b>{{ weeklySummary.orderCount }} 单</b>
          </div>
          <div>
            <span>客单价</span>
            <b>¥{{ weeklySummary.avgOrderValue.toFixed(2) }}</b>
          </div>
        </div>
      </a-card>
    </div>

    <div class="lower-grid">
      <a-card class="av-card">
        <template #title>今日订单</template>
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
                    <span class="mono">{{ item.orderNo }}</span>
                    <span class="ml-2 font-medium">{{ item.customer?.name || '散客' }}</span>
                    <a-tag v-if="item.owedAmount > 0" color="red" class="ml-2">欠 ¥{{ item.owedAmount.toFixed(2) }}</a-tag>
                  </template>
                  <template #description>{{ formatTime(item.createdAt) }} · 已付 ¥{{ item.paidAmount.toFixed(2) }}</template>
                </a-list-item-meta>
                <b class="amount">¥{{ item.totalAmount.toFixed(2) }}</b>
              </a-list-item>
            </template>
          </a-list>
        </a-spin>
      </a-card>

      <a-card class="av-card">
        <template #title>
          临期与过期批次
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
                <a-tag :color="item._kind === 'expired' ? 'red' : 'orange'">{{ formatDistance(item.expiryDate) }}</a-tag>
              </a-list-item>
            </template>
          </a-list>
        </a-spin>
      </a-card>
    </div>

    <a-card title="快捷操作" class="av-card quick-card">
      <div class="quick-grid">
        <button v-for="action in quickActions" :key="action.title" class="quick-action" @click="router.push(action.path)">
          <component :is="action.icon" />
          <span>{{ action.title }}</span>
          <small>{{ action.sub }}</small>
        </button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  AccountBookOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { useStocks } from '~/composables/useStocks'
import { useReports } from '~/composables/useReports'
import { usePreorders } from '~/composables/usePreorders'
import { PREORDER_STATUS_LABEL } from '../../shared/preorderStatus'
import { REMINDER_STAGE_LABEL, REMINDER_STAGE_COLOR } from '../../shared/preorderReminder'

useHead({ title: '首页 - 花店管理系统' })

const router = useRouter()
const { fetchExpiring, loading } = useStocks()
const { fetchDashboard } = useReports()
const { fetchUpcoming } = usePreorders()

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
const upcomingPreorders = ref<any[]>([])

const formatDeliveryTime = (d: any) => dayjs(d).format('YYYY-MM-DD HH:mm')
const reminderColor = (s: string) => REMINDER_STAGE_COLOR[s as keyof typeof REMINDER_STAGE_COLOR] || 'default'
const reminderLabel = (s: string) => REMINDER_STAGE_LABEL[s as keyof typeof REMINDER_STAGE_LABEL] || ''
const statusLabel = (s: string) => PREORDER_STATUS_LABEL[s as keyof typeof PREORDER_STATUS_LABEL] || s

const todaySummary = ref({
  totalSales: 0,
  orderCount: 0,
  totalPaid: 0,
  totalOwed: 0,
  avgOrderValue: 0,
})

const weeklySummary = ref({
  totalSales: 0,
  orderCount: 0,
  avgOrderValue: 0,
})

const weeklyTrend = ref<Array<{ date: string; amount: number; orderCount: number; profit: number }>>([])

const hasWeeklyTrend = computed(() => weeklyTrend.value.some((item) => item.amount > 0 || item.orderCount > 0))

const trendPoints = computed(() => {
  const items = weeklyTrend.value
  if (items.length === 0) return []

  const width = 420
  const height = 180
  const top = 24
  const bottom = 30
  const maxAmount = Math.max(...items.map((item) => item.amount), 1)

  return items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : (index * width) / (items.length - 1)
    const y = height - bottom - (item.amount / maxAmount) * (height - top - bottom)
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
  })
})

const trendLinePath = computed(() => {
  const points = trendPoints.value
  if (points.length === 0) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
})

const trendAreaPath = computed(() => {
  const points = trendPoints.value
  if (points.length === 0) return ''
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
  const first = points[0]
  const last = points[points.length - 1]
  return `${line} L${last.x} 180 L${first.x} 180 Z`
})

const kpis = computed(() => [
  {
    label: '今日销售额',
    value: `¥${todaySummary.value.totalSales.toFixed(2)}`,
    sub: '含已收 + 欠款',
    meta: `已收 ¥${todaySummary.value.totalPaid.toFixed(2)}`,
    icon: DollarOutlined,
    tone: '',
    attention: false,
  },
  {
    label: '今日订单数',
    value: `${todaySummary.value.orderCount} 单`,
    sub: `客单价 ¥${todaySummary.value.avgOrderValue.toFixed(2)}`,
    meta: '今日',
    icon: ShoppingOutlined,
    tone: 'warm',
    attention: false,
  },
  {
    label: '今日新增欠款',
    value: `¥${todaySummary.value.totalOwed.toFixed(2)}`,
    sub: `已收 ¥${todaySummary.value.totalPaid.toFixed(2)}`,
    meta: todaySummary.value.totalOwed > 0 ? '需跟进' : '无欠款',
    icon: ExclamationCircleOutlined,
    tone: 'info',
    attention: todaySummary.value.totalOwed > 0,
  },
  {
    label: '临期批次',
    value: `${totalCount.value} 批`,
    sub: `包含已过期 ${expired.value.length} 批`,
    meta: totalCount.value > 0 ? `${totalCount.value} 待处理` : '正常',
    icon: ClockCircleOutlined,
    tone: 'warn',
    attention: totalCount.value > 0,
  },
])

const quickActions = [
  { title: '收银台', sub: '快速下单 / 收款', path: '/pos', icon: ShoppingCartOutlined },
  { title: '新增入库', sub: '登记进货批次', path: '/stocks/inbound', icon: InboxOutlined },
  { title: '客户对账', sub: '生成 / 打印对账单', path: '/payments', icon: AccountBookOutlined },
  { title: '经营报表', sub: '销售 / 毛利 / 榜单', path: '/reports', icon: BarChartOutlined },
  { title: '客户管理', sub: '会员 / 余额 / 欠款', path: '/customers', icon: TeamOutlined },
  { title: '订单记录', sub: '查询历史订单', path: '/orders', icon: FileTextOutlined },
]

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
const dayNumber = (d: string | Date) => dayjs(d).format('DD')
const monthLabel = (d: string | Date) => dayjs(d).format('MM月')

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
    // ignore dashboard auxiliary errors
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
    // ignore dashboard auxiliary errors
  }
}

const loadWeeklyDashboard = async () => {
  const end = dayjs()
  const start = end.subtract(6, 'day')
  try {
    const data = await fetchDashboard({
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    })
    weeklyTrend.value = data?.dailyTrend || []
    weeklySummary.value = {
      totalSales: data?.summary?.totalSales || 0,
      orderCount: data?.summary?.orderCount || 0,
      avgOrderValue: data?.summary?.avgOrderValue || 0,
    }
  } catch {
    weeklyTrend.value = []
    weeklySummary.value = {
      totalSales: 0,
      orderCount: 0,
      avgOrderValue: 0,
    }
  }
}

const loadTodayOrders = async () => {
  ordersLoading.value = true
  try {
    const today = dayjs().format('YYYY-MM-DD')
    const res: any = await ($fetch as any)('/api/orders', {
      query: { startDate: today, endDate: today, page: 1, pageSize: 10 },
    })
    if (res?.data?.list) todayOrders.value = res.data.list
  } catch {
    todayOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

const { checkLowStock } = useLowStockAlert()

const loadUpcomingPreorders = async () => {
  upcomingPreorders.value = await fetchUpcoming(7)
}

onMounted(() => {
  loadExpiring()
  loadTodayDashboard()
  loadWeeklyDashboard()
  loadTodayOrders()
  loadUpcomingPreorders()
  checkLowStock({ target: '/stocks/stocktake' })
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 32px;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 100% 0%, rgba(168, 185, 127, 0.34), transparent 50%),
    linear-gradient(135deg, var(--avo-700), var(--avo-800));
  color: #f4f2e5;
}

.hero::after {
  content: "";
  position: absolute;
  right: -36px;
  bottom: -58px;
  width: 250px;
  height: 250px;
  border: 38px solid rgba(255, 255, 255, 0.06);
  border-radius: 48% 52% 46% 54%;
}

.hero h1 {
  margin: 0;
  font-size: 25px;
  font-weight: 800;
}

.hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  color: rgba(244, 242, 229, 0.78);
  font-size: 13px;
}

.hero-meta i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(244, 242, 229, 0.42);
}

.hero-cta {
  position: relative;
  z-index: 1;
  background: #f4f2e5 !important;
  border-color: #f4f2e5 !important;
  color: var(--avo-800) !important;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ink-500);
  font-size: 13px;
}

.kpi-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--avo-50);
  color: var(--avo-700);
}

.kpi-icon.warm {
  background: rgba(201, 168, 118, 0.24);
  color: var(--pit-700);
}

.kpi-icon.info {
  background: rgba(74, 122, 140, 0.14);
  color: var(--info);
}

.kpi-icon.warn {
  background: rgba(200, 154, 58, 0.16);
  color: var(--warn);
}

.kpi-value {
  margin-top: 8px;
  color: var(--ink-900);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-foot {
  display: flex;
  justify-content: space-between;
  min-height: 34px;
  align-items: end;
  gap: 12px;
  margin-top: 22px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  color: var(--ink-500);
  font-size: 12px;
}

.kpi-foot b {
  color: var(--ok);
  white-space: nowrap;
}

.kpi-foot b.attention {
  color: var(--danger);
}

.main-grid,
.lower-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

.reservation {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid var(--line-soft);
  cursor: pointer;
}

.reservation:last-child {
  border-bottom: 0;
}

.reservation:hover .resv-info b {
  color: var(--avo-700);
}

.resv-day {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--avo-50);
  color: var(--avo-700);
}

.resv-day b {
  line-height: 1;
  font-size: 18px;
}

.resv-day span {
  margin-top: -8px;
  color: var(--ink-500);
  font-size: 10px;
}

.resv-day.urgent {
  background: rgba(184, 90, 61, 0.12);
  color: var(--danger);
}

.resv-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mono {
  color: var(--ink-400);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}

.resv-sub {
  margin-top: 4px;
  color: var(--ink-500);
  font-size: 12px;
}

.resv-amount {
  text-align: right;
}

.resv-amount b,
.amount {
  color: var(--ink-900);
  font-weight: 800;
}

.resv-amount span {
  display: block;
  margin-top: 3px;
  color: var(--ink-400);
  font-size: 11px;
}

.trend-chart {
  height: 220px;
  padding: 12px 0;
}

.trend-chart svg {
  width: 100%;
  height: 100%;
}

.grid-line {
  stroke: var(--line-soft);
  stroke-width: 1;
}

.area {
  fill: rgba(168, 185, 127, 0.16);
}

.line {
  fill: none;
  stroke: var(--avo-700);
  stroke-width: 3;
}

.trend-labels {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-top: -8px;
  color: var(--ink-400);
  font-size: 11px;
  text-align: center;
}

.trend-empty {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0;
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
  background: rgba(168, 185, 127, 0.08);
  color: var(--ink-500);
  text-align: center;
}

.trend-empty svg {
  color: var(--avo-600);
  font-size: 28px;
}

.trend-empty b {
  color: var(--ink-800);
}

.chart-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.chart-summary span {
  display: block;
  color: var(--ink-400);
  font-size: 12px;
}

.chart-summary b {
  display: block;
  margin-top: 4px;
  color: var(--ink-900);
  font-size: 18px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.quick-action {
  display: flex;
  min-height: 118px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--paper-2);
  color: var(--ink-700);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.quick-action:hover {
  border-color: var(--avo-300);
  background: var(--avo-50);
  transform: translateY(-2px);
}

.quick-action svg {
  color: var(--avo-700);
  font-size: 24px;
}

.quick-action span {
  font-weight: 800;
}

.quick-action small {
  color: var(--ink-500);
}

@media (max-width: 1180px) {
  .kpi-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid,
  .lower-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 22px;
  }

  .kpi-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .reservation {
    grid-template-columns: auto 1fr;
  }

  .resv-amount {
    grid-column: 2;
    text-align: left;
  }
}
</style>
