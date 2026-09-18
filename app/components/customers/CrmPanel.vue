<template>
  <a-card title="客户经营档案" class="mt-4">
    <a-tabs @change="tabChanged">
      <a-tab-pane key="timeline" tab="完整时间线">
        <a-list :loading="busy" :data-source="timeline.list || []"><template #renderItem="{ item }"><a-list-item><div>
          <strong>{{ labels[item.eventType] }}</strong> · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
          <p>{{ item.content || item.notes || item.reason || item.orderNo || typeLabels[item.type] || item.type }} <span v-if="item.amount !== undefined">{{ item.eventType === 'points' ? `${item.amount} 分` : `¥${Number(item.amount).toFixed(2)}` }}</span></p>
        </div></a-list-item></template></a-list>
        <a-pagination v-model:current="page" :total="timeline.total || 0" :page-size="20" @change="loadTimeline" />
      </a-tab-pane>
      <a-tab-pane key="profile" tab="偏好与标签">
        <a-form layout="vertical" @finish="saveProfile">
          <a-form-item label="客户标签"><a-select v-model:value="profile.tags" mode="tags" :disabled="isCashier" /></a-form-item>
          <a-form-item label="花材、颜色、预算及配送偏好"><a-textarea v-model:value="profile.preferences" :disabled="isCashier" /></a-form-item>
          <a-form-item label="信用额度（留空表示不限制）"><a-input-number v-model:value="profile.creditLimit" :min="0" :precision="2" :disabled="isCashier" /></a-form-item>
          <a-button v-if="!isCashier" html-type="submit" type="primary" :disabled="busy">保存档案</a-button>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="contacts" tab="跟进与节日">
        <a-form v-if="!isCashier" layout="vertical" @finish="addContact">
          <a-form-item label="跟进内容"><a-textarea v-model:value="contact.content" /></a-form-item>
          <a-form-item label="下次联系时间"><input v-model="contact.nextContactAt" type="datetime-local" class="mvp-input" /></a-form-item>
          <a-button html-type="submit" :disabled="busy">记录跟进</a-button>
        </a-form>
        <a-list :data-source="contacts"><template #renderItem="{item}"><a-list-item><div>{{ item.content }}<p v-if="item.nextContactAt">下次联系：{{ new Date(item.nextContactAt).toLocaleString('zh-CN') }}</p><a-tag v-if="item.completedAt">已处理</a-tag><a-button v-else-if="!isCashier && item.nextContactAt" :disabled="busy" @click="finishContact(item.id)">标记已处理</a-button></div></a-list-item></template></a-list>
        <a-divider>生日 / 纪念日</a-divider>
        <a-form v-if="!isCashier" layout="vertical" @finish="addEvent">
          <div class="mvp-form-grid">
            <a-form-item label="事件名称"><a-input v-model:value="festival.title" /></a-form-item>
            <a-form-item label="历法"><a-select v-model:value="festival.calendar" :options="[{value:'solar',label:'公历'},{value:'lunar',label:'农历（非闰月）'}]" /></a-form-item>
            <a-form-item label="月 / 日"><a-input-number v-model:value="festival.month" :min="1" :max="12" /> / <a-input-number v-model:value="festival.day" :min="1" :max="31" /></a-form-item>
            <a-form-item label="提前提醒天数"><a-input-number v-model:value="festival.remindDays" :min="0" :max="30" /></a-form-item>
          </div>
          <a-button html-type="submit" :disabled="busy">添加节日</a-button>
        </a-form>
        <a-list :data-source="events"><template #renderItem="{item}"><a-list-item>{{ item.title }} · {{ item.calendar === 'lunar' ? '农历' : '公历' }} {{ item.month }}/{{ item.day }} · 提前 {{ item.remindDays }} 天 <a-button v-if="!isCashier" :disabled="busy" @click="toggleEvent(item)">{{ item.active ? '停用' : '启用' }}</a-button></a-list-item></template></a-list>
      </a-tab-pane>
      <a-tab-pane v-if="isStrictAdmin" key="admin" tab="积分调整与合并">
        <a-form layout="vertical" @finish="adjustPoints">
          <a-form-item label="积分调整量（可正可负）"><a-input-number v-model:value="point.amount" :precision="0" /></a-form-item>
          <a-form-item label="调整原因"><a-input v-model:value="point.notes" /></a-form-item>
          <a-button html-type="submit" :disabled="busy">保存积分流水</a-button>
        </a-form>
        <a-divider>预存账务调整</a-divider><a-form layout="vertical" @finish="adjustAccount"><a-form-item label="调整金额（可正可负）"><a-input-number v-model:value="account.amount" :precision="2" /></a-form-item><a-form-item label="调整凭证与原因"><a-input v-model:value="account.notes" /></a-form-item><a-button html-type="submit" :disabled="busy">保存预存调整流水</a-button></a-form><a-divider>合并重复档案</a-divider>
        <a-select v-model:value="merge.targetId" show-search option-filter-prop="label" :options="customers.filter(c=>c.id!==customerId).map(c=>({value:c.id,label:`${c.name} ${c.phone || ''}`}))" class="w-full" placeholder="选择保留的目标客户" />
        <a-input v-model:value="merge.reason" class="my-3" placeholder="合并原因" />
        <a-popconfirm title="转移余额、积分和订单并停用当前档案？" @confirm="mergeProfile"><a-button danger :disabled="busy">合并到目标客户</a-button></a-popconfirm>
      </a-tab-pane>
    </a-tabs>
  </a-card>
