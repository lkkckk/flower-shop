<template>
  <div class="prep-board" :class="{ compact }">
    <div class="av-page-head">
      <div>
        <h1 class="av-page-title">今日备货</h1>
        <p class="av-page-sub">按预售订单汇总花束款式、总数量、配送和未完成情况。</p>
      </div>
      <a-space wrap>
        <a-button :href="compact ? '/pos/schedule' : '/orders/schedule'">订单排单</a-button>
        <a-date-picker v-model:value="date" value-format="YYYY-MM-DD" @change="fetchStats" />
        <a-button type="primary" @click="fetchStats">刷新统计</a-button>
      </a-space>
    </div>

    <div class="prep-stats">
      <a-card v-for="stat in statItems" :key="stat.label" class="metric-card" :body-style="{ padding: '15px 16px' }">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value" :class="stat.tone">{{ stat.value }}</div>
        <div class="stat-sub">{{ stat.sub }}</div>
      </a-card>
    </div>

    <a-card title="爆款花束排行榜" class="av-card">
      <a-spin :spinning="loading">
        <a-empty v-if="!loading && rows.length === 0" description="暂无备货统计" />
        <HotProductTable v-else :data-source="rows" />
      </a-spin>
    </a-card>

    <a-alert
      type="info"
      show-icon
      class="prep-alert"
      message="花材配方备货"
      description="可继续为花束配置配方，系统即可根据今日订单数量换算花材需求，并联动库存提醒缺货。"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import HotProductTable from '~~/components/orders/HotProductTable.vue'

defineProps<{ compact?: boolean }>()

const date = ref(dayjs().format('YYYY-MM-DD'))
const loading = ref(false)
const rows = ref<any[]>([])
const summary = ref<any>({})

const statItems = computed(() => [
  { label: '订单数', value: summary.value.orderCount || 0, sub: '当日履约', tone: '' },
  { label: '总束数', value: summary.value.totalQty || 0, sub: '需要备货', tone: 'ok' },
  { label: '总金额', value: `¥${Number(summary.value.totalAmount || 0).toFixed(2)}`, sub: '预售金额', tone: 'money' },
  { label: '未做好', value: summary.value.unmadeCount || 0, sub: '待制作', tone: 'warn' },
  { label: '配送', value: summary.value.deliveryCount || 0, sub: '派送任务', tone: 'info' },
  { label: '自提', value: summary.value.pickupCount || 0, sub: '到店取花', tone: '' },
])

async function fetchStats() {
  loading.value = true
  try {
    const result: any = await $fetch('/api/preorders/stats/hot', {
      params: { date: date.value },
    })
    rows.value = result.data || []
    summary.value = result.summary || {}
  } catch (error: any) {
    message.error(error?.data?.message || '加载备货统计失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<style scoped>
.prep-board {
  width: 100%;
}

.prep-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-label {
  color: var(--ink-500);
  font-size: 12px;
}

.stat-value {
  margin-top: 4px;
  color: var(--ink-900);
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
}

.stat-value.ok {
  color: var(--ok);
}

.stat-value.warn {
  color: var(--warn);
}

.stat-value.info {
  color: var(--info);
}

.stat-value.money {
  color: var(--pit-700);
  font-size: 22px;
}

.stat-sub {
  margin-top: 7px;
  color: var(--ink-400);
  font-size: 12px;
}

.prep-alert {
  margin-top: 16px;
  border-color: rgba(74, 122, 140, 0.24);
  border-radius: var(--radius-lg);
  background: rgba(74, 122, 140, 0.08);
}

.compact {
  padding: 18px;
}

@media (max-width: 1180px) {
  .prep-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .prep-stats {
    grid-template-columns: 1fr;
  }

  .compact {
    padding: 14px;
  }
}
</style>
