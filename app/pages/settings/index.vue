<template>
  <div class="space-y-4">
    <!-- 基础设置 -->
    <a-card title="基础设置" :bordered="false" class="page-card">
      <a-form
        :model="settingsForm"
        layout="vertical"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 12 }"
      >
        <a-form-item label="店铺名称">
          <a-input v-model:value="settingsForm.storeName" placeholder="请输入店铺名称" />
        </a-form-item>
        <a-form-item label="低库存阈值">
          <a-input-number
            v-model:value="settingsForm.lowStockThreshold"
            :min="1"
            :precision="0"
            class="w-48"
          />
          <span class="text-xs text-gray-400 ml-3">
            商品库存低于此值将在 POS 和后台首页弹窗提醒
          </span>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="savingSettings" @click="saveSettings">
            保存设置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 促销活动管理 -->
    <a-card :bordered="false" class="page-card">
      <template #title>
        <span>促销活动管理</span>
      </template>
      <template #extra>
        <a-button type="primary" @click="openPromoEdit(null)">
          <template #icon><PlusOutlined /></template>
          新建活动
        </a-button>
      </template>

      <a-table
        :columns="promoColumns"
        :data-source="promotions"
        :loading="loadingPromos"
        :pagination="{ pageSize: 10 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === 'active'" color="green">启用</a-tag>
            <a-tag v-else color="default">停用</a-tag>
          </template>
          <template v-else-if="column.key === 'rule'">
            满 ¥{{ record.threshold }} 减 ¥{{ record.reduction }}
          </template>
          <template v-else-if="column.key === 'period'">
            <span class="text-xs text-gray-500">
              {{ formatDate(record.startAt) || '不限' }} ~ {{ formatDate(record.endAt) || '不限' }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openPromoEdit(record)">编辑</a-button>
              <a-popconfirm
                :title="record.status === 'active' ? '确认停用此活动？' : '确认启用此活动？'"
                @confirm="togglePromo(record)"
              >
                <a-button type="link" size="small">
                  {{ record.status === 'active' ? '停用' : '启用' }}
                </a-button>
              </a-popconfirm>
              <a-popconfirm title="确认删除？" @confirm="deletePromo(record)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 促销活动编辑弹窗 -->
    <a-modal
      v-model:open="promoModalVisible"
      :title="editingPromo?.id ? '编辑活动' : '新建活动'"
      :confirm-loading="savingPromo"
      @ok="savePromo"
    >
      <a-form :model="promoForm" layout="vertical">
        <a-form-item label="活动名称" required>
          <a-input v-model:value="promoForm.name" placeholder="例：满 100 减 10" />
        </a-form-item>
        <a-form-item label="满减门槛（元）" required>
          <a-input-number v-model:value="promoForm.threshold" :min="0.01" :precision="2" class="w-full" />
        </a-form-item>
        <a-form-item label="减免金额（元）" required>
          <a-input-number v-model:value="promoForm.reduction" :min="0.01" :precision="2" class="w-full" />
        </a-form-item>
        <a-form-item label="活动起止时间">
          <a-range-picker v-model:value="promoForm.range" class="w-full" />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model:value="promoForm.status">
            <a-radio value="active">启用</a-radio>
            <a-radio value="inactive">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 用户管理（仅 admin 可见） -->
    <a-card v-if="isStrictAdmin" :bordered="false" class="page-card">
      <template #title>员工账号管理</template>
      <template #extra>
        <a-button type="primary" @click="openUserModal(null)">
          <template #icon><PlusOutlined /></template>
          新增账号
        </a-button>
      </template>
      <a-table
        :columns="userColumns"
        :data-source="users"
        :loading="loadingUsers"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <a-tag :color="record.role === 'admin' ? 'red' : record.role === 'staff' ? 'blue' : 'green'">
              {{ { admin: '管理员', staff: '员工', cashier: '收银员' }[record.role] || record.role }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-badge :status="record.status === 'active' ? 'success' : 'default'" :text="record.status === 'active' ? '在职' : '停用'" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openUserModal(record)" :disabled="record.role === 'admin'">
                编辑
              </a-button>
              <a-popconfirm
                :title="record.status === 'active' ? '确定停用该账号吗？' : '确定恢复该账号吗？'"
                @confirm="toggleUserStatus(record)"
                :disabled="record.role === 'admin'"
              >
                <a-button type="link" size="small" :danger="record.status === 'active'" :disabled="record.role === 'admin'">
                  {{ record.status === 'active' ? '停用' : '恢复' }}
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 用户表单 Modal -->
    <a-modal
      v-model:open="userModalVisible"
      :title="editingUser ? '编辑账号' : '新增账号'"
      @ok="saveUser"
      @cancel="userModalVisible = false"
      :confirm-loading="savingUser"
      ok-text="保存"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item v-if="!editingUser" label="用户名" required>
          <a-input v-model:value="userForm.username" placeholder="登录用户名" />
        </a-form-item>
        <a-form-item label="姓名" required>
          <a-input v-model:value="userForm.name" placeholder="员工姓名" />
        </a-form-item>
        <a-form-item label="角色" required>
          <a-radio-group v-model:value="userForm.role">
            <a-radio value="staff">员工（管理权限）</a-radio>
            <a-radio value="cashier">收银员（POS 权限）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="editingUser ? '新密码（留空不修改）' : '初始密码'" :required="!editingUser">
          <a-input-password v-model:value="userForm.password" placeholder="请输入密码（至少 6 位）" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'

useHead({ title: '系统设置 - 花店管理系统' })

const { isStrictAdmin } = useAuth()

// =============== 基础设置 ===============
const settingsForm = reactive({
  storeName: '',
  lowStockThreshold: 20,
})
const savingSettings = ref(false)

const loadSettings = async () => {
  try {
    const { data }: any = await $fetch('/api/settings')
    if (!data) return
    settingsForm.storeName = data.storeName ?? ''
    settingsForm.lowStockThreshold = Number(data.lowStockThreshold ?? 20) || 20
  } catch (e: any) {
    message.error(e.message || '加载设置失败')
  }
}

const saveSettings = async () => {
  savingSettings.value = true
  try {
    const payload = [
      { key: 'storeName', value: String(settingsForm.storeName ?? '') },
      { key: 'lowStockThreshold', value: String(settingsForm.lowStockThreshold ?? 20) },
    ]
    const { error }: any = await $fetch('/api/settings', {
      method: 'PUT',
      body: payload,
    })
    if (error) {
      message.error(error.message || '保存失败')
      return
    }
    message.success('设置已保存')
  } catch (e: any) {
    message.error(e.message || '保存失败')
  } finally {
    savingSettings.value = false
  }
}

// =============== 促销活动 ===============
interface PromoRow {
  id: number
  name: string
  threshold: number
  reduction: number
  status: 'active' | 'inactive'
  startAt: string | null
  endAt: string | null
}

const promotions = ref<PromoRow[]>([])
const loadingPromos = ref(false)

const promoColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '规则', key: 'rule', width: 180 },
  { title: '有效期', key: 'period', width: 260 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 200 },
]

