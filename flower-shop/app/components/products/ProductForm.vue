<template>
  <a-modal
    :open="visible"
    :title="product ? '编辑商品' : '新增商品'"
    @update:open="$emit('update:visible', $event)"
    @ok="handleOk"
    @cancel="handleCancel"
    :confirmLoading="loading || imageUploading"
    width="800px"
    destroyOnClose
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      class="product-form"
    >
      <div class="form-grid">
        <!-- 第一组：基本信息 -->
        <a-card title="基本信息" size="small" class="form-card">
          <a-form-item label="商品名称" name="name">
            <a-input v-model:value="formState.name" placeholder="请输入商品名称" />
          </a-form-item>
          <div class="row-2">
            <a-form-item label="分类" name="category">
              <a-select v-model:value="formState.category" placeholder="请选择分类">
                <a-select-option value="鲜切花">鲜切花</a-select-option>
                <a-select-option value="绿植">绿植</a-select-option>
                <a-select-option value="花束">花束</a-select-option>
                <a-select-option value="配材">配材</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="等级" name="grade">
              <a-select v-model:value="formState.grade" placeholder="请选择等级">
                <a-select-option value="A级">A级</a-select-option>
                <a-select-option value="B级">B级</a-select-option>
                <a-select-option value="C级">C级</a-select-option>
                <a-select-option value="D级">D级</a-select-option>
                <a-select-option value="E级">E级</a-select-option>
                <a-select-option value="O级">O级</a-select-option>
              </a-select>
            </a-form-item>
          </div>
          <div class="row-2">
            <a-form-item label="颜色" name="color">
              <a-input v-model:value="formState.color" placeholder="如：红、粉" />
            </a-form-item>
            <a-form-item label="规格" name="specification">
              <a-auto-complete
                v-model:value="formState.specification"
                placeholder="请选择或输入规格"
                :options="[
                  { value: '70cm' },
                  { value: '65cm' },
                  { value: '60cm' },
                  { value: '55cm' },
                  { value: '50cm' }
                ]"
                :filter-option="filterOption"
              />
            </a-form-item>
          </div>
        </a-card>

        <!-- 第二组：价格设置 -->
        <a-card title="价格设置" size="small" class="form-card">
          <a-form-item label="基础单位" name="baseUnit">
            <a-input v-model:value="formState.baseUnit" placeholder="如：枝" />
          </a-form-item>
          <a-form-item label="默认价" name="defaultPrice">
            <a-input-number
              v-model:value="formState.defaultPrice"
              :min="0"
              :step="0.01"
              :precision="2"
              class="w-full"
              placeholder="请输入默认价"
            />
          </a-form-item>
          <a-form-item label="VIP 价" name="vipPrice">
            <a-input-number
              v-model:value="formState.vipPrice"
              :min="0"
              :step="0.01"
              :precision="2"
              class="w-full"
              placeholder="请输入VIP 价"
            />
          </a-form-item>
          <a-form-item label="批发价" name="wholesalePrice">
            <a-input-number
              v-model:value="formState.wholesalePrice"
              :min="0"
              :step="0.01"
              :precision="2"
              class="w-full"
              placeholder="请输入批发价"
            />
          </a-form-item>
        </a-card>

        <!-- 第三组：库存相关 -->
        <a-card title="库存相关" size="small" class="form-card">
          <a-form-item label="默认花期天数" name="shelfLifeDays">
            <a-input-number
              v-model:value="formState.shelfLifeDays"
              :min="1"
              :precision="0"
              class="w-full"
              placeholder="默认为 7 天"
            />
          </a-form-item>
        </a-card>

        <!-- 第四组：商品图片 -->
        <a-card title="商品图片" size="small" class="form-card col-span-full">
          <div class="flex items-center gap-6">
            <div class="image-preview">
              <img v-if="previewUrl" :src="previewUrl" alt="商品图片" class="preview-img" />
              <div v-else class="no-image">🌸</div>
            </div>
            <div>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onFileChange"
              />
              <a-button @click="fileInputRef?.click()">
                <template #icon><UploadOutlined /></template>
                {{ previewUrl ? '更换图片' : '上传图片' }}
              </a-button>
              <div class="text-xs text-gray-400 mt-2">支持 jpg / png / webp，建议尺寸 400×400</div>
            </div>
          </div>
        </a-card>

        <!-- 第五组：单位换算 -->
        <a-card title="单位换算配置" size="small" class="form-card col-span-full">
          <template #extra>
            <span class="text-xs text-gray-400 font-normal">
              例如：基础单位是'枝'，可以配置'1 扎 = 10 枝'
            </span>
          </template>
          
          <div v-for="(uc, index) in formState.unitConversions" :key="index" class="conversion-row">
            <div class="conversion-inputs">
              <a-form-item
                :name="['unitConversions', index, 'fromUnit']"
                :rules="{ required: true, message: '请输入单位名称' }"
                class="mb-0 flex-1"
              >
                <a-input v-model:value="uc.fromUnit" placeholder="单位 (如：扎)" />
              </a-form-item>
              <div class="text-gray-500 py-1">=</div>
              <a-form-item
                :name="['unitConversions', index, 'toBaseQty']"
                :rules="{ required: true, type: 'number', min: 0.01, message: '请输入大于0的数量' }"
                class="mb-0 flex-1"
              >
                <a-input-number
                  v-model:value="uc.toBaseQty"
                  :min="0.01"
                  class="w-full"
                  :placeholder="`包含 ${formState.baseUnit || '基础单位'} 数量`"
                />
              </a-form-item>
              <div class="text-gray-500 py-1">{{ formState.baseUnit || '基础单位' }}</div>
            </div>
            <a-button type="text" danger @click="removeUnitConversion(index)">
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>

          <a-button type="dashed" block @click="addUnitConversion" class="mt-4">
            <PlusOutlined /> 添加单位换算
          </a-button>
        </a-card>

        <!-- 第六组：状态 -->
        <a-card title="状态" size="small" class="form-card col-span-full">
          <a-form-item name="status" class="mb-0">
            <a-radio-group v-model:value="formState.status">
              <a-radio value="active">在售</a-radio>
              <a-radio value="inactive">停售</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-card>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'

