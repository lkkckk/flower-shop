<template>
  <div class="registration-form">
    <a-form layout="vertical" :model="form">
      <!-- 基础信息卡片 -->
      <a-card class="mb-4" title="基本信息" :bordered="true">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="订单编号" required :validate-status="errors.orderNo ? 'error' : ''" :help="errors.orderNo">
            <a-input
              v-model:value="form.orderNo"
              placeholder="手工填写订单编号（允许重复）"
              size="large"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="联系电话">
            <a-input
              v-model:value="form.contactPhone"
              placeholder="选填，客户或收花人电话"
              size="large"
              allow-clear
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="取花 / 送花时间">
            <a-date-picker
              v-model:value="form.deliveryTime"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="选填，选择履约时间"
              class="w-full"
              size="large"
              allow-clear
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="备注说明">
            <a-textarea
              v-model:value="form.notes"
              placeholder="选填，多行输入特殊要求、颜色喜好或配送细节"
              :rows="3"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="贺卡内容">
            <a-textarea
              v-model:value="form.cardMessage"
              placeholder="选填，多行输入贺卡赠言、寄语"
              :rows="3"
              allow-clear
            />
          </a-form-item>
        </div>
      </a-card>

      <!-- 商品清单与照片卡片 -->
      <a-card class="mb-4" title="商品清单与确认照片" :bordered="true">
        <template #extra>
          <a-button type="dashed" @click="addItem">
            <template #icon><PlusOutlined /></template>
            添加商品
          </a-button>
        </template>

        <div v-if="form.items.length === 0" class="text-center py-6 text-gray-400">
          请至少添加一项商品
        </div>

        <div class="space-y-6">
          <div
            v-for="(item, idx) in form.items"
            :key="idx"
            class="item-card border rounded-lg p-4 bg-gray-50 relative"
          >
            <div class="flex justify-between items-center mb-3">
              <span class="font-bold text-gray-700 text-sm">商品 #{{ idx + 1 }}</span>
              <a-button
                v-if="form.items.length > 1"
                type="text"
                danger
                size="small"
                @click="removeItem(idx)"
              >
                删除商品
              </a-button>
            </div>

            <!-- 商品名称与数量 -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs text-gray-500 mb-1"><span class="text-red-500">*</span> 商品名称</label>
                <a-input
                  v-model:value="item.name"
                  placeholder="例如：碎冰蓝玫瑰11枝花束"
                  size="middle"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1"><span class="text-red-500">*</span> 数量</label>
                <a-input
                  v-model:value="item.qty"
                  placeholder="> 0，最多3位小数"
                  size="middle"
                />
              </div>
            </div>

            <!-- 照片上传区域 -->
            <div class="mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="text-xs text-gray-500">
                  商品参考图/确认照片（支持多张，单张 ≤ 10MB，JPG/PNG/WebP/JFIF）
                </label>
                <a-upload
                  :show-upload-list="false"
                  :multiple="true"
                  accept=".jpg,.jpeg,.png,.webp,.jfif"
                  :before-upload="(file: any) => handleUploadFile(file, idx)"
                >
                  <a-button size="small">
                    <template #icon><UploadOutlined /></template>
                    上传照片
                  </a-button>
                </a-upload>
              </div>

              <!-- 照片墙 -->
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="(photo, pIdx) in item.photos"
                  :key="pIdx"
                  class="photo-box relative w-24 h-24 border rounded overflow-hidden bg-white shadow-sm flex items-center justify-center"
                  :class="{ 'border-red-400 bg-red-50': photo.status === 'error' }"
                >
                  <img
                    v-if="photo.url || photo.previewUrl"
                    :src="photo.previewUrl || photo.url"
                    class="w-full h-full object-contain"
                  />

                  <!-- 上传中 -->
                  <div
                    v-if="photo.status === 'uploading'"
                    class="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-white text-xs"
                  >
                    <a-spin size="small" />
                    <span class="mt-1">上传中...</span>
                  </div>

                  <!-- 上传失败 -->
                  <div
                    v-else-if="photo.status === 'error'"
                    class="absolute inset-0 bg-red-50 bg-opacity-90 flex flex-col items-center justify-center p-1 text-center"
                  >
                    <span class="text-red-600 text-xs font-semibold">失败</span>
                    <button
                      type="button"
                      class="text-xs text-blue-600 underline mt-1"
                      @click="retryUpload(idx, pIdx)"
                    >
                      重试
                    </button>
                    <button
                      type="button"
                      class="text-xs text-gray-500 underline mt-1"
                      @click="removePhoto(idx, pIdx)"
                    >
                      删除
                    </button>
                  </div>

                  <!-- 悬浮操作栏（上传成功状态） -->
                  <div
                    v-if="photo.status !== 'uploading' && photo.status !== 'error'"
                    class="photo-actions absolute bottom-0 inset-x-0 bg-black bg-opacity-60 text-white flex justify-around py-1 text-xs opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <button
                      v-if="pIdx > 0"
                      type="button"
                      title="前移"
                      class="hover:text-pink-300"
                      @click="movePhoto(idx, pIdx, -1)"
                    >
                      ←
                    </button>
                    <button
                      v-if="pIdx < item.photos.length - 1"
                      type="button"
                      title="后移"
                      class="hover:text-pink-300"
                      @click="movePhoto(idx, pIdx, 1)"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      title="删除"
                      class="hover:text-red-400"
                      @click="removePhoto(idx, pIdx)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <!-- 照片墙末尾：添加照片卡片 -->
                <a-upload
                  :show-upload-list="false"
                  :multiple="true"
                  accept=".jpg,.jpeg,.png,.webp,.jfif"
                  :before-upload="(file: any) => handleUploadFile(file, idx)"
                >
                  <div
                    class="w-24 h-24 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-green-600 hover:text-green-700 bg-white hover:bg-green-50/20 transition text-xs"
                    title="点击添加照片"
                  >
                    <PlusOutlined class="text-base mb-1" />
                    <span>添加照片</span>
                  </div>
                </a-upload>
              </div>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 底部操作栏 -->
      <div class="action-card bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <span v-if="hasUploadingOrError" class="text-amber-600 text-xs flex items-center">
            <ExclamationCircleOutlined class="mr-1" /> 存在正在上传或失败的照片，请完成后再保存。
          </span>
        </div>
        <a-space>
          <a-button size="large" @click="emit('cancel')">取消返回</a-button>
          <a-button
            type="primary"
            size="large"
            :loading="saving"
            :disabled="hasUploadingOrError"
            @click="handleSubmit"
          >
            {{ isEdit ? '保存修改' : '保存登记' }}
          </a-button>
        </a-space>
      </div>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import { usePreorderRegistrations, type PreorderItemPhoto } from '~/composables/usePreorderRegistrations'

