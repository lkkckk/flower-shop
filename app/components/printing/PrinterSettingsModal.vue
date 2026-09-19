<template>
  <a-modal :open="open" title="本机打印设置" :width="520" @cancel="emit('update:open', false)" @ok="save">
    <a-form layout="vertical">
      <a-form-item label="打印模式"><a-radio-group v-model:value="draft.mode"><a-radio value="browser">浏览器打印</a-radio><a-radio value="qz">系统热敏打印</a-radio></a-radio-group></a-form-item>
      <template v-if="draft.mode === 'qz'">
        <a-form-item label="打印机"><a-select v-model:value="draft.printerName" placeholder="请选择打印机" :options="printers.map(value => ({ value, label: value }))" :loading="busy" /></a-form-item>
        <a-button :loading="busy" @click="refresh">刷新打印机</a-button>
        <p class="hint">需要在本机安装并启动 QZ Tray，首次连接可能要求授权。纸张规格同时以 Windows 驱动配置为准。</p>
      </template>
      <a-alert v-if="error" type="warning" show-icon :message="error" style="margin:12px 0"><template #description><a-button @click="draft.mode = 'browser'; error = ''">改用浏览器打印</a-button></template></a-alert>
      <a-form-item label="纸宽"><a-radio-group v-model:value="draft.paperWidth"><a-radio :value="58">58mm</a-radio><a-radio :value="80">80mm</a-radio></a-radio-group></a-form-item>
      <a-form-item label="打印份数"><a-input-number v-model:value="draft.copies" :min="1" :max="10" :precision="0" /></a-form-item>
      <a-form-item label="POS 结账自动打印"><a-switch v-model:checked="draft.autoPrintPos" /></a-form-item>
      <a-button :loading="testing" @click="test">测试打印</a-button>
      <p class="hint">设置仅保存在当前浏览器。浏览器打印请关闭页眉页脚、选择对应纸宽；份数已在内容中生成，打印面板选择 1 份。</p>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { normalizePrinterSettings } from '../../utils/printing/settings'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const printer = usePrinter()
const draft = reactive(normalizePrinterSettings(printer.settings.value))
const printers = ref<string[]>([])
const busy = ref(false)
const testing = ref(false)
const error = ref('')
watch(() => props.open, (open) => { if (open) { Object.assign(draft, printer.settings.value); error.value = '' } })
async function refresh() {
  busy.value = true; error.value = ''
  try { printers.value = await printer.listPrinters(); if (draft.printerName && !printers.value.includes(draft.printerName)) draft.printerName = '' }
  catch (e: any) { error.value = e?.message || '未检测到本地打印服务' }
  finally { busy.value = false }
}
async function test() {
  testing.value = true; error.value = ''
  try { const result = await printer.testPrint(draft); message.success(result.backend === 'qz' ? '测试任务已提交，请检查打印机' : '已打开打印对话框') }
  catch (e: any) { error.value = e?.message || '测试打印失败' }
  finally { testing.value = false }
}
function save() {
  if (!Number.isInteger(draft.copies) || draft.copies < 1 || draft.copies > 10) { error.value = '打印份数必须为 1 到 10 的整数'; return }
  if (draft.mode === 'qz' && !draft.printerName) { error.value = '请选择有效打印机，或改用浏览器打印'; return }
  try { printer.saveSettings(draft); emit('update:open', false); message.success('本机打印设置已保存') }
  catch (e: any) { error.value = e.message }
}
</script>
<style scoped>.hint{font-size:12px;color:#68705b;line-height:1.7;margin:12px 0}</style>
