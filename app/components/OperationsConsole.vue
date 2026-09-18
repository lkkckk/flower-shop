<template>
  <a-card :title="cashierOnly ? '收银交班' : '门店经营工作台'" class="page-card">
    <a-tabs v-model:active-key="tab" @change="load">
      <a-tab-pane key="shifts" tab="开班与交班">
        <a-form v-if="!myShift" layout="vertical" @finish="openShift">
          <a-form-item label="开班备用金"><a-input-number v-model:value="openingCash" :min="0" :precision="2" /></a-form-item>
          <a-button type="primary" html-type="submit" :disabled="busy">开始当班</a-button>
        </a-form>
        <template v-else>
          <div class="mvp-metrics"><div>当前班次<strong>#{{ myShift.id }}</strong></div><div>理论现金<strong>¥{{ myShift.currentExpected }}</strong></div></div>
          <a-form layout="vertical" @finish="closeShift">
            <div class="mvp-form-grid"><a-form-item label="实盘现金"><a-input-number v-model:value="countedCash" :min="0" :precision="2" class="w-full" /></a-form-item><a-form-item label="差异 / 交班说明"><a-input v-model:value="shiftNotes" /></a-form-item></div>
            <a-button type="primary" html-type="submit" :disabled="busy">确认交班</a-button>
          </a-form>
          <a-divider>现金支出</a-divider>
          <div class="mvp-return-line"><a-input-number v-model:value="expense.amount" :min="0.01" :precision="2" placeholder="金额" /><a-input v-model:value="expense.notes" placeholder="用途" style="max-width:300px" /><a-button :disabled="busy" @click="recordExpense">记录现金支出</a-button></div>
        </template>
        <a-table :columns="shiftColumns" :data-source="shifts" row-key="id" :scroll="{x:700}" class="mt-4"><template #bodyCell="{column,record}"><template v-if="column.key==='actions'"><a-button size="small" @click="shiftDetail=record">明细</a-button><template v-if="isStrictAdmin && record.status==='closed'"><a-popconfirm title="以当前填写的交班说明重开该班次？" @confirm="reopen(record.id)"><a-button size="small">重开</a-button></a-popconfirm></template></template><template v-else>{{ column.dataIndex==='status' ? (record.status==='open' ? '当班中' : '已交班') : record[column.dataIndex] }}</template></template></a-table>
      </a-tab-pane>
      <a-tab-pane v-if="!cashierOnly" key="purchases" tab="采购与收货">
        <a-form layout="vertical" @finish="createPurchase">
          <div class="mvp-form-grid"><a-form-item label="供应商"><a-select v-model:value="purchase.supplierId" :options="suppliers.map(s=>({value:s.id,label:s.name}))" /></a-form-item><a-form-item label="预计到货时间"><input type="datetime-local" v-model="purchase.expectedAt" class="mvp-input" /></a-form-item></div>
          <div v-for="(line,i) in purchase.items" :key="i" class="mvp-return-line"><a-select v-model:value="line.productId" show-search option-filter-prop="label" :options="products.map(p=>({value:p.id,label:`${p.name} / ${p.baseUnit}`}))" style="min-width:220px" /><a-input-number v-model:value="line.qty" :min="0.001" :precision="3" placeholder="基础单位数量" /><a-input-number v-model:value="line.unitCost" :min="0" :precision="2" placeholder="基础单位成本" /><a-button @click="purchase.items.splice(i,1)">移除</a-button></div>
          <a-space wrap><a-button @click="purchase.items.push({productId:null,qty:1,unitCost:0})">添加商品</a-button><a-button @click="useSuggestions">载入采购建议</a-button><a-button type="primary" html-type="submit" :disabled="busy">保存采购草稿</a-button></a-space>
        </a-form>
        <a-divider>采购记录（数量均为基础单位）</a-divider>
        <a-list :data-source="purchases"><template #renderItem="{item}"><a-list-item><div class="w-full"><strong>采购 #{{item.id}} · {{item.supplier.name}} · {{purchaseStatus[item.status]}}</strong><p v-for="line in item.items" :key="line.id">{{productName(line.productId)}} · 采购 {{line.qty}} / 已收 {{line.receivedQty}}</p><a-button v-if="item.status!=='received'" @click="showReceive(item)">登记本次到货</a-button></div></a-list-item></template></a-list>
      </a-tab-pane>
      <a-tab-pane v-if="!cashierOnly" key="suppliers" tab="供应商与应付">
        <a-form layout="vertical" @finish="addSupplier"><div class="mvp-form-grid"><a-form-item label="供应商名称"><a-input v-model:value="supplier.name" /></a-form-item><a-form-item label="电话"><a-input v-model:value="supplier.phone" /></a-form-item></div><a-form-item label="地址"><a-input v-model:value="supplier.address" /></a-form-item><a-button type="primary" html-type="submit" :disabled="busy">添加供应商</a-button></a-form>
        <a-list :data-source="suppliers"><template #renderItem="{item}"><a-list-item><div><strong>{{item.name}}</strong> · {{item.phone}} · 应付 ¥{{due(item)}}<a-button v-if="isStrictAdmin" class="ml-3" @click="supplierPayment.supplierId=item.id">登记付款</a-button></div></a-list-item></template></a-list>
        <a-form v-if="supplierPayment.supplierId && isStrictAdmin" layout="vertical" @finish="paySupplier"><a-alert :message="`向供应商 #${supplierPayment.supplierId} 付款`" /><div class="mvp-return-line"><a-input-number v-model:value="supplierPayment.amount" :min="0.01" :precision="2" /><a-select v-model:value="supplierPayment.paymentMethod" :options="paymentMethods" /><a-input v-model:value="supplierPayment.notes" placeholder="付款凭证 / 备注" /></div><a-button html-type="submit" :disabled="busy">确认已付款</a-button></a-form>
      </a-tab-pane>
      <a-tab-pane v-if="isStrictAdmin && !cashierOnly" key="loyalty" tab="积分规则">
        <a-alert message="等级手工维护；批发客户不参与。订单完成且结清后发放积分，充值不赠分；退款冲回积分。积分无到期日。" class="mb-4" />
        <a-form layout="vertical" @finish="saveRules"><a-form-item label="每实付 1 元获得积分"><a-input-number v-model:value="rules.earnPerYuan" :min="0" :max="100" /></a-form-item><a-form-item label="每抵扣 1 元需要积分"><a-input-number v-model:value="rules.pointsPerYuan" :min="1" :precision="0" /></a-form-item><a-form-item label="单笔最多抵扣订单金额的百分比"><a-input-number v-model:value="rules.maxPercent" :min="0" :max="100" /></a-form-item><a-button type="primary" html-type="submit" :disabled="busy">保存规则</a-button></a-form>
      </a-tab-pane>
      <a-tab-pane v-if="isStrictAdmin && !cashierOnly" key="transfer" tab="导入导出">
        <a-space wrap><a-select v-model:value="importKind" :options="[{value:'customers',label:'客户'},{value:'products',label:'商品'},{value:'stocks',label:'库存'}]" style="width:150px" /><a-button @click="downloadTemplate">下载 CSV 模板</a-button><input type="file" accept=".csv,text/csv" @change="readCsv" /></a-space>
        <p class="my-3">先预检全部行，再确认导入；任何一行有误时不会导入。</p><a-button :disabled="busy || !csv" @click="previewImport">预检文件</a-button>
        <template v-if="importJob"><a-alert :message="`任务 #${importJob.id} · ${importJob.rows?.length || 0} 行 · ${importJob.errors?.length || 0} 个错误`" class="my-3" /><p v-for="e in importJob.errors" :key="e.row">第 {{e.row}} 行：{{e.message}}</p><a-button v-if="importJob.status==='validated'" type="primary" :disabled="busy" @click="commitImport">确认导入</a-button></template>
        <a-divider>数据导出</a-divider><a-space wrap><a-button v-for="[kind,label] in exportKinds" :key="kind" @click="exportData(kind)">{{label}}</a-button></a-space>
      </a-tab-pane>
      <a-tab-pane v-if="isStrictAdmin && !cashierOnly" key="reconciliation" tab="账本核对"><a-alert :type="reconciliation.ready?'success':'warning'" :message="`已核对 ${reconciliation.checkedCustomers||0} 位客户，余额不一致 ${reconciliation.mismatches?.length||0} 项，迁移待核对 ${reconciliation.unresolved?.length||0} 项`" /><pre style="white-space:pre-wrap;overflow-wrap:anywhere">{{JSON.stringify(reconciliation.mismatches,null,2)}}</pre><a-list :data-source="reconciliation.unresolved||[]"><template #renderItem="{item}"><a-list-item><div>#{{item.id}} · {{item.action}} · {{item.entityType}} #{{item.entityId}}<pre style="white-space:pre-wrap">{{JSON.stringify(item.details,null,2)}}</pre><template v-if="item.action==='migration.discrepancy'"><a-input-number v-model:value="item.confirmedStoredValue" :min="0" :precision="2" placeholder="确认的预存金额" /><a-input v-model:value="item.resolutionNotes" placeholder="核对凭证和差异原因" /><a-button :disabled="busy" @click="resolveIssue(item)">记录期初调整</a-button></template></div></a-list-item></template></a-list></a-tab-pane>
      <a-tab-pane v-if="isStrictAdmin && !cashierOnly" key="audit" tab="操作审计"><a-list :data-source="audit"><template #renderItem="{item}"><a-list-item><div><strong>{{item.action}}</strong> · {{item.entityType}} #{{item.entityId}} · 操作人 {{item.operatorUserId || '迁移'}}<p>{{new Date(item.createdAt).toLocaleString('zh-CN')}}</p><details><summary>查看明细</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">{{JSON.stringify(item.details,null,2)}}</pre></details></div></a-list-item></template></a-list></a-tab-pane>
    </a-tabs>
    <a-modal :open="!!shiftDetail" title="班次收支明细" :footer="null" @cancel="shiftDetail=null">
      <template v-if="shiftDetail"><p>备用金 ¥{{shiftDetail.openingCash}} · 理论现金 ¥{{shiftDetail.currentExpected}} · 实盘 ¥{{shiftDetail.countedCash??'待交班'}}</p><a-list :data-source="[...(shiftDetail.payments||[]),...shiftDetail.movements]"><template #renderItem="{item}"><a-list-item><div>{{new Date(item.createdAt).toLocaleString('zh-CN')}} · {{cashType[item.type]||item.type}} · {{item.paymentMethod||'现金'}}<strong> ¥{{item.amount}}</strong><p>{{item.notes}} <span v-if="item.orderId">订单 #{{item.orderId}}</span></p></div></a-list-item></template></a-list></template>
    </a-modal>
    <a-modal v-model:open="receiveVisible" title="登记本次到货" :confirm-loading="busy" @ok="receive">
      <div v-for="line in receipt.lines" :key="line.itemId" class="mb-4"><strong>{{line.name}} · 最多 {{line.max}}</strong><div class="mvp-return-line"><a-input-number v-model:value="line.qty" :min="0" :max="line.max" :precision="3" placeholder="本次收货数量" /><a-input-number v-model:value="line.unitCost" :min="0" :precision="2" placeholder="实际成本" /></div><label>到期日期<input type="date" v-model="line.expiryDate" class="mvp-input" /></label></div>
    </a-modal>
  </a-card>
