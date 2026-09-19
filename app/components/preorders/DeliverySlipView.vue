<template>
  <div class="delivery-slip-wrapper">
    <!-- 顶部操作控制条（打印时隐藏） -->
    <div class="slip-controls no-print">
      <div class="controls-content">
        <a-button @click="router.back()">← 返回</a-button>
        <a-space>
          <span v-if="loadError" class="text-red-600 text-sm font-medium">
            {{ loadError }}
            <a-button size="small" type="link" @click="reload">重新加载照片</a-button>
          </span>
          <span v-else-if="!printReady" class="text-gray-500 text-sm">
            正在加载照片与字体，请稍候…
          </span>
          <span v-else class="text-green-600 text-sm font-medium">
            ✓ 全部照片与字体已就绪
          </span>

          <a-button
            type="primary"
            size="large"
            :disabled="!printReady"
            @click="triggerPrint"
          >
            <template #icon><PrinterOutlined /></template>
            立即打印配送单
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 打印纸张内容区 -->
    <div class="slip-sheet">
      <!-- 居中店名 -->
      <div class="shop-name">{{ shopName }}</div>
      <!-- 居中主标题 -->
      <h1 class="sheet-title">配送单</h1>

      <!-- 基础信息排版 (正文 12pt) -->
      <div class="slip-info-box">
        <div class="info-row">
          <div class="info-col">
            <span class="info-label">订单编号：</span>
            <span class="info-value font-bold">{{ data.orderNo }}</span>
          </div>
          <div class="info-col">
            <span class="info-label">联系电话：</span>
            <span class="info-value">{{ data.contactPhone || '-' }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-col full">
            <span class="info-label">取花 / 送花时间：</span>
            <span class="info-value font-bold text-pink-700">
              {{ data.deliveryTime ? formatDateTime(data.deliveryTime) : '未指定具体时间' }}
            </span>
          </div>
        </div>

        <div v-if="data.notes" class="info-row">
          <div class="info-col full">
            <span class="info-label">备注说明：</span>
            <span class="info-value whitespace-pre-wrap">{{ data.notes }}</span>
          </div>
        </div>

        <div v-if="data.cardMessage" class="info-row card-row">
          <div class="info-col full">
            <span class="info-label">贺卡内容：</span>
            <div class="card-message-box whitespace-pre-wrap font-serif">
              {{ data.cardMessage }}
            </div>
          </div>
        </div>
      </div>

      <!-- 商品与照片分页列表 -->
      <div class="slip-items-section">
        <div class="section-heading">
          <span>商品清单与确认照片（共 {{ data.items.length }} 项）</span>
        </div>

        <template v-for="(item, itIdx) in data.items" :key="itIdx">
          <!-- 如果该商品有多张照片，每张照片独立成块，上方重复显示商品名称与数量 -->
          <template v-if="item.photos && item.photos.length > 0">
            <div
              v-for="(photoUrl, pIdx) in item.photos"
              :key="pIdx"
              class="slip-photo-block"
            >
              <div class="slip-item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">数量：{{ item.qty }} {{ item.unit || '' }}</span>
                <span class="item-amount">金额：{{ formatRegistrationAmount(item.amount) }}</span>
                <span v-if="item.photos.length > 1" class="photo-tag">
                  照片 {{ pIdx + 1 }}/{{ item.photos.length }}
                </span>
              </div>
              <div class="photo-container">
                <img :src="photoUrl" class="slip-photo" alt="商品确认照片" />
              </div>
            </div>
          </template>

          <!-- 如果商品没有照片，单行展示商品信息 -->
          <template v-else>
            <div class="slip-photo-block no-photo">
              <div class="slip-item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">数量：{{ item.qty }} {{ item.unit || '' }}</span>
                <span class="item-amount">金额：{{ formatRegistrationAmount(item.amount) }}</span>
              </div>
              <div class="no-photo-text">（本商品无确认照片）</div>
            </div>
          </template>
        </template>
        <div class="order-total">订单金额：{{ formatRegistrationAmount(orderTotal) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { sumRegistrationAmounts, formatRegistrationAmount } from '~~/shared/preorderMoney'

export interface SlipItem {
  name: string
  qty: string | number
  unit?: string
  amount?: string | number | null
  photos: string[]
}

export interface SlipData {
  orderNo: string
  contactPhone?: string | null
  deliveryTime?: string | Date | null
  notes?: string | null
  cardMessage?: string | null
  items: SlipItem[]
  totalAmount?: string | number | null
}

const props = defineProps<{
  shopName: string
  data: SlipData
}>()

const router = useRouter()
const orderTotal = computed(() => props.data.totalAmount !== undefined ? props.data.totalAmount : sumRegistrationAmounts(props.data.items))
const printReady = ref(false)
const loadError = ref<string | null>(null)

async function preloadAll() {
  printReady.value = false
  loadError.value = null

  const allPhotoUrls: string[] = []
  for (const it of props.data.items) {
    if (it.photos && it.photos.length > 0) {
      allPhotoUrls.push(...it.photos)
    }
  }

  try {
    if (document.fonts) {
      await document.fonts.ready
    }

    if (allPhotoUrls.length > 0) {
      await Promise.all(
        allPhotoUrls.map((url) => {
          return new Promise<void>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve()
            img.onerror = () => reject(new Error(`照片加载失败: ${url}`))
            img.src = url
          })
        })
      )
    }
    printReady.value = true
  } catch (err: any) {
    loadError.value = err.message || '部分照片加载失败'
    printReady.value = false
  }
}

function reload() {
  preloadAll()
}

function triggerPrint() {
  if (!printReady.value) return
  window.print()
}

const formatDateTime = (val?: string | Date) => {
  if (!val) return '-'
  return dayjs(val).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  preloadAll()
})
</script>

