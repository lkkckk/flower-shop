<template>
  <section class="product-picker" aria-label="选购商品">
    <div class="picker-toolbar">
      <a-input ref="searchInputRef" v-model:value="searchKeyword" placeholder="搜索花名、颜色、规格" allow-clear size="large">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <button class="refresh-button" type="button" :disabled="loading" aria-label="刷新商品库存" @click="refresh"><ReloadOutlined :spin="loading" /></button>
    </div>
    <nav v-if="categoryTree.length" class="root-categories" aria-label="商品大类">
      <button type="button" :class="{ active: rootId === null }" :aria-pressed="rootId === null" @click="selectRoot(null)"><AppstoreOutlined />全部商品</button>
      <button v-for="category in categoryTree" :key="category.id" type="button" :class="{ active: rootId === category.id }" :aria-pressed="rootId === category.id" @click="selectRoot(category.id)">{{ category.name }}</button>
    </nav>
    <div class="catalog-workspace">
      <nav class="category-rail" aria-label="商品分类">
        <button type="button" :class="{ active: categoryId === null }" :aria-pressed="categoryId === null" @click="categoryId = null">{{ rootId === null ? '全部鲜花' : '全部' }}</button>
        <button v-for="category in railCategories" :key="category.id" type="button" :class="{ active: categoryId === category.id, child: category.depth > 0 }" :aria-pressed="categoryId === category.id" @click="categoryId = category.id">{{ category.name }}</button>
      </nav>
      <div class="catalog-results" :aria-busy="loading">
        <div class="catalog-heading"><strong>{{ currentCategoryName }}</strong><span>{{ filteredProducts.length }} 款商品</span></div>
        <div v-if="loadError" class="catalog-message" role="alert"><p>{{ loadError }}</p><a-button @click="refresh">重新加载</a-button></div>
        <div v-else-if="loading && !products.length" class="catalog-message"><a-spin tip="正在加载商品" /></div>
        <a-empty v-else-if="!filteredProducts.length" :description="searchKeyword ? '没有找到匹配的商品' : '该分类暂无商品'" class="catalog-message" />
        <div v-else class="product-grid">
          <article v-for="product in filteredProducts" :key="product.id" class="product-card" :class="{ 'is-selected': productQuantity(product) > 0, 'is-sold-out': product.totalStock <= 0 }" :aria-label="product.name">
            <button class="product-photo" type="button" :aria-label="'查看' + product.name + '详情'" @click="detailProduct = product">
              <img v-if="product.imageUrl && !failedImages[product.id]" :src="product.imageUrl" :alt="product.name" loading="lazy" @error="failedImages[product.id] = true" />
              <span v-else class="missing-photo"><PictureOutlined /><span>暂无图片</span></span>
              <span v-if="product.totalStock <= 0" class="sold-out-label">暂时售罄</span>
            </button>
            <div class="product-info">
              <button class="product-name" type="button" @click="detailProduct = product">{{ product.name }}</button>
              <div class="product-tags"><span v-if="product.specification">{{ product.specification }}</span><span v-if="product.grade">{{ product.grade }}</span><span v-if="product.color">{{ product.color }}</span></div>
              <label class="unit-picker"><span>单位</span><select :value="selectedUnit(product)" :aria-label="product.name + '销售单位'" @change="units[product.id] = ($event.target as HTMLSelectElement).value"><option v-for="unit in getSaleUnits(product)" :key="unit.name" :value="unit.name">{{ unit.name }}{{ unit.factor !== 1 ? '（' + unit.factor + product.baseUnit + '）' : '' }}</option></select></label>
              <div class="product-price"><strong>¥{{ unitPrice(product).toFixed(2) }}</strong><span>/{{ selectedUnit(product) }}</span></div>
              <div class="stock-copy">{{ product.totalStock <= 0 ? '补货中' : '还可加 ' + formatQuantity(remaining(product)) + ' ' + selectedUnit(product) }}</div>
              <div class="product-stepper">
                <button v-if="selectedQuantity(product) > 0" type="button" class="quantity-button minus" :aria-label="'减少' + product.name" @click="changeQuantity(product, Math.max(0, selectedQuantity(product) - 1))"><MinusOutlined /></button>
                <button v-if="selectedQuantity(product) > 0" type="button" class="quantity-value" :aria-label="'修改' + product.name + '数量'" @click="openQuantity(product)">{{ formatQuantity(selectedQuantity(product)) }}</button>
                <button type="button" class="quantity-button plus" :disabled="loading || !!loadError || remaining(product) < 1 - 1e-8" :aria-label="'添加' + product.name" @click="changeQuantity(product, selectedQuantity(product) + 1)"><PlusOutlined /></button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
    <a-modal :open="!!quantityProduct" title="修改数量" ok-text="确认" cancel-text="取消" width="360px" @ok="confirmQuantity" @cancel="quantityProduct = null">
      <div v-if="quantityProduct" class="quantity-form"><strong>{{ quantityProduct.name }}</strong><p>销售单位：{{ quantityUnit }} · 最多 {{ formatQuantity(maxQuantity) }} {{ quantityUnit }}</p><a-input-number v-model:value="quantityDraft" :min="0" :max="maxQuantity" :step="1" size="large" class="w-full" aria-label="商品数量" /><p>设为 0 可从清单移除</p></div>
    </a-modal>
    <a-modal :open="!!detailProduct" :title="detailProduct?.name" :footer="null" width="480px" @cancel="detailProduct = null">
      <div v-if="detailProduct" class="product-detail"><img v-if="detailProduct.imageUrl && !failedImages[detailProduct.id]" :src="detailProduct.imageUrl" :alt="detailProduct.name" @error="failedImages[detailProduct.id] = true" /><p>{{ [detailProduct.specification, detailProduct.grade, detailProduct.color].filter(Boolean).join(' · ') }}</p><p>库存：{{ formatQuantity(detailProduct.totalStock) }} {{ detailProduct.baseUnit }}</p><strong>¥{{ unitPrice(detailProduct).toFixed(2) }}/{{ selectedUnit(detailProduct) }}</strong><a-button type="primary" size="large" block :disabled="loading || !!loadError || remaining(detailProduct) < 1 - 1e-8" @click="changeQuantity(detailProduct, selectedQuantity(detailProduct) + 1)">加入 1 {{ selectedUnit(detailProduct) }}<span v-if="selectedQuantity(detailProduct)"> · 已选 {{ formatQuantity(selectedQuantity(detailProduct)) }}</span></a-button></div>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AppstoreOutlined, MinusOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useCartStore } from '~/stores/cart'
