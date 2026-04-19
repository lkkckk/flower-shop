<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 mb-1">库存盘点</h1>
        <p class="text-sm text-gray-500">核对系统库存与实物，差额自动写入库存变动记录</p>
      </div>
      <a-space>
        <a-switch v-model:checked="onlyLow" />
        <span class="text-sm text-gray-600">仅看低库存</span>
        <a-button @click="loadSummary" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <!-- 汇总卡片 -->
    <a-row :gutter="16" class="mb-4">
      <a-col :span="8">
        <a-card>
          <a-statistic
            title="低库存商品数"
            :value="summary.lowStockCount"
            :value-style="{ color: summary.lowStockCount > 0 ? '#ef4444' : '#10b981' }"
          >
            <template #prefix><WarningOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="当前库存阈值" :value="summary.threshold">
            <template #prefix><SettingOutlined /></template>
          </a-statistic>
          <div class="text-xs text-gray-400 mt-1">
            <NuxtLink to="/settings">去设置页调整 →</NuxtLink>
          </div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="商品总数" :value="summary.items.length" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 盘点表格 -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredItems"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        :loading="loading"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="font-medium">{{ record.name }}</div>
            <div class="text-xs text-gray-400">{{ record.category || '-' }}</div>
          </template>

          <template v-else-if="column.key === 'totalStock'">
            <span :class="record.isLow ? 'text-red-500 font-bold' : 'text-gray-800'">
              {{ record.totalStock }} {{ record.baseUnit }}
            </span>
          </template>

          <template v-else-if="column.key === 'isLow'">
            <a-tag v-if="record.isLow" color="red">低库存</a-tag>
            <a-tag v-else color="green">充足</a-tag>
          </template>

          <template v-else-if="column.key === 'actualQty'">
            <a-input-number
              v-model:value="editing[record.id].actualQty"
              :min="0"
              :precision="2"
              size="small"
              class="w-24"
            />
          </template>

          <template v-else-if="column.key === 'delta'">
            <span
              :class="
                deltaOf(record) > 0
                  ? 'text-green-600'
                  : deltaOf(record) < 0
                    ? 'text-red-500'
                    : 'text-gray-400'
              "
            >
              {{ deltaOf(record) > 0 ? '+' : '' }}{{ deltaOf(record).toFixed(2) }}
            </span>
          </template>

          <template v-else-if="column.key === 'reason'">
            <a-input
              v-model:value="editing[record.id].reason"
              placeholder="盘亏原因（可选）"
              size="small"
              class="w-full"
            />
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button
              type="primary"
              size="small"
              :loading="editing[record.id].submitting"
              :disabled="Math.abs(deltaOf(record)) < 0.001"
              @click="submitAdjust(record)"
            >
              提交
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  WarningOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

useHead({ title: '库存盘点 - 花店管理' })

interface SummaryItem {
  id: number
  name: string
  category: string | null
  baseUnit: string
  specification: string | null
  totalStock: number
  threshold: number
  isLow: boolean
  oldestExpiry: Date | null
}

const loading = ref(false)
const onlyLow = ref(false)
const summary = reactive<{ items: SummaryItem[]; lowStockCount: number; threshold: number }>({
  items: [],
  lowStockCount: 0,
  threshold: 20,
})

// 每行编辑缓存：actualQty / reason / submitting
const editing = reactive<Record<number, { actualQty: number; reason: string; submitting: boolean }>>({})

const columns = [
  { title: '商品', key: 'name', width: 220 },
  { title: '系统库存', key: 'totalStock', width: 120 },
  { title: '状态', key: 'isLow', width: 80 },
  { title: '实际数量', key: 'actualQty', width: 120 },
  { title: '差额', key: 'delta', width: 100 },
  { title: '原因', key: 'reason' },
  { title: '操作', key: 'action', width: 100 },
]

const filteredItems = computed(() => {
  if (onlyLow.value) return summary.items.filter((it) => it.isLow)
  return summary.items
})

const deltaOf = (row: SummaryItem) => {
  const e = editing[row.id]
  if (!e) return 0
  return Number(e.actualQty) - row.totalStock
}

const ensureEditing = () => {
  for (const it of summary.items) {
    if (!editing[it.id]) {
      editing[it.id] = { actualQty: it.totalStock, reason: '', submitting: false }
    } else {
      // 若数据刷新，把 actualQty 重置为最新 totalStock
      editing[it.id].actualQty = it.totalStock
      editing[it.id].submitting = false
    }
  }
}

const loadSummary = async () => {
  loading.value = true
  try {
    const { data, error }: any = await $fetch('/api/stocks/stocktake/summary')
    if (error) {
      message.error(error.message || '加载盘点数据失败')
      return
    }
    summary.items = data.items
    summary.lowStockCount = data.lowStockCount
    summary.threshold = data.threshold
    ensureEditing()
  } catch (e: any) {
    message.error(e.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const submitAdjust = async (row: SummaryItem) => {
  const e = editing[row.id]
  if (!e) return
  const delta = Number(e.actualQty) - row.totalStock
  if (Math.abs(delta) < 0.001) {
    message.info('差额为 0，无需调整')
    return
  }
  e.submitting = true
  try {
    const { data, error }: any = await $fetch('/api/stocks/stocktake/adjust', {
      method: 'POST',
      body: {
        productId: row.id,
        actualQty: Number(e.actualQty),
        reason: e.reason,
      },
    })
    if (error) {
      message.error(error.message || '提交失败')
      return
    }
    message.success(`【${row.name}】盘点成功，差额 ${data.delta > 0 ? '+' : ''}${data.delta}`)
    await loadSummary()
  } catch (err: any) {
    message.error(err.message || '系统错误')
  } finally {
    e.submitting = false
  }
}

onMounted(() => {
  loadSummary()
})

// 当 summary.items 刷新，重建 editing 映射
watch(() => summary.items.length, ensureEditing)
</script>
