<template>
  <div>
    <a-page-header title="新增入库" sub-title="登记新到货批次" @back="goBack" class="page-header" />

    <a-card class="form-card">
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
        @finish="onSubmit"
      >
        <div class="form-grid">
          <a-form-item label="商品" name="productId" class="col-span-2">
            <a-select
              v-model:value="form.productId"
              placeholder="选择要入库的商品"
              show-search
              :options="productOptions"
              :filter-option="filterOption"
              :loading="productsLoading"
              @change="onProductChange"
            >
              <template #option="{ label, raw }">
                <div class="flex items-center justify-between">
                  <span>
                    {{ raw.name }}
                    <a-tag v-if="raw.grade" :color="getGradeColor(raw.grade)" class="ml-1" style="font-size: 11px;">{{ raw.grade }}</a-tag>
                    <span v-if="raw.specification" class="text-xs text-gray-400 ml-1">{{ raw.specification }}</span>
                  </span>
                  <span class="text-xs text-gray-500">库存 {{ formatQty(raw.totalStock) }} {{ raw.baseUnit }}</span>
                </div>
              </template>
            </a-select>
            <div v-if="selectedProduct" class="mt-1 text-xs text-gray-500">
              基础单位：<b>{{ selectedProduct.baseUnit }}</b>
              · 默认花期：<b>{{ selectedProduct.shelfLifeDays }}</b> 天
              · 当前总库存：<b>{{ formatQty(selectedProduct.totalStock) }} {{ selectedProduct.baseUnit }}</b>
            </div>
          </a-form-item>

          <a-form-item label="到货日期" name="inboundDate">
            <a-date-picker
              v-model:value="form.inboundDate"
              :disabled-date="disabledFutureDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="w-full"
              @change="recalcExpiry"
            />
          </a-form-item>

          <a-form-item label="预计到期日" name="expiryDate">
            <a-date-picker
              v-model:value="form.expiryDate"
              :disabled-date="disabledExpiryDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </a-form-item>

          <a-form-item label="入库数量" name="inboundQty">
            <a-input-number
              v-model:value="form.inboundQty"
              :min="0.01"
              :step="1"
              :precision="2"
              class="w-full"
              :addon-after="selectedProduct?.baseUnit || '基础单位'"
              placeholder="按基础单位录入"
            />
          </a-form-item>

          <a-form-item label="进价" name="costPrice">
            <a-input-number
              v-model:value="form.costPrice"
              :min="0"
              :step="0.5"
              :precision="2"
              class="w-full"
              prefix="¥"
              placeholder="单位进货价"
            />
          </a-form-item>

          <a-form-item label="备注" name="notes" class="col-span-2">
            <a-textarea v-model:value="form.notes" :rows="3" placeholder="可选备注，例如供应商、运输情况等" />
          </a-form-item>
        </div>

        <div class="actions">
          <a-button @click="goBack">取消</a-button>
          <a-button :loading="submitting" @click="onSubmit('continue')">保存并继续录入</a-button>
          <a-button type="primary" :loading="submitting" @click="onSubmit('back')">保存并返回</a-button>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useStocks } from '~/composables/useStocks'

useHead({ title: '新增入库 - 花店管理系统' })

const router = useRouter()
const { createInbound, fetchProductsWithStock } = useStocks()

const formRef = ref<any>(null)
const submitting = ref(false)
const productsLoading = ref(false)
const productList = ref<any[]>([])

interface InboundForm {
  productId: number | undefined
  inboundDate: string
  expiryDate: string | undefined
  inboundQty: number | undefined
  costPrice: number | undefined
  notes: string
}

const form = reactive<InboundForm>({
  productId: undefined,
  inboundDate: dayjs().format('YYYY-MM-DD'),
  expiryDate: undefined,
  inboundQty: undefined,
  costPrice: undefined,
  notes: '',
})

const rules: Record<string, any> = {
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  inboundDate: [{ required: true, message: '请选择到货日期', trigger: 'change' }],
  expiryDate: [
    { required: true, message: '请选择到期日期', trigger: 'change' },
    {
      validator: (_rule: any, value: string) => {
        if (!value || !form.inboundDate) return Promise.resolve()
        if (dayjs(value).isBefore(dayjs(form.inboundDate), 'day')) {
          return Promise.reject('到期日不能早于到货日')
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  inboundQty: [
    { required: true, message: '请填写入库数量', trigger: 'blur' },
    {
      validator: (_rule: any, value: number) => {
        if (value === undefined || value === null || Number.isNaN(value)) return Promise.reject('请填写入库数量')
        if (value <= 0) return Promise.reject('入库数量必须大于 0')
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  costPrice: [
    { required: true, message: '请填写进价', trigger: 'blur' },
    {
      validator: (_rule: any, value: number) => {
        if (value === undefined || value === null || Number.isNaN(value)) return Promise.reject('请填写进价')
        if (value < 0) return Promise.reject('进价不能为负数')
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
}

const productOptions = computed(() =>
  productList.value.map((p) => ({
    value: p.id,
    label: p.name,
    raw: p,
  }))
)

const selectedProduct = computed(() => productList.value.find((p) => p.id === form.productId) || null)

const loadProducts = async () => {
  productsLoading.value = true
  try {
    const data = await fetchProductsWithStock()
    productList.value = data.list || []
  } catch (e) {
    productList.value = []
  } finally {
    productsLoading.value = false
  }
}

const onProductChange = () => {
  recalcExpiry()
}

const recalcExpiry = () => {
  if (form.productId && form.inboundDate && selectedProduct.value) {
    form.expiryDate = dayjs(form.inboundDate)
      .add(selectedProduct.value.shelfLifeDays || 0, 'day')
      .format('YYYY-MM-DD')
  }
}

const disabledFutureDate = (current: Dayjs) => {
  return current && current.isAfter(dayjs().endOf('day'))
}

const disabledExpiryDate = (current: Dayjs) => {
  if (!form.inboundDate) return false
  return current && current.isBefore(dayjs(form.inboundDate).startOf('day'))
}

const filterOption = (input: string, option: any) => {
  return option.label?.toLowerCase().includes(input.toLowerCase())
}

const formatQty = (n: number) => {
  if (n === undefined || n === null) return 0
  return Number.isInteger(n) ? n : n.toFixed(2)
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A级': return 'red'
    case 'B级': return 'orange'
    case 'C级': return 'default'
    default: return 'default'
  }
}

const resetForm = () => {
  form.productId = undefined
  form.inboundQty = undefined
  form.costPrice = undefined
  form.notes = ''
  form.inboundDate = dayjs().format('YYYY-MM-DD')
  form.expiryDate = undefined
  formRef.value?.clearValidate()
}

const onSubmit = async (mode: 'continue' | 'back') => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  submitting.value = true
  try {
    const batch = await createInbound({
      productId: form.productId!,
      inboundDate: form.inboundDate,
      expiryDate: form.expiryDate,
      inboundQty: form.inboundQty!,
      costPrice: form.costPrice!,
      notes: form.notes || undefined,
    })

    message.success('入库成功，批次号：' + batch.batchNo)

    if (mode === 'back') {
      router.push('/stocks')
    } else {
      resetForm()
      // 重新加载下拉以显示最新库存
      loadProducts()
    }
  } catch (e) {
    // composable 已 message.error
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.push('/stocks')
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.page-header {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.form-card {
  border-radius: 8px;
  max-width: 900px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;
}

.col-span-2 {
  grid-column: span 2;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
}
</style>