const loadPromotions = async () => {
  loadingPromos.value = true
  try {
    const { data }: any = await $fetch('/api/promotions')
    promotions.value = data?.list || []
  } catch (e: any) {
    message.error(e.message || '加载活动列表失败')
  } finally {
    loadingPromos.value = false
  }
}

// 编辑 Modal
const promoModalVisible = ref(false)
const savingPromo = ref(false)
const editingPromo = ref<PromoRow | null>(null)
const promoForm = reactive<{
  name: string
  threshold: number | null
  reduction: number | null
  status: 'active' | 'inactive'
  range: [Dayjs, Dayjs] | null
}>({
  name: '',
  threshold: null,
  reduction: null,
  status: 'active',
  range: null,
})

const openPromoEdit = (row: PromoRow | null) => {
  editingPromo.value = row
  if (row) {
    promoForm.name = row.name
    promoForm.threshold = row.threshold
    promoForm.reduction = row.reduction
    promoForm.status = row.status
    promoForm.range =
      row.startAt && row.endAt ? [dayjs(row.startAt), dayjs(row.endAt)] : null
  } else {
    promoForm.name = ''
    promoForm.threshold = null
    promoForm.reduction = null
    promoForm.status = 'active'
    promoForm.range = null
  }
  promoModalVisible.value = true
}