</template>
<script setup lang="ts">
const props = defineProps<{ customerId: number }>()
const { request, busy } = useBusiness()
const { isCashier, isStrictAdmin } = useAuth()
const page = ref(1), timeline = ref<any>({}), events = ref<any[]>([]), contacts = ref<any[]>([]), customers = ref<any[]>([])
const typeLabels:Record<string,string>={earn:'订单获赠',redeem:'积分抵现',refund_earn:'退款扣回',refund_redeem:'退回抵扣积分',adjustment:'人工调整',opening:'期初结转',sale:'订单应收',collect:'订单收款',income:'订单付款',refund:'退款',recharge:'预存充值',consume:'预存消费',merge_in:'合并转入',merge_out:'合并转出',admin_adjustment:'管理员调整',opening_adjustment:'期初差异调整'}
const labels: Record<string,string> = {order:'订单',payment:'收退款',account:'账户流水',points:'积分流水',contact:'客户跟进',adjustment:'订单纠错'}
const profile = reactive<any>({tags:[],preferences:'',creditLimit:null})
const contact = reactive({content:'',nextContactAt:''})
const festival = reactive({title:'',calendar:'solar',month:1,day:1,remindDays:3})
const account=reactive({account:'stored_value',amount:0,notes:''})
async function adjustAccount(){await request(`${base.value}/adjust`,'POST',account);await load()}
const point = reactive({amount:0,notes:''}), merge = reactive({targetId:null,reason:''})
const base = computed(()=>`/api/customers/${props.customerId}`)
async function loadTimeline(){timeline.value=await request(`${base.value}/timeline?page=${page.value}`)}
async function load(){const data=await request(`${base.value}/profile`);Object.assign(profile,{...data,tags:data.tags.map((t:any)=>t.name)});events.value=data.events;contacts.value=data.contacts;await loadTimeline()}
async function tabChanged(key:string){if(key==='admin')customers.value=(await request('/api/customers?pageSize=1000')).list}
async function saveProfile(){await request(`${base.value}/profile`,'PUT',profile);await load()}
async function addContact(){await request(`${base.value}/contacts`,'POST',contact);contact.content='';await load()}
async function finishContact(id:number){await request(`${base.value}/contacts/${id}`,'PATCH',{completed:true});await load()}
async function toggleEvent(item:any){await request(`${base.value}/events/${item.id}`,'PATCH',{active:!item.active});await load()}
async function addEvent(){await request(`${base.value}/events`,'POST',festival);await load()}
async function adjustPoints(){await request(`${base.value}/points`,'POST',point);await load()}
async function mergeProfile(){await request(`${base.value}/merge`,'POST',merge);await navigateTo(`/customers/${merge.targetId}`)}
watch(()=>props.customerId,load,{immediate:true})
</script>