const props = defineProps<{
  initialData?: any
  isEdit?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', payload: any): void
  (e: 'cancel'): void
}>()

const { uploadRegistrationImage } = usePreorderRegistrations()

interface ItemForm {
  id?: number
  name: string
  qty: string
  sort: number
  photos: PreorderItemPhoto[]
}

const form = reactive({
  orderNo: props.initialData?.orderNo || '',
  contactPhone: props.initialData?.contactPhone || '',
  deliveryTime: props.initialData?.deliveryTime || null,
  notes: props.initialData?.notes || '',
  cardMessage: props.initialData?.cardMessage || '',
  items: (props.initialData?.items && props.initialData.items.length > 0)
    ? props.initialData.items.map((it: any, idx: number) => ({
        id: it.id,
        name: it.name,
        qty: String(Number(it.qty)),
        sort: it.sort ?? idx,
        photos: (it.photos || []).map((p: any) => ({
          id: p.id,
          url: p.url,
          sort: p.sort ?? 0,
          status: 'done' as const,
        })),
      }))
    : [
        {
          name: '',
          qty: '1',
          sort: 0,
          photos: [] as PreorderItemPhoto[],
        },
      ],
})

const errors = reactive({
  orderNo: '',
})

const uploadingCount = ref(0)

const hasUploadingOrError = computed(() => {
  if (uploadingCount.value > 0) return true
  for (const it of form.items) {
    for (const p of it.photos) {
      if (p.status === 'uploading' || p.status === 'error') return true
    }
  }
  return false
})

function addItem() {
  form.items.push({
    name: '',
    qty: '1',
    sort: form.items.length,
    photos: [],
  })
}

function removeItem(idx: number) {
  const item = form.items[idx]
  if (item?.photos) {
    for (const p of item.photos) {
      if (p.status === 'uploading') {
        uploadingCount.value = Math.max(0, uploadingCount.value - 1)
      }
      if (p.previewUrl) {
        try { URL.revokeObjectURL(p.previewUrl) } catch {}
      }
    }
  }
  form.items.splice(idx, 1)
}