<style scoped>
/* 屏幕预览与基础排版 */
.delivery-slip-wrapper {
  background-color: #f3f4f6;
  min-height: 100vh;
  padding-bottom: 40px;
}

.slip-controls {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.controls-content {
  max-width: 210mm;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slip-sheet {
  background: #ffffff;
  width: 210mm;
  min-height: 297mm;
  margin: 20px auto;
  padding: 10mm;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.shop-name {
  text-align: center;
  font-size: 16pt;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.sheet-title {
  text-align: center;
  font-size: 22pt;
  font-weight: 800;
  letter-spacing: 4px;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #111827;
}

/* 基础信息区域 (正文 12pt) */
.slip-info-box {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 12pt;
  line-height: 1.6;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 6px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-col {
  flex: 1;
  min-width: 200px;
}

.info-col.full {
  flex: 100%;
}

.info-label {
  color: #4b5563;
  font-weight: 500;
}

.info-value {
  color: #111827;
}

.card-message-box {
  margin-top: 4px;
  padding: 8px 12px;
  background: #fff5f5;
  border: 1px dashed #f87171;
  border-radius: 4px;
  color: #991b1b;
  font-size: 12pt;
}

/* 商品与照片块 (自动跨页与商品信息重复) */
.slip-items-section {
  margin-top: 14px;
}

.section-heading {
  font-size: 13pt;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
  padding-left: 6px;
  border-left: 4px solid #db2777;
}

.slip-photo-block {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px 12px;
  background: #ffffff;
}

.slip-photo-block.no-photo {
  padding: 10px 12px;
}

.slip-item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}

.item-name {
  flex-basis: 100%;
  overflow-wrap: anywhere;
  font-size: 16pt;
  font-weight: 700;
  color: #111827;
}

.item-qty {
  font-size: 14pt;
  font-weight: 700;
  color: #db2777;
}

.photo-tag {
  font-size: 11pt;
  color: #6b7280;
}

.item-amount { font-size: 14pt; font-weight: 700; }
.order-total { border-top: 2px solid #111827; padding: 12px 0; font-size: 16pt; font-weight: 700; break-inside: avoid; }

.photo-container {
  width: 160mm;
  height: 100mm;
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px solid #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.slip-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-photo-text {
  font-size: 11pt;
  color: #9ca3af;
  padding: 4px 0;
}

/* 打印机 @media print 样式规则 */
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  body, html {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  .delivery-slip-wrapper {
    background: #ffffff !important;
    padding: 0 !important;
  }

  .slip-sheet {
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }

  .slip-photo-block {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    margin-bottom: 10mm !important;
  }

  .photo-container {
    width: 160mm !important;
    height: 100mm !important;
  }
}
</style>
