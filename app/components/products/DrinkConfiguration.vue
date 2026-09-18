<template>
  <a-card title="饮品规格与价格" size="small" class="drink-config">
    <p>每组选择一项，按组合定价；不管理库存，所有客户同价。</p>
    <section v-for="(group, index) in groups" :key="group.id" class="option-group">
      <div class="group-heading">
        <a-input v-model:value="group.name" placeholder="规格名称，如温度" :maxlength="40" />
        <a-button :disabled="index === 0" @click="move(groups, index, -1)">上移</a-button>
        <a-button :disabled="index === groups.length - 1" @click="move(groups, index, 1)">下移</a-button>
        <a-button danger @click="groups.splice(index, 1)">删除组</a-button>
      </div>
      <div v-for="(option, optionIndex) in group.options" :key="option.id" class="option-row">
        <a-input v-model:value="option.name" placeholder="选项名称，如冷或500ml" :maxlength="40" />
        <a-button :disabled="optionIndex === 0" title="选项上移" @click="move(group.options, optionIndex, -1)">↑</a-button>
        <a-button :disabled="optionIndex === group.options.length - 1" title="选项下移" @click="move(group.options, optionIndex, 1)">↓</a-button>
        <a-button danger title="删除选项" @click="group.options.splice(optionIndex, 1)">删除</a-button>
      </div>
      <a-button type="dashed" @click="group.options.push({ id: createClientId(), name: '' })">添加选项</a-button>
    </section>
    <a-button type="dashed" block @click="groups.push({id: createClientId(), name: '', options: []})">添加规格组</a-button>
    <a-alert v-if="error" :message="error" type="error" class="mt-3" />
    <div class="batch-price">
      <a-checkbox :checked="variants.length > 0 && selected.length === variants.length" @change="selected = $event.target.checked ? variants.map(v => v.id) : []">全选组合</a-checkbox>
      <a-input-number v-model:value="batchPrice" string-mode :min="0" :precision="2" placeholder="批量售价" />
      <a-button :disabled="!selected.length || batchPrice === null" @click="applyPrice">应用到已选 {{ selected.length }} 项</a-button>
    </div>
    <div v-for="variant in variants" :key="variant.id" class="variant-row">
      <a-checkbox :checked="selected.includes(variant.id)" @change="toggle(variant.id, $event.target.checked)">{{ variant.label || '请填写规格名称' }}</a-checkbox>
      <a-input-number v-model:value="variant.price" string-mode :min="0" :precision="2" placeholder="组合售价" aria-label="组合售价" />
      <a-switch v-model:checked="variant.enabled" checked-children="在售" un-checked-children="停售" />
    </div>
    <p v-if="!variants.length">请至少添加一组规格及选项。</p>
  </a-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { createClientId } from '~~/shared/clientId'
import { rebuildDrinkVariants, type DrinkEditorGroup, type DrinkEditorVariant } from '~~/shared/drinkEditor'
const groups = defineModel<DrinkEditorGroup[]>('groups', { required: true })
const variants = defineModel<DrinkEditorVariant[]>('variants', { required: true })
const selected = ref<string[]>([])
const batchPrice = ref<string | null>(null)
const error = ref('')
const retained = new Map<string, DrinkEditorVariant>()
watch(groups, () => {
  for (const v of variants.value) retained.set(v.selectionKey, { ...v })
  try {
    variants.value = rebuildDrinkVariants(groups.value, [...retained.values()], createClientId)
    selected.value = selected.value.filter(id => variants.value.some(v => v.id === id))
    error.value = ''
  } catch (e: any) { variants.value = []; error.value = e.message }
}, { deep: true, immediate: true })
function move(items: any[], index: number, offset: number) { const [item] = items.splice(index, 1); items.splice(index + offset, 0, item) }
function toggle(id: string, checked: boolean) { selected.value = checked ? [...selected.value, id] : selected.value.filter(value => value !== id) }
function applyPrice() { for (const row of variants.value) if (selected.value.includes(row.id)) row.price = batchPrice.value }
</script>

<style scoped>
.drink-config { grid-column: 1 / -1; min-width: 0; }
p { color: var(--ink-500); font-size: 12px; margin-bottom: 12px; }
.option-group { padding: 12px; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 12px; }
.group-heading, .option-row, .batch-price, .variant-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.group-heading, .batch-price { flex-wrap: wrap; }
.group-heading > input { flex: 1 1 180px; min-width: 0; }
.option-row > input { flex: 1; min-width: 0; }
.batch-price { margin-top: 20px; }
.variant-row { padding: 10px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.variant-row > :first-child { flex: 1 1 200px; overflow-wrap: anywhere; }
.variant-row :deep(.ant-input-number), .batch-price :deep(.ant-input-number) { width: 120px; }
@media (max-width: 480px) { .option-group { padding: 8px; } .option-row { flex-wrap: wrap; } .option-row > input { flex-basis: 100%; } }
</style>