const savePromo = async () => {
  if (!promoForm.name?.trim()) {
    message.error('请填写活动名称')
    return
  }
  if (!promoForm.threshold || promoForm.threshold <= 0) {
    message.error('门槛必须大于 0')
    return
  }
  if (!promoForm.reduction || promoForm.reduction <= 0) {
    message.error('减免金额必须大于 0')
    return
  }
  if (promoForm.reduction >= promoForm.threshold) {
    message.error('减免金额必须小于门槛')
    return
  }

  const payload: any = {
    name: promoForm.name.trim(),
    threshold: promoForm.threshold,
    reduction: promoForm.reduction,
    status: promoForm.status,
    startAt: promoForm.range?.[0]?.toISOString() ?? null,
    endAt: promoForm.range?.[1]?.toISOString() ?? null,
  }

  savingPromo.value = true
  try {
    if (editingPromo.value?.id) {
      const { error }: any = await $fetch(`/api/promotions/${editingPromo.value.id}`, {
        method: 'PUT',
        body: payload,
      })
      if (error) throw new Error(error.message)
      message.success('已更新')
    } else {
      const { error }: any = await $fetch('/api/promotions', {
        method: 'POST',
        body: payload,
      })
      if (error) throw new Error(error.message)
      message.success('已创建')
    }
    promoModalVisible.value = false
    await loadPromotions()
  } catch (e: any) {
    message.error(e.message || '保存失败')
  } finally {
    savingPromo.value = false
  }
}

const togglePromo = async (row: PromoRow) => {
  const nextStatus = row.status === 'active' ? 'inactive' : 'active'
  try {
    const { error }: any = await $fetch(`/api/promotions/${row.id}`, {
      method: 'PUT',
      body: { status: nextStatus },
    })
    if (error) throw new Error(error.message)
    message.success(nextStatus === 'active' ? '已启用' : '已停用')
    await loadPromotions()
  } catch (e: any) {
    message.error(e.message || '操作失败')
  }
}

const deletePromo = async (row: PromoRow) => {
  try {
    const { error }: any = await $fetch(`/api/promotions/${row.id}`, {
      method: 'DELETE',
    })
    if (error) throw new Error(error.message)
    message.success('已删除')
    await loadPromotions()
  } catch (e: any) {
    message.error(e.message || '删除失败')
  }
}

// =============== 用户管理 ===============
const users = ref<any[]>([])
const loadingUsers = ref(false)
const userModalVisible = ref(false)
const savingUser = ref(false)
const editingUser = ref<any | null>(null)
const userForm = reactive({ username: '', name: '', role: 'cashier', password: '' })

const userColumns = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
  { title: '角色', key: 'role', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 140 },
]

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const res: any = await $fetch('/api/users')
    users.value = res.data || []
  } catch {
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

const openUserModal = (user: any | null) => {
  editingUser.value = user
  userForm.username = ''
  userForm.name = user?.name || ''
  userForm.role = user?.role || 'cashier'
  userForm.password = ''
  userModalVisible.value = true
}

const saveUser = async () => {
  if (!userForm.name.trim()) { message.error('请输入姓名'); return }
  if (!editingUser.value && (!userForm.username.trim() || !userForm.password.trim())) {
    message.error('请输入用户名和密码'); return
  }
  savingUser.value = true
  try {
    if (editingUser.value) {
      const res: any = await $fetch(`/api/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: { name: userForm.name, role: userForm.role, password: userForm.password || undefined },
      })
      if (res.error) throw new Error(res.error.message)
      message.success('账号已更新')
    } else {
      const res: any = await $fetch('/api/users', {
        method: 'POST',
        body: { username: userForm.username, name: userForm.name, role: userForm.role, password: userForm.password },
      })
      if (res.error) throw new Error(res.error.message)
      message.success('账号已创建')
    }
    userModalVisible.value = false
    loadUsers()
  } catch (e: any) {
    message.error(e.message || '保存失败')
  } finally {
    savingUser.value = false
  }
}

const toggleUserStatus = async (record: any) => {
  const nextStatus = record.status === 'active' ? 'inactive' : 'active'
  try {
    await $fetch(`/api/users/${record.id}`, { method: 'PUT', body: { status: nextStatus } })
    message.success(nextStatus === 'active' ? '账号已恢复' : '账号已停用')
    loadUsers()
  } catch (e: any) {
    message.error(e.message || '操作失败')
  }
}

// =============== 工具 ===============
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  return dayjs(iso).format('YYYY-MM-DD')
}

onMounted(() => {
  loadSettings()
  loadPromotions()
  if (isStrictAdmin.value) loadUsers()
})
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}
</style>
