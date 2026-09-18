<template>
  <component :is="mobile ? Drawer : Modal" :open="!!product" :title="product?.name" :footer="null" :placement="mobile ? 'bottom' : undefined" :height="mobile ? 'auto' : undefined" :width="mobile ? undefined : 480" @close="emit('close')" @cancel="emit('close')">
    <div v-if="product" class="drink-selection">
      <fieldset v-for="group in product.drinkGroups" :key="group.id">
        <legend>{{ group.name }}</legend>
        <div class="options"><button v-for="option in group.options" :key="option.id" type="button" :class="{selected: selection[group.id] === option.id}" :aria-pressed="selection[group.id] === option.id" :disabled="!canSelect(group.id, option.id)" @click="toggle(group.id, option.id)">{{ option.name }}</button></div>
      </fieldset>
      <p role="status">{{ variant?.enabled && variant.price != null ? `¥${Number(variant.price).toFixed(2)} / 杯` : '请选择可售规格' }}</p>
      <a-input-number v-model:value="qty" :min="1" :precision="0" :step="1" size="large" aria-label="饮品杯数" />
      <a-button type="primary" size="large" block :disabled="!variant?.enabled || variant.price == null || !Number.isInteger(qty) || qty < 1" @click="emit('add', variant, qty)">加入购物车</a-button>
    </div>
  </component>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Drawer, Modal } from 'ant-design-vue'
import { useMediaQuery } from '@vueuse/core'
const props = defineProps<{ product: any | null }>()
const emit = defineEmits(['close', 'add'])
const mobile = useMediaQuery('(max-width: 767px)')
const selection = ref<Record<string, string>>({})
const qty = ref(1)
const toggle = (groupId: string, optionId: string) => { if (selection.value[groupId] === optionId) delete selection.value[groupId]; else selection.value[groupId] = optionId }
watch(() => props.product, () => { selection.value = {}; qty.value = 1 })
const matches = (v: any, selected: Record<string,string>) => Object.entries(selected).every(([groupId, optionId]) => v.options.some((o: any) => o.groupId === groupId && o.optionId === optionId))
const variant = computed(() => {
  if (!props.product?.drinkGroups?.every((g: any) => selection.value[g.id])) return null
  return props.product.drinkVariants?.find((v: any) => matches(v, selection.value))
})
const canSelect = (groupId: string, optionId: string) => props.product?.drinkVariants?.some((v: any) => v.enabled && v.price != null && matches(v, { ...selection.value, [groupId]: optionId }))
</script>
<style scoped>
.drink-selection { display:grid; gap:20px; max-height:70dvh; overflow-y:auto; }
fieldset { border:0; padding:0; margin:0; min-width:0; } legend { font-size:15px; font-weight:600; margin-bottom:8px; }
.options { display:flex; gap:10px; flex-wrap:wrap; }.options button { min-height:48px; min-width:72px; padding:10px 16px; border:1px solid #d5ddce; border-radius:10px; background:#fff; overflow-wrap:anywhere; }
.options button.selected { background:#eef3e7; border-color:#5c7148; color:#435632; }.options button:disabled { opacity:.35; }
</style>
