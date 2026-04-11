<template>
  <div class="space-y-4">
    <a-card title="首页" class="page-card">
      <a-empty description="首页仪表盘 — 开发中">
        <template #image>
          <div class="empty-icon">🌸</div>
        </template>
      </a-empty>
    </a-card>

    <a-card class="page-card">
      <template #title>
        <span>临期与过期批次</span>
        <a-tag v-if="totalCount > 0" color="red" class="ml-2">{{ totalCount }}</a-tag>
      </template>
      <template #extra>
        <a-button type="link" size="small" @click="goAll">查看全部</a-button>
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
                  <span class="font-mono text-xs text-gray-400 ml-2">{{ item.batchNo }}</span>
                </template>
                <template #description>
                  剩余 <b>{{ formatQty(item.currentQty) }} {{ item.product?.baseUnit }}</b>
                  · 到期 {{ formatDate(item.expiryDate) }}
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-tag :color="item._kind === 'expired' ? 'red' : 'orange'">
                  {{ formatDistance(item.expiryDate) }}
                </a-tag>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useStocks } from '~/composables/useStocks'

useHead({ title: '首页 - 花店管理系统' })

const router = useRouter()
const { fetchExpiring, loading } = useStocks()

const expiring = ref<any[]>([])
const expired = ref<any[]>([])

const displayList = computed(() => {
  const all = [
    ...expired.value.map((b) => ({ ...b, _kind: 'expired' })),
    ...expiring.value.map((b) => ({ ...b, _kind: 'expiring' })),
  ]
  return all.slice(0, 10)
})

const totalCount = computed(() => expiring.value.length + expired.value.length)

const formatDate = (d: string | Date) => dayjs(d).format('YYYY-MM-DD')

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

const goAll = () => {
  router.push('/stocks?expiringSoon=true&view=by_batch')
}

onMounted(async () => {
  try {
    const data = await fetchExpiring()
    expiring.value = data.expiring || []
    expired.value = data.expired || []
  } catch (e) {
    // ignore
  }
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.empty-icon {
  font-size: 64px;
  line-height: 1;
}
</style>