function handleUploadFile(file: File, itemIdx: number) {
  if (file.size > 10 * 1024 * 1024) {
    message.error(`图片 ${file.name} 超过 10MB，无法上传`)
    return false
  }

  let previewUrl = ''
  try {
    previewUrl = URL.createObjectURL(file)
  } catch {}

  const targetIdx = form.items[itemIdx].photos.length
  form.items[itemIdx].photos.push({
    url: '',
    previewUrl,
    status: 'uploading',
    file,
    sort: targetIdx,
  })

  uploadSinglePhoto(itemIdx, targetIdx)
  return false
}

async function uploadSinglePhoto(itemIdx: number, photoIdx: number) {
  const targetPhoto = form.items[itemIdx]?.photos[photoIdx]
  if (!targetPhoto || !targetPhoto.file) return

  targetPhoto.status = 'uploading'
  uploadingCount.value++

  try {
    const url = await uploadRegistrationImage(targetPhoto.file)
    const current = form.items[itemIdx]?.photos[photoIdx]
    if (current) {
      current.url = url
      current.status = 'done'
    }
  } catch (err: any) {
    console.error('图片上传失败:', err)
    const current = form.items[itemIdx]?.photos[photoIdx]
    if (current) {
      current.status = 'error'
    }
    const msg = err?.data?.message || err?.message || '图片上传失败，请重试'
    message.error(msg)
  } finally {
    uploadingCount.value = Math.max(0, uploadingCount.value - 1)
  }
}

function retryUpload(itemIdx: number, photoIdx: number) {
  uploadSinglePhoto(itemIdx, photoIdx)
}

function removePhoto(itemIdx: number, photoIdx: number) {
  const photo = form.items[itemIdx]?.photos[photoIdx]
  if (photo?.status === 'uploading') {
    uploadingCount.value = Math.max(0, uploadingCount.value - 1)
  }
  if (photo?.previewUrl) {
    try { URL.revokeObjectURL(photo.previewUrl) } catch {}
  }
  form.items[itemIdx].photos.splice(photoIdx, 1)
}

function movePhoto(itemIdx: number, photoIdx: number, delta: number) {
  const photos = form.items[itemIdx].photos
  const targetIdx = photoIdx + delta
  if (targetIdx < 0 || targetIdx >= photos.length) return
  const temp = photos[photoIdx]
  photos[photoIdx] = photos[targetIdx]
  photos[targetIdx] = temp
}

function handleSubmit() {
  errors.orderNo = ''
  if (!form.orderNo.trim()) {
    errors.orderNo = '请填写订单编号'
    message.error('请填写订单编号')
    return
  }

  if (form.items.length === 0) {
    message.error('至少需要一项商品')
    return
  }

  for (let i = 0; i < form.items.length; i++) {
    const it = form.items[i]
    if (!it.name.trim()) {
      message.error(`请填写第 ${i + 1} 项商品名称`)
      return
    }
    const qtyStr = String(it.qty).trim()
    if (!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(qtyStr) || parseFloat(qtyStr) <= 0) {
      message.error(`第 ${i + 1} 项商品数量必须大于零且最多保留三位小数`)
      return
    }
  }

  if (hasUploadingOrError.value) {
    message.error('存在尚未完成或失败的照片，请处理后再保存')
    return
  }

  const payload = {
    orderNo: form.orderNo.trim(),
    contactPhone: form.contactPhone?.trim() || null,
    deliveryTime: form.deliveryTime || null,
    notes: form.notes?.trim() || null,
    cardMessage: form.cardMessage?.trim() || null,
    version: props.initialData?.version,
    items: form.items.map((it, idx) => ({
      name: it.name.trim(),
      qty: it.qty.trim(),
      sort: idx,
      photos: it.photos.map((p, pIdx) => ({
        url: p.url,
        sort: pIdx,
      })),
    })),
  }

  emit('submit', payload)
}

onBeforeUnmount(() => {
  for (const item of form.items) {
    for (const photo of item.photos) {
      if (photo.previewUrl) {
        try { URL.revokeObjectURL(photo.previewUrl) } catch {}
      }
    }
  }
})
</script>

<style scoped>
.registration-form {
  max-width: 900px;
  margin: 0 auto;
}

.registration-form input[type="file"] {
  display: none !important;
}

.photo-box:hover .photo-actions {
  opacity: 1;
}
</style>