import { getSaleUnits, getUnitFactor, remainingSaleQuantity, type SaleProduct } from '~~/shared/posQuantity'

interface CatalogProduct extends SaleProduct { name: string; defaultPrice: number; imageUrl?: string | null; specification?: string | null; grade?: string | null; color?: string | null; categoryId?: number | null }
interface Category { id: number; name: string; children?: Category[] }
const cartStore = useCartStore()
const { token } = useAuth()
const products = ref<CatalogProduct[]>([])
const categoryTree = ref<Category[]>([])
const loading = ref(false)
const loadError = ref('')
const searchKeyword = ref('')
const searchInputRef = ref()
const rootId = ref<number | null>(null)
const categoryId = ref<number | null>(null)
const units = ref<Record<number, string>>({})
const failedImages = ref<Record<number, boolean>>({})
const detailProduct = ref<CatalogProduct | null>(null)
const quantityProduct = ref<CatalogProduct | null>(null)
const quantityUnit = ref('')
const quantityDraft = ref<number | null>(1)
const flatten = (nodes: Category[], depth = 0): (Category & { depth: number })[] => nodes.flatMap(n => [{ ...n, depth }, ...flatten(n.children || [], depth + 1)])
const allCategories = computed(() => flatten(categoryTree.value))
const rootCategory = computed(() => categoryTree.value.find(c => c.id === rootId.value))
const railCategories = computed(() => rootCategory.value ? flatten(rootCategory.value.children || []) : allCategories.value)
const currentCategoryName = computed(() => allCategories.value.find(c => c.id === categoryId.value)?.name || rootCategory.value?.name || '全部鲜花')
const filteredProducts = computed(() => {
  const selected = allCategories.value.find(c => c.id === (categoryId.value ?? rootId.value))
  const ids = selected ? new Set(flatten([selected]).map(c => c.id)) : null
  const keyword = searchKeyword.value.trim().toLocaleLowerCase()
  return products.value.filter(p => (!ids || (p.categoryId != null && ids.has(p.categoryId))) && (!keyword || [p.name, p.color, p.specification].filter(Boolean).join(' ').toLocaleLowerCase().includes(keyword)))
})
const selectRoot = (id: number | null) => { rootId.value = id; categoryId.value = null }
const selectedUnit = (product: CatalogProduct) => units.value[product.id] || product.baseUnit
const selectedItem = (product: CatalogProduct, unit = selectedUnit(product)) => cartStore.activeCart?.items.find(i => i.productId === product.id && i.unit === unit)
const selectedQuantity = (product: CatalogProduct) => selectedItem(product)?.qty || 0
const productQuantity = (product: CatalogProduct) => cartStore.activeCart?.items.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.baseQty, 0) || 0
const unitPrice = (product: CatalogProduct) => Math.round(product.defaultPrice * getUnitFactor(product, selectedUnit(product)) * 100) / 100
const remaining = (product: CatalogProduct) => remainingSaleQuantity(product, selectedUnit(product), cartStore.activeCart?.items || [])
const formatQuantity = (qty: number) => Number(qty.toFixed(2)).toString()
const maxQuantity = computed(() => quantityProduct.value ? remainingSaleQuantity(quantityProduct.value, quantityUnit.value, cartStore.activeCart?.items || [], selectedItem(quantityProduct.value, quantityUnit.value)?.id) : 0)
const changeQuantity = (product: CatalogProduct, qty: number, unit = selectedUnit(product)) => {
  const cart = cartStore.activeCart
  if (!cart || loading.value || loadError.value) return
  const item = selectedItem(product, unit)
  const max = remainingSaleQuantity(product, unit, cart.items, item?.id)
  if (!Number.isFinite(qty) || qty < 0) { message.warning('请输入有效数量'); return }
  if (qty > max + 1e-8 && qty > (item?.qty || 0)) { message.warning('库存不足，最多可选 ' + formatQuantity(max) + ' ' + unit); return }
  if (qty === 0) { if (item) cartStore.removeItem(cart.id, item.id) }
  else if (item) cartStore.updateItemQty(cart.id, item.id, qty)
  else cartStore.addItem(cart.id, product, unit, qty)
}
const openQuantity = (product: CatalogProduct) => { quantityProduct.value = product; quantityUnit.value = selectedUnit(product); quantityDraft.value = selectedQuantity(product) }
const confirmQuantity = () => {
  if (!quantityProduct.value || quantityDraft.value === null || !Number.isFinite(quantityDraft.value) || quantityDraft.value < 0 || quantityDraft.value > maxQuantity.value + 1e-8) { message.warning('请输入可售范围内的数量'); return }
  changeQuantity(quantityProduct.value, quantityDraft.value, quantityUnit.value)
  quantityProduct.value = null
}
const refresh = async () => {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const [catalog, categories]: any[] = await Promise.all([$fetch('/api/products/with-stock'), $fetch('/api/categories')])
    if (catalog.error || categories.error) throw new Error(catalog.error?.message || categories.error?.message)
    products.value = catalog.data?.list || []
    cartStore.refreshProductPrices(products.value)
    categoryTree.value = categories.data || []
  } catch { loadError.value = '商品加载失败，请检查连接后重试' }
  finally { loading.value = false }
}
defineExpose({ focusSearch: () => searchInputRef.value?.focus(), refresh })
onMounted(() => { if (token.value) refresh() })
</script>

