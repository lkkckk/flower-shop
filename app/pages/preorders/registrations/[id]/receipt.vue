<template>
  <div class="receipt-page">
    <div class="print-controls">
      <NuxtLink :to="'/preorders/registrations/' + route.params.id">← 返回登记详情</NuxtLink>
      <h1>预售登记小票</h1>
      <div class="print-actions">
        <label>纸宽 <select v-model.number="paperWidth" aria-label="小票纸宽"><option :value="58">58mm</option><option :value="80">80mm</option></select></label>
        <button type="button" @click="settingsVisible = true">打印设置</button>
        <button type="button" :disabled="!receiptHtml || printing" @click="printReceipt()">{{ printing ? '打印处理中…' : '打印小票' }}</button>
      </div>
      <p>当前方式：{{ settings.mode === 'qz' ? '系统打印服务' : '浏览器打印' }}。打印失败不影响已保存记录。</p>
      <p v-if="printStatus" role="status">{{ printStatus }}</p>
      <div v-if="printError" role="alert"><p>{{ printError }}</p><p>请先检查是否已出纸，避免重复打印。</p><button type="button" :disabled="printing" @click="printReceipt(true)">改用浏览器打印</button></div>
      <p v-if="loading">加载单据中…</p>
      <div v-else-if="loadError" role="alert">{{ loadError }} <button type="button" @click="loadReceipt">重新加载</button></div>
    </div>
    <iframe v-if="receiptHtml" ref="previewFrame" class="receipt-preview" title="预售登记小票预览" sandbox="allow-same-origin" :srcdoc="receiptHtml" :style="{ width: paperWidth + 'mm', height: previewHeight + 'px' }" @load="resizePreview" />
    <PrintingPrinterSettingsModal v-model:open="settingsVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { resolveShopName } from '~~/shared/shopIdentity'
import { renderPreorderReceipt } from '~/utils/printing/preorderReceipt'
definePageMeta({ layout: false })
const route = useRoute()
const record = ref<any>(null)
const shopName = ref('')
const loading = ref(true)
const loadError = ref('')
const settingsVisible = ref(false)
const printing = ref(false)
const printError = ref('')
const printStatus = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewHeight = ref(600)
const { settings, saveSettings, printPreorderReceipt } = usePrinter()
const { fetchRegistration } = usePreorderRegistrations()
const paperWidth = computed({
  get: () => settings.value.paperWidth,
  set: (value: 58 | 80) => saveSettings({ paperWidth: value }),
})
const receiptHtml = computed(() => record.value && !loading.value && !loadError.value
  ? renderPreorderReceipt(record.value, shopName.value, paperWidth.value) : '')
useHead({ title: () => record.value ? `小票 ${record.value.orderNo}` : '小票预览' })
const resizePreview = async () => {
  const doc = previewFrame.value?.contentDocument
  if (!doc) return
  await doc.fonts.ready
  previewHeight.value = Math.max(200, doc.body.scrollHeight + 24)
}
const loadReceipt = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [data, shop]: any[] = await Promise.all([
      fetchRegistration(Number(route.params.id)),
      $fetch('/api/settings'),
    ])
    if (!data || !shop?.data || shop.error) throw new Error('单据或店铺设置加载失败')
    record.value = data
    shopName.value = resolveShopName(shop.data)
  } catch (error: any) { record.value = null; loadError.value = error?.message || '加载失败，请重试' }
  finally { loading.value = false }
}
const printReceipt = async (forceBrowser = false) => {
  if (printing.value || !receiptHtml.value) return
  printing.value = true
  printError.value = ''
  printStatus.value = ''
  try {
    const result = await printPreorderReceipt(Number(route.params.id), { forceBrowser, paperWidth: paperWidth.value })
    printStatus.value = result.status === 'submitted' ? '打印任务已提交，请检查打印机出纸。' : '已打开浏览器打印窗口，请确认打印。'
  } catch (error: any) { printError.value = error?.message || '打印未完成，请检查打印设置' }
  finally { printing.value = false }
}
onMounted(loadReceipt)
</script>

<style scoped>
.receipt-page { min-height: 100dvh; padding: 20px 12px 40px; background: #f1f2ed; }
.print-controls { max-width: 560px; margin: 0 auto 24px; font-size: 14px; overflow-wrap: anywhere; }
.print-controls > a { display: inline-block; padding: 12px 0; }
.print-controls h1 { margin: 8px 0 16px; font-size: 20px; }
.print-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.print-controls select, .print-controls button { min-height: 44px; padding: 8px 12px; border: 1px solid #b8c4a0; border-radius: 8px; background: white; font-size: 16px; }
.print-controls button { cursor: pointer; }
.print-controls button:disabled { opacity: .4; cursor: not-allowed; }
.print-controls p { font-size: 13px; line-height: 1.7; margin-top: 12px; color: #505843; }
.receipt-preview { display: block; max-width: 100%; margin: 0 auto; border: 0; background: white; }
</style>
