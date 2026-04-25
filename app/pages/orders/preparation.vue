<template>
  <div class="min-h-screen bg-[#f7f7f4] p-4 md:p-6">
    <div class="mx-auto max-w-[1400px] space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">今日备货</h1>
          <p class="text-sm text-gray-500">按预售订单自动统计爆款花束、总束数和未完成数量。</p>
        </div>
        <a-space wrap>
          <a-button href="/orders/schedule">订单排单</a-button>
          <a-date-picker v-model:value="date" value-format="YYYY-MM-DD" @change="fetchStats" />
          <a-button type="primary" @click="fetchStats">刷新</a-button>
        </a-space>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-6">
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">订单数</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.orderCount || 0 }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">总束数</div>
          <div class="mt-1 text-2xl font-bold text-pink-600">{{ summary.totalQty || 0 }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">总金额</div>
          <div class="mt-1 text-2xl font-bold">¥{{ Number(summary.totalAmount || 0).toFixed(2) }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">未做好</div>
          <div class="mt-1 text-2xl font-bold text-orange-600">{{ summary.unmadeCount || 0 }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">配送</div>
          <div class="mt-1 text-2xl font-bold text-green-600">{{ summary.deliveryCount || 0 }}</div>
        </a-card>
        <a-card class="rounded-2xl" :body-style="{ padding: '14px' }">
          <div class="text-xs text-gray-500">自提</div>
          <div class="mt-1 text-2xl font-bold text-blue-600">{{ summary.pickupCount || 0 }}</div>
        </a-card>
      </div>

      <a-card title="爆款花束排行榜" class="rounded-2xl shadow-sm">
        <a-spin :spinning="loading">
          <a-empty v-if="!loading && rows.length === 0" description="暂无备货统计" />
          <HotProductTable v-else :data-source="rows" />
        </a-spin>
      </a-card>

      <a-alert
        type="info"
        show-icon
        class="rounded-2xl"
        message="后续扩展：花材配方备货"
        description="下一阶段可以为每个花束配置配方，例如粉玫瑰 11 枝、尤加利 2 枝、包装纸 3 张。系统即可根据今日订单数量自动换算花材需求，并与库存联动提醒缺货。"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import HotProductTable from '~~/components/orders/HotProductTable.vue'

definePageMeta({ layout: 'pos' })
useHead({ title: '今日备货 - 花店管理系统' })

const date = ref(dayjs().format('YYYY-MM-DD'))
const loading = ref(false)
const rows = ref<any[]>([])
const summary = ref<any>({})

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