<style scoped>
.product-picker { display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; background: #fff; }
.picker-toolbar { display: flex; gap: 10px; padding: 14px 18px 10px; }
.picker-toolbar :deep(.ant-input-affix-wrapper) { border-radius: 24px; background: #f5f5f2; border-color: transparent; box-shadow: none; min-height: 44px; }
.picker-toolbar :deep(input) { background: transparent; font-size: 16px; }
.refresh-button { flex-shrink: 0; width: 44px; height: 44px; border: 1px solid var(--line-soft); border-radius: 50%; background: #fff; color: var(--avo-700); font-size: 18px; cursor: pointer; }
.root-categories { display: flex; gap: 8px; padding: 2px 18px 14px; overflow-x: auto; flex-shrink: 0; }
.root-categories button { display: flex; align-items: center; gap: 8px; white-space: nowrap; padding: 10px 18px; min-height: 44px; border: 1px solid #e9eae4; border-radius: 14px; color: var(--ink-700); background: #f7f8f4; cursor: pointer; font-weight: 500; }
.root-categories button.active { background: var(--avo-800); border-color: var(--avo-800); color: #fff; }
.catalog-workspace { display: flex; flex: 1; min-height: 0; border-top: 1px solid #f2f1ed; }
.category-rail { display: flex; flex-direction: column; flex: 0 0 112px; padding: 10px 0; overflow-y: auto; background: #f8f8f5; }
.category-rail button { position: relative; padding: 14px 10px; min-height: 52px; border: 0; text-align: center; background: transparent; color: #65675e; cursor: pointer; line-height: 1.5; overflow-wrap: anywhere; }
.category-rail button.active { background: #fff; color: var(--avo-800); font-weight: 700; }
.category-rail button.active::before { content: ''; position: absolute; left: 0; top: 16px; bottom: 16px; width: 4px; background: var(--pit-300); border-radius: 0 4px 4px 0; }
.category-rail button.child { font-size: 12px; }
.catalog-results { flex: 1; min-width: 0; overflow-y: auto; padding: 14px 18px 24px; container-type: inline-size; }
.catalog-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--ink-900); }
.catalog-heading strong { font-size: 17px; }
.catalog-heading span { flex-shrink: 0; font-size: 12px; color: #888b80; }
.catalog-message { padding: 48px 12px; text-align: center; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
.product-card { min-width: 0; overflow: hidden; background: #f7f7f5; border: 1px solid transparent; border-radius: 18px; }
.product-card.is-selected { border-color: var(--avo-300); background: #fafbf5; }
.product-photo { position: relative; display: block; padding: 0; border: 0; width: 100%; aspect-ratio: 1.3; overflow: hidden; background: #eeefe9; cursor: pointer; }
.product-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.missing-photo { display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 8px; font-size: 12px; color: #939786; }
.missing-photo :deep(.anticon) { font-size: 32px; }
.sold-out-label { position: absolute; left: 10px; bottom: 10px; padding: 4px 10px; border-radius: 20px; background: rgba(35, 39, 32, .8); color: white; font-size: 12px; }
.product-info { position: relative; padding: 12px; padding-bottom: 62px; min-width: 0; }
.product-name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 100%; padding: 0; border: 0; text-align: left; background: transparent; font-size: 17px; font-weight: 650; line-height: 1.45; color: #30362a; cursor: pointer; }
.product-tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 8px; min-height: 20px; }
.product-tags span { border-radius: 6px; padding: 2px 6px; background: #eeebf5; color: #73678f; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.unit-picker { display: flex; align-items: center; gap: 4px; color: #7c8074; font-size: 12px; }
.unit-picker select { min-width: 0; max-width: 100%; min-height: 36px; padding: 4px 22px 4px 6px; border: 1px solid #e3e5db; border-radius: 8px; color: var(--ink-700); background: #fff; font-size: 14px; }
.product-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.product-price strong { color: #a96e3d; font-size: 23px; font-family: Outfit, 'Noto Sans SC', sans-serif; line-height: 1.2; }
.product-price span, .stock-copy { color: #83877b; font-size: 12px; }
.stock-copy { margin-top: 5px; }
.product-stepper { position: absolute; right: 10px; bottom: 10px; display: flex; align-items: center; gap: 2px; }
.quantity-button { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; touch-action: manipulation; font-size: 18px; }
.quantity-button.plus { color: white; background: #ba885b; }
.quantity-button.minus { color: var(--avo-800); background: #e9eddc; }
.quantity-button:disabled { color: #999e90; background: #e5e7df; cursor: not-allowed; }
.quantity-value { padding: 0 4px; min-width: 32px; height: 44px; border: 0; background: transparent; color: var(--ink-900); font-size: 16px; font-weight: 600; cursor: pointer; }
.quantity-form { padding: 16px 0; }.quantity-form p { margin: 12px 0; color: var(--ink-500); font-size: 13px; }
.product-detail img { width: 100%; max-height: 340px; object-fit: contain; border-radius: 12px; }.product-detail p { margin: 12px 0; }.product-detail strong { display: block; margin: 16px 0; font-size: 24px; color: #a96e3d; }
button:focus-visible, select:focus-visible { outline: 3px solid var(--avo-300); outline-offset: 2px; }
@container (max-width: 430px) {
  .product-grid { grid-template-columns: 1fr; gap: 12px; }
  .product-card { display: flex; border-radius: 14px; }
  .product-photo { width: 36%; flex-shrink: 0; aspect-ratio: auto; min-height: 204px; }
  .product-info { flex: 1; padding: 10px 10px 60px; }
  .product-name { font-size: 16px; }.product-tags { margin-block: 5px; }.product-price strong { font-size: 22px; }
  .unit-picker > span { display: none; }.unit-picker select { width: 100%; }
}
@media (max-width: 600px) {
  .picker-toolbar { padding: 10px 10px 8px; }.root-categories { padding: 0 10px 10px; }.root-categories button { padding: 8px 12px; font-size: 13px; }
  .category-rail { flex-basis: 78px; }.category-rail button { padding-inline: 6px; font-size: 13px; }.catalog-results { padding: 12px 8px 18px; }.catalog-heading { margin-bottom: 10px; }.catalog-heading strong { font-size: 15px; }
  .product-grid { grid-template-columns: 1fr; }.product-card { display: flex; }.product-photo { width: 36%; flex-shrink: 0; aspect-ratio: auto; }.product-info { flex: 1; }
}
</style>