const props = defineProps<{
  visible: boolean
  product: any | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const { createProduct, updateProduct, uploadProductImage, loading } = useProducts()

// 图片相关
const imageFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const imageUploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const formRef = ref<FormInstance>()

// 表单状态
interface FormState {
  name: string
  category: string | undefined
  baseUnit: string
  grade: string | undefined
  color: string
  specification: string
  defaultPrice: number | null
  vipPrice: number | null
  wholesalePrice: number | null
  shelfLifeDays: number
  status: string
  unitConversions: { fromUnit: string; toBaseQty: number | null }[]
}

const getInitialState = (): FormState => ({
  name: '',
  category: undefined,
  baseUnit: '枝',
  grade: undefined,
  color: '',
  specification: '',
  defaultPrice: null,
  vipPrice: null,
  wholesalePrice: null,
  shelfLifeDays: 7,
  status: 'active',
  unitConversions: [],
})

const formState = reactive<FormState>(getInitialState())

// 监听弹窗显示，初始化数据
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.product) {
        Object.assign(formState, {
          name: props.product.name,
          category: props.product.category,
          baseUnit: props.product.baseUnit,
          grade: props.product.grade,
          color: props.product.color || '',
          specification: props.product.specification || '',
          defaultPrice: props.product.defaultPrice,
          vipPrice: props.product.vipPrice,
          wholesalePrice: props.product.wholesalePrice,
          shelfLifeDays: props.product.shelfLifeDays,
          status: props.product.status,
          unitConversions: props.product.unitConversions?.map((uc: any) => ({
            fromUnit: uc.fromUnit,
            toBaseQty: uc.toBaseQty,
          })) || [],
        })
        previewUrl.value = props.product.imageUrl || null
      } else {
        Object.assign(formState, getInitialState())
        previewUrl.value = null
      }
      imageFile.value = null
    }
  }
)

// 校验规则
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  baseUnit: [{ required: true, message: '请输入基础单位', trigger: 'blur' }],
  defaultPrice: [{ required: true, type: 'number', message: '请输入默认价', trigger: 'blur' }],
  shelfLifeDays: [{ required: true, type: 'number', message: '请输入花期天数', trigger: 'blur' }],
}

// 规格自动提示过滤
const filterOption = (input: string, option: any) => {
  return String(option.value).toUpperCase().includes(input.toUpperCase())
}

// 单位换算操作
const addUnitConversion = () => {
  formState.unitConversions.push({ fromUnit: '', toBaseQty: null })
}

const removeUnitConversion = (index: number) => {
  formState.unitConversions.splice(index, 1)
}

// 提交和取消
const handleCancel = () => {
  emit('update:visible', false)
  formRef.value?.resetFields()
}

const handleOk = async () => {
  try {
    await formRef.value?.validate()

    // 自定义前端校验：换算单位名称不能与基础单位相同，且不能重复
    const unitNames = formState.unitConversions.map(uc => uc.fromUnit)
    if (unitNames.includes(formState.baseUnit)) {
      message.error(`换算单位不能与基础单位 "${formState.baseUnit}" 相同`)
      return
    }
    const uniqueUnitNames = new Set(unitNames)
    if (uniqueUnitNames.size !== unitNames.length) {
      message.error('换算单位名称存在重复，请检查')
      return
    }

    let savedId: number | null = null
    if (props.product) {
      await updateProduct(props.product.id, formState)
      savedId = props.product.id
    } else {
      const created = await createProduct(formState)
      savedId = created?.id ?? null
    }

    // 上传图片（在保存成功后执行）
    if (imageFile.value && savedId) {
      imageUploading.value = true
      await uploadProductImage(savedId, imageFile.value)
      imageUploading.value = false
    }

    emit('success')
    handleCancel()
  } catch (error) {
    imageUploading.value = false
    console.error('Validation failed:', error)
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .col-span-full {
    grid-column: 1 / -1;
  }
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-card {
  margin-bottom: 0;
  height: 100%;
}

:deep(.ant-card-body) {
  padding: 16px;
}

.conversion-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  background: #fdfdfd;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.conversion-inputs {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
}

.w-full {
  width: 100%;
}

.image-preview {
  width: 80px;
  height: 80px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  flex-shrink: 0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  font-size: 28px;
}
</style>
