<template>
  <div>
    <a-card class="page-card">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索姓名或手机号"
            allow-clear
            class="w-64"
            @search="onSearch"
          />
          <a-select
            v-model:value="filterLevel"
            placeholder="筛选等级"
            allow-clear
            class="w-32"
            :options="levelOptions"
            @change="onFilterChange"
          />
        </div>
        <div class="toolbar-right">
          <a-button @click="exportDebtSummary">
            <template #icon><DownloadOutlined /></template>
            导出欠款表
          </a-button>
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增客户
          </a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 900 }"
        class="mt-4"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a class="font-medium text-pink-600" @click="goDetail(record.id)">{{ record.name }}</a>
          </template>

          <template v-else-if="column.key === 'phone'">
            <span class="font-mono text-sm">{{ record.phone || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'level'">
            <a-tag :color="getLevelColor(record.level)">{{ getLevelName(record.level) }}</a-tag>
          </template>

          <template v-else-if="column.key === 'balance'">
            <span v-if="record.balance > 0" class="text-green-600 font-medium">预存 ¥{{ record.balance.toFixed(2) }}</span>
            <span v-else-if="record.balance < 0" class="text-red-600 font-bold">欠款 ¥{{ Math.abs(record.balance).toFixed(2) }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template v-else-if="column.key === 'totalOwed'">
            <span class="text-xs text-gray-500">¥{{ (record.totalOwed || 0).toFixed(2) }}</span>
          </template>

          <template v-else-if="column.key === 'points'">
            <span class="text-yellow-600 font-medium">{{ record.points || 0 }}</span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <span class="text-gray-600 text-sm">{{ formatDate(record.createdAt) }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" @click="openRecharge(record)">充值</a-button>
              <a-button type="link" size="small" @click="openRepay(record)">还款</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-popconfirm
                title="确认删除该客户？"
                ok-text="删除"
                cancel-text="取消"
                ok-type="danger"
                @confirm="onDelete(record)"
              >
                <a-button type="link" danger size="small">删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="mt-4 flex justify-end">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :show-total="(t: number) => `共 ${t} 条`"
          @change="loadList"
          @show-size-change="loadList"
        />
      </div>
    </a-card>

    <CustomerForm
      v-model:visible="formVisible"
      :customer="editingCustomer"
      @success="onFormSuccess"
    />

    <RepayDialog
      v-model:visible="repayVisible"
      :customer="repayCustomerData"
      @success="onRepaySuccess"
    />

    <RechargeDialog
      v-model:visible="rechargeVisible"
      :customer="rechargeCustomerData"
      @success="onRechargeSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useCustomers } from '~/composables/useCustomers'
import { useExport } from '~/composables/useExport'
import CustomerForm from '~/components/customers/CustomerForm.vue'
import RepayDialog from '~/components/customers/RepayDialog.vue'
import RechargeDialog from '~/components/customers/RechargeDialog.vue'

useHead({ title: '客户管理 - 花店管理系统' })

const router = useRouter()
const { fetchCustomers, deleteCustomer, loading } = useCustomers()

const keyword = ref('')
const filterLevel = ref<string | undefined>(undefined)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref<any[]>([])

const formVisible = ref(false)
const editingCustomer = ref<any | null>(null)

const repayVisible = ref(false)
const repayCustomerData = ref<any | null>(null)

const rechargeVisible = ref(false)
const rechargeCustomerData = ref<any | null>(null)

const levelOptions = [
  { value: 'normal', label: '普通' },
  { value: 'member', label: '会员' },
  { value: 'vip', label: 'VIP' },
  { value: 'wholesale', label: '批发' },
]

const columns = [
  { title: '姓名', key: 'name', width: 140, fixed: 'left' as const },
  { title: '手机号', key: 'phone', width: 140 },
  { title: '等级', key: 'level', width: 90 },
  { title: '账户余额', key: 'balance', width: 160 },
  { title: '累计欠款', key: 'totalOwed', width: 110 },
  { title: '积分', key: 'points', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 140 },
  { title: '操作', key: 'action', width: 250, fixed: 'right' as const },
]

const loadList = async () => {
  try {
    const data = await fetchCustomers({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      level: filterLevel.value,
    })
    list.value = data.list
    total.value = data.total
  } catch {
    list.value = []
    total.value = 0
  }
}

const onSearch = () => {
  page.value = 1
  loadList()
}

const onFilterChange = () => {
  page.value = 1
  loadList()
}

const openCreate = () => {
  editingCustomer.value = null
  formVisible.value = true
}

const openEdit = (record: any) => {
  editingCustomer.value = { ...record }
  formVisible.value = true
}

const openRepay = (record: any) => {
  repayCustomerData.value = { ...record }
  repayVisible.value = true
}

const openRecharge = (record: any) => {
  rechargeCustomerData.value = { ...record }
  rechargeVisible.value = true
}

const onFormSuccess = () => {
  loadList()
}

const onRepaySuccess = () => {
  loadList()
}

const onRechargeSuccess = () => {
  loadList()
}

const onDelete = async (record: any) => {
  try {
    await deleteCustomer(record.id)
    message.success('客户已删除')
    loadList()
  } catch (e: any) {
    if (e.code === 'HAS_ORDERS') {
      Modal.warning({
        title: '无法删除',
        content: e.message + '。如需停用请联系管理员。',
      })
    } else {
      message.error(e.message || '删除失败')
    }
  }
}

const exportDebtSummary = async () => {
  try {
    const res: any = await $fetch('/api/customers/debt-summary')
    if (res.error) {
      message.error(res.error.message || '获取欠款数据失败')
      return
    }
    const customers = res.data?.list || []
    if (customers.length === 0) {
      message.info('暂无欠款客户')
      return
    }
    const { exportToCsv } = useExport()
    const headers = ['客户姓名', '手机号', '等级', '当前欠款 (¥)', '累计欠款 (¥)']
    const rows = customers.map((c: any) => [
      c.name,
      c.phone || '',
      getLevelName(c.level),
      Math.abs(c.balance).toFixed(2),
      (c.totalOwed || 0).toFixed(2),
    ])
    const filename = `客户欠款汇总表_${dayjs().format('YYYYMMDD')}`
    exportToCsv(filename, headers, rows)
    message.success('欠款汇总表已导出')
  } catch (e: any) {
    message.error(e.message || '导出失败')
  }
}

const goDetail = (id: number) => {
  router.push(`/customers/${id}`)
}

const formatDate = (d: string | Date) => dayjs(d).format('YYYY-MM-DD HH:mm')

const getLevelName = (level: string) => {
  const map: Record<string, string> = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || level
}

const getLevelColor = (level: string) => {
  const map: Record<string, string> = { normal: 'default', member: 'blue', vip: 'gold', wholesale: 'purple' }
  return map[level] || 'default'
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
