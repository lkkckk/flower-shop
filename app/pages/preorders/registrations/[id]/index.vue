<template>
  <div class="registration-detail-page p-4 sm:p-6 max-w-5xl mx-auto">
    <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <a-button @click="router.push('/preorders')">← 返回列表</a-button>
        <div>
          <h1 class="text-xl font-bold text-gray-800">
            预售登记：{{ detail?.orderNo || '加载中...' }}
            <span v-if="detail" class="text-xs text-gray-400 font-normal ml-2">内部编号 #{{ detail.id }}</span>
          </h1>
          <p class="text-xs text-gray-500 mt-0.5">登记时间：{{ detail ? formatDateTime(detail.createdAt) : '-' }}</p>
        </div>
      </div>

      <a-space wrap v-if="detail">
        <a-button type="primary" @click="goPrint">
          <template #icon><PrinterOutlined /></template>
          打印配送单
        </a-button>
        <a-button @click="goEdit">修改登记</a-button>
        <a-popconfirm
          v-if="isAdmin"
          title="确定将此预售登记移入回收站吗？"
          ok-text="移入回收站"
          cancel-text="取消"
          @confirm="onTrash"
        >
          <a-button danger>移入回收站</a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <div v-if="detail" class="space-y-4">
        <!-- 基本信息卡片 -->
        <a-card title="履约及联络信息" size="small">
          <a-descriptions bordered :column="{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }">
            <a-descriptions-item label="订单编号">
              <span class="font-bold text-gray-800">{{ detail.orderNo }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="联系电话">
              <span>{{ detail.contactPhone || '-' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="取花/送花时间">
              <span class="text-pink-600 font-medium">
                {{ detail.deliveryTime ? formatDateTime(detail.deliveryTime) : '未指定时间' }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="登记人">
              <span>{{ detail.createdBy?.name || '-' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="最后修改人">
              <span>{{ detail.updatedBy?.name || '-' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="版本号">
              <span>v{{ detail.version }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="备注说明" :span="3">
              <div class="whitespace-pre-wrap text-gray-700">{{ detail.notes || '-' }}</div>
            </a-descriptions-item>
            <a-descriptions-item label="贺卡内容" :span="3">
              <div class="whitespace-pre-wrap text-pink-800 bg-pink-50 p-3 rounded border border-pink-100">
                {{ detail.cardMessage || '-' }}
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 商品与照片卡片 -->
        <a-card title="商品明细与参考图" size="small">
          <div class="space-y-4">
            <div
              v-for="(item, idx) in detail.items"
              :key="item.id || idx"
              class="border rounded-lg p-4 bg-gray-50"
            >
              <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-base text-gray-800">{{ item.name }}</span>
                  <a-tag color="blue">数量：{{ Number(item.qty) }}</a-tag>
                </div>
                <span class="text-xs text-gray-400">共 {{ item.photos?.length || 0 }} 张照片</span>
              </div>

              <!-- 照片预览 -->
              <div v-if="item.photos && item.photos.length > 0">
                <a-image-preview-group>
                  <div class="flex flex-wrap gap-3">
                    <a-image
                      v-for="(photo, pIdx) in item.photos"
                      :key="photo.id || pIdx"
                      :src="photo.url"
                      :width="120"
                      :height="90"
                      class="object-contain border rounded bg-white shadow-sm"
                    />
                  </div>
                </a-image-preview-group>
              </div>
              <div v-else class="text-xs text-gray-400">未上传照片</div>
            </div>
          </div>
        </a-card>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { usePreorderRegistrations } from '~/composables/usePreorderRegistrations'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')

const id = Number(route.params.id)
const { loading, fetchRegistration, trashRegistration } = usePreorderRegistrations()

const detail = ref<any>(null)

async function loadDetail() {
  detail.value = await fetchRegistration(id)
}

function goEdit() {
  router.push(`/preorders/registrations/${id}/edit`)
}

function goPrint() {
  window.open(`/preorders/registrations/${id}/delivery-slip`, '_blank')
}

async function onTrash() {
  await trashRegistration(id)
  router.push('/preorders')
}

const formatDateTime = (val?: string | Date) => {
  if (!val) return '-'
  return dayjs(val).format('YYYY-MM-DD HH:mm')
}

useHead({
  title: computed(() => `预售登记 #${detail.value?.orderNo || id} - 花店管理系统`),
})

onMounted(loadDetail)
</script>