</template>
<script setup lang="ts">
import { sumMoney, decimal } from '~~/shared/money'
import { makeCsv } from '~~/shared/csv'
const props=withDefaults(defineProps<{cashierOnly?:boolean}>(),{cashierOnly:false})
const {user,isStrictAdmin}=useAuth();const {request,busy}=useBusiness()
const reconciliation=ref<any>({})
async function resolveIssue(item:any){await request(`/api/reconciliation/${item.id}/resolve`,'POST',{confirmedStoredValue:item.confirmedStoredValue,notes:item.resolutionNotes});await load()}
const tab=ref('shifts'),shifts=ref<any[]>([]),suppliers=ref<any[]>([]),products=ref<any[]>([]),purchases=ref<any[]>([]),audit=ref<any[]>([])
const shiftDetail=ref<any>(null),cashType:Record<string,string>={income:'订单收款 / 补款',recharge:'预存充值',repay:'客户还款',refund:'订单退款',expense:'现金支出'}
const openingCash=ref(0),countedCash=ref(0),shiftNotes=ref('')
const expense=reactive({amount:0,notes:''}),supplier=reactive({name:'',phone:'',address:''})
const purchase=reactive<any>({supplierId:null,expectedAt:'',items:[{productId:null,qty:1,unitCost:0}]})
const supplierPayment=reactive<any>({supplierId:null,amount:0,paymentMethod:'bank',notes:''})
const rules=reactive({earnPerYuan:1,pointsPerYuan:100,maxPercent:20})
const receipt=reactive<any>({id:null,lines:[]}),receiveVisible=ref(false)
const importKind=ref('customers'),csv=ref(''),importJob=ref<any>(null),templates=ref<Record<string,string[]>>({})
const paymentMethods=[{value:'bank',label:'银行转账'},{value:'cash',label:'现金'},{value:'wechat',label:'微信'},{value:'alipay',label:'支付宝'}]
const exportKinds=[['customers','客户'],['products','商品'],['orders','订单'],['payments','付款'],['accounts','账户流水'],['points','积分'],['stocks','库存'],['purchases','采购']]
const purchaseStatus:Record<string,string>={draft:'待收货',partial:'部分到货',received:'已收齐'}
const shiftColumns=[{title:'班次',dataIndex:'id'},{title:'员工',dataIndex:'userId'},{title:'状态',dataIndex:'status'},{title:'理论现金',dataIndex:'currentExpected'},{title:'实盘',dataIndex:'countedCash'},{title:'差异',dataIndex:'variance'},{title:'操作',key:'actions'}]
const myShift=computed(()=>shifts.value.find(s=>s.userId===user.value?.id&&s.status==='open'))
const productName=(id:number)=>products.value.find(p=>p.id===id)?.name||`商品 #${id}`
const due=(s:any)=>sumMoney(s.entries.map((e:any)=>e.amount)).toFixed(2)
async function load(){
 if(tab.value==='shifts')shifts.value=(await request('/api/shifts')).list
 if(['purchases','suppliers'].includes(tab.value)){suppliers.value=(await request('/api/suppliers')).list;products.value=(await request('/api/products?pageSize=1000')).list;purchases.value=(await request('/api/purchases')).list}
 if(tab.value==='loyalty')Object.assign(rules,await request('/api/loyalty-rules'))
 if(tab.value==='reconciliation')reconciliation.value=await request('/api/reconciliation')
 if(tab.value==='audit')audit.value=(await request('/api/audit')).list
 if(tab.value==='transfer')templates.value=(await request('/api/imports')).templates
}
async function openShift(){await request('/api/shifts','POST',{openingCash:openingCash.value});await load()}
async function closeShift(){await request(`/api/shifts/${myShift.value.id}/close`,'POST',{countedCash:countedCash.value,notes:shiftNotes.value});await load()}
async function recordExpense(){await request(`/api/shifts/${myShift.value.id}/movements`,'POST',expense);await load()}
async function reopen(id:number){await request(`/api/shifts/${id}/reopen`,'POST',{notes:shiftNotes.value});await load()}
async function addSupplier(){await request('/api/suppliers','POST',supplier);supplier.name='';await load()}
async function createPurchase(){await request('/api/purchases','POST',purchase);purchase.items=[{productId:null,qty:1,unitCost:0}];await load()}
async function useSuggestions(){const d=await request('/api/stocks/purchase-suggestion');const rows=d.list||d.items||[];purchase.items=rows.filter((r:any)=>Number(r.gap)>0).map((r:any)=>({productId:r.productId,qty:Number(r.gap),unitCost:0}))}
function showReceive(po:any){receipt.id=po.id;receipt.lines=po.items.map((i:any)=>({...i,itemId:i.id,name:productName(i.productId),max:decimal(i.qty).minus(i.receivedQty).toNumber(),qty:0,unitCost:Number(i.unitCost),expiryDate:''}));receiveVisible.value=true}
async function receive(){await request(`/api/purchases/${receipt.id}/receive`,'POST',{lines:receipt.lines.filter((l:any)=>l.qty>0)});receiveVisible.value=false;await load()}
async function paySupplier(){await request(`/api/suppliers/${supplierPayment.supplierId}/payments`,'POST',supplierPayment);supplierPayment.supplierId=null;await load()}
async function saveRules(){await request('/api/loyalty-rules','PUT',rules)}
function download(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function downloadTemplate(){download(`${importKind.value}-template.csv`,makeCsv([],templates.value[importKind.value]))}
async function readCsv(e:Event){const f=(e.target as HTMLInputElement).files?.[0];if(f)csv.value=await f.text()}
async function previewImport(){importJob.value=await request('/api/imports/preview','POST',{kind:importKind.value,csv:csv.value})}
async function commitImport(){importJob.value=await request(`/api/imports/${importJob.value.id}/commit`,'POST',{});await load()}
async function exportData(kind:string){const d=await request(`/api/exports/${kind}`);download(d.filename,d.csv)}
onMounted(load)
</script>
