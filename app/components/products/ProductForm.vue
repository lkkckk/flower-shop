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
            <a-form-item label="分类" name="categoryPath">
              <a-cascader
                v-model:value="formState.categoryPath"
                :options="categoryOptions"
                :field-names="{ label: 'name', value: 'id', children: 'children' }"
                placeholder="请选择分类（支持三级）"
                change-on-select
                expand-trigger="hover"
                allow-clear
              >
                <template #notFoundContent>
                  <div class="text-gray-400 text-sm py-2">
                    暂无分类，请在商品列表页点"管理分类"新增
                  </div>
                </template>
              </a-cascader>
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
          <a-form-item v-if="!hideWholesalePrice" label="批发价" name="wholesalePrice">
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
        <a-card title="花束配方" size="small" class="form-card col-span-full">
          <template #extra>
            <a-switch v-model:checked="formState.recipe.enabled" size="small" />
          </template>
          <div class="recipe-intro">
            有配方的商品在销售或预售制作时会扣减配方组件库存，不再扣减成品库存。
          </div>
          <a-form-item label="配方备注" class="mb-3">
            <a-textarea v-model:value="formState.recipe.notes" :rows="2" placeholder="如：标准生日花束配方" />
          </a-form-item>
          <div v-for="(item, index) in formState.recipe.items" :key="index" class="recipe-row">
            <a-select
              v-model:value="item.componentProductId"
              class="recipe-product"
              show-search
              placeholder="选择花材 / 包装商品"
              :options="componentOptions"
              :filter-option="selectFilterOption"
              @change="onRecipeComponentChange(index)"
            />
            <a-input-number v-model:value="item.qty" :min="0.01" :step="0.1" class="recipe-qty" placeholder="数量" />
            <a-select
              v-model:value="item.unit"
              class="recipe-unit"
              placeholder="单位"
              :options="recipeUnitOptions(item.componentProductId)"
            />
            <a-input v-model:value="item.notes" class="recipe-notes" placeholder="备注" />
            <a-button type="text" danger @click="removeRecipeItem(index)">
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>
          <a-button type="dashed" block @click="addRecipeItem">
            <PlusOutlined /> 添加配方组件
          </a-button>
        </a-card>

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
import { computed, ref, watch, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'

// 分类树
const categoryOptions = ref<any[]>([])
const loadCategories = async () => {
  try {
    const res: any = await $fetch('/api/categories')
    categoryOptions.value = res.data || []
  } catch {
    categoryOptions.value = []
  }
}
onMounted(() => loadCategories())

// 根据 categoryId 在树上回溯出级联路径 [root, mid, leaf]
const findCategoryPath = (tree: any[], targetId: number, path: number[] = []): number[] | null => {
  for (const node of tree) {
    const next = [...path, node.id]
    if (node.id === targetId) return next
    if (node.children?.length) {
      const found = findCategoryPath(node.children, targetId, next)
      if (found) return found
    }
  }
  return null
}

const props = defineProps<{
  visible: boolean
  product: any | null
  hideWholesalePrice?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const { createProduct, updateProduct, uploadProductImage, fetchProducts, loading } = useProducts()
const productOptions = ref<any[]>([])

const loadProductOptions = async () => {
  try {
    const data = await fetchProducts({ pageSize: 500, status: 'active' })
    productOptions.value = data.list || []
  } catch {
    productOptions.value = []
  }
}

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
  categoryId: number | null
  categoryPath: number[]
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
  recipe: {
    enabled: boolean
    notes: string
    items: {
      componentProductId: number | undefined
      qty: number | null
      unit: string
      notes: string
      sort: number
    }[]
  }
}

const getInitialState = (): FormState => ({
  name: '',
  category: undefined,
  categoryId: null,
  categoryPath: [],
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
  recipe: {
    enabled: false,
    notes: '',
    items: [],
  },
})

const componentOptions = computed(() =>
  productOptions.value
    .filter((p: any) => !props.product || p.id !== props.product.id)
    .map((p: any) => ({
      value: p.id,
      label: `${p.name}（${p.baseUnit}）`,
    })),
)

const selectedComponent = (id: number | undefined) =>
  productOptions.value.find((p: any) => p.id === id) || null

const recipeUnitOptions = (id: number | undefined) => {
  const product = selectedComponent(id)
  if (!product) return []
  return [
    { value: product.baseUnit, label: product.baseUnit },
    ...(product.unitConversions || []).map((uc: any) => ({
      value: uc.fromUnit,
      label: `${uc.fromUnit} (= ${uc.toBaseQty}${product.baseUnit})`,
    })),
  ]
}

const selectFilterOption = (input: string, option: any) =>
  String(option?.label || '').toLowerCase().includes(input.toLowerCase())

const formState = reactive<FormState>(getInitialState())

// 监听弹窗显示，初始化数据
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await loadCategories()
      await loadProductOptions()
      if (props.product) {
        const pid = props.product.categoryId ?? null
        const path = pid ? (findCategoryPath(categoryOptions.value, pid) || []) : []
        Object.assign(formState, {
          name: props.product.name,
          category: props.product.category,
          categoryId: pid,
          categoryPath: path,
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
          recipe: {
            enabled: Boolean(props.product.recipe?.enabled),
            notes: props.product.recipe?.notes || '',
            items: props.product.recipe?.items?.map((item: any, index: number) => ({
              componentProductId: item.componentProductId,
              qty: item.qty,
              unit: item.unit || item.componentProduct?.baseUnit || '',
              notes: item.notes || '',
              sort: item.sort ?? index,
            })) || [],
          },
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

const addRecipeItem = () => {
  formState.recipe.items.push({
    componentProductId: undefined,
    qty: null,
    unit: '',
    notes: '',
    sort: formState.recipe.items.length,
  })
}

const removeRecipeItem = (index: number) => {
  formState.recipe.items.splice(index, 1)
}

const onRecipeComponentChange = (index: number) => {
  const item = formState.recipe.items[index]
  const product = selectedComponent(item.componentProductId)
  item.unit = product?.baseUnit || ''
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

    const recipeItems = formState.recipe.items.filter((item) => item.componentProductId || item.qty || item.unit)
    if (formState.recipe.enabled && recipeItems.length === 0) {
      message.error('启用配方后至少需要添加一个组件')
      return
    }
    const componentIds = recipeItems.map((item) => item.componentProductId).filter(Boolean)
    if (props.product && componentIds.includes(props.product.id)) {
      message.error('配方组件不能选择商品自身')
      return
    }
    if (new Set(componentIds).size !== componentIds.length) {
      message.error('配方组件不能重复')
      return
    }
    for (const item of recipeItems) {
      if (!item.componentProductId || !item.qty || item.qty <= 0 || !item.unit) {
        message.error('请完整填写配方组件、数量和单位')
        return
      }
    }

    // 根据级联选择，取末端节点 ID 作为 categoryId
    const pickedId = formState.categoryPath?.length
      ? formState.categoryPath[formState.categoryPath.length - 1]
      : null
    // 反查末端分类的名称，写入旧字段以兼容历史逻辑
    let pickedName: string | undefined
    if (pickedId) {
      const finder = (nodes: any[]): any => {
        for (const n of nodes) {
          if (n.id === pickedId) return n
          if (n.children?.length) {
            const f = finder(n.children)
            if (f) return f
          }
        }
        return null
      }
      pickedName = finder(categoryOptions.value)?.name
    }
    const payload = {
      ...formState,
      categoryId: pickedId,
      category: pickedName ?? formState.category,
      recipe: {
        enabled: formState.recipe.enabled,
        notes: formState.recipe.notes || null,
        items: recipeItems.map((item, index) => ({
          componentProductId: item.componentProductId,
          qty: item.qty,
          unit: item.unit,
          notes: item.notes || null,
          sort: index,
        })),
      },
    }
    if (props.hideWholesalePrice) {
      delete (payload as any).wholesalePrice
    }

    let savedId: number | null = null
    if (props.product) {
      await updateProduct(props.product.id, payload)
      savedId = props.product.id
    } else {
      const created = await createProduct(payload)
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

.recipe-intro {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line-soft, #efe9d9);
  border-radius: 8px;
  background: var(--avo-50, #f0f2dd);
  color: var(--ink-500, #6b7159);
  font-size: 12px;
}

.recipe-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) 110px 130px minmax(140px, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--line-soft, #f0f0f0);
  border-radius: 8px;
  background: var(--paper-2, #fafafa);
}

.recipe-product,
.recipe-qty,
.recipe-unit,
.recipe-notes {
  width: 100%;
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

@media (max-width: 768px) {
  .recipe-row {
    grid-template-columns: 1fr;
  }
}
</style>
