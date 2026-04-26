<template>
  <div class="pos-layout">
    <header class="pos-header">
      <div class="pos-header-left">
        <a-button v-if="isAdmin" type="text" class="back-btn" @click="navigateTo('/')">
          <ArrowLeftOutlined />
          <span class="back-text">返回后台</span>
        </a-button>
        <div class="pos-brand">
          <span class="pos-mark"><ShopOutlined /></span>
          <div>
            <div class="shop-name">花店收银台</div>
            <div class="shop-sub">Avocado POS</div>
          </div>
        </div>
      </div>

      <div class="pos-header-right">
        <a-button type="text" size="small" class="tool-btn" @click="navigateTo('/pos/schedule')">
          <CalendarOutlined />
          <span class="tool-label">排单</span>
        </a-button>
        <a-button type="text" size="small" class="tool-btn" @click="navigateTo('/pos/preparation')">
          <InboxOutlined />
          <span class="tool-label">备货</span>
        </a-button>
        <a-button type="text" size="small" class="tool-btn" @click="navigateTo('/pos/stocktake')">
          <InboxOutlined />
          <span class="tool-label">盘点</span>
        </a-button>
        <a-button type="text" size="small" class="tool-btn" @click="switchCashierModalVisible = true">
          <UserOutlined />
          <span class="tool-label">
            {{ currentCashier?.name || '未知' }}
            <span class="muted">切换</span>
          </span>
        </a-button>
        <a-dropdown>
          <a-button type="text" size="small" class="user-btn">
            <UserOutlined />
            <span class="user-label">{{ user?.name || user?.username || '收银员' }}</span>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item v-if="isAdmin" key="settings" @click="navigateTo('/settings')">
                系统设置
              </a-menu-item>
              <a-menu-divider v-if="isAdmin" />
              <a-menu-item key="logout" @click="handleLogout">
                <LogoutOutlined /> 退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </header>

    <a-modal
      v-model:open="switchCashierModalVisible"
      title="切换收银员"
      :confirm-loading="switchingCashier"
      ok-text="确认切换"
      @ok="handleSwitchCashier"
      @cancel="switchCashierModalVisible = false"
    >
      <div class="py-4">
        <div class="text-gray-500 text-sm mb-4">
          当前收银员：<strong>{{ currentCashier?.name }}</strong>
        </div>
        <a-form layout="vertical">
          <a-form-item label="收银员用户名">
            <a-input v-model:value="switchForm.username" placeholder="请输入收银员账号" />
          </a-form-item>
          <a-form-item label="密码">
            <a-input-password v-model:value="switchForm.password" placeholder="请输入密码" @pressEnter="handleSwitchCashier" />
          </a-form-item>
        </a-form>
        <div v-if="switchError" class="text-red-500 text-sm mt-2">{{ switchError }}</div>
      </div>
    </a-modal>

    <div class="pos-tabs">
      <slot name="tabs" />
    </div>

    <main class="pos-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

const { user, isAdmin, logout } = useAuth()
const { currentCashier, setActiveCashier } = useActiveCashier()

const handleLogout = async () => {
  await logout()
}

const switchCashierModalVisible = ref(false)
const switchingCashier = ref(false)
const switchError = ref('')
const switchForm = reactive({ username: '', password: '' })

const handleSwitchCashier = async () => {
  if (!switchForm.username || !switchForm.password) {
    switchError.value = '请输入用户名和密码'
    return
  }
  switchingCashier.value = true
  switchError.value = ''
  try {
    const res: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: switchForm.username, password: switchForm.password },
    })
    if (res.error) {
      switchError.value = res.error.message || '账号或密码错误'
      return
    }
    const cashierUser = res.data.user
    setActiveCashier({ id: cashierUser.id, name: cashierUser.name, username: cashierUser.username })
    message.success(`已切换为收银员：${cashierUser.name}`)
    switchCashierModalVisible.value = false
    switchForm.username = ''
    switchForm.password = ''
  } catch (e: any) {
    switchError.value = e.data?.message || '验证失败，请重试'
  } finally {
    switchingCashier.value = false
  }
}
</script>

<style scoped>
.pos-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
}

.pos-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, var(--avo-800), var(--avo-900));
  color: #f4f2e5;
}

.pos-header-left,
.pos-header-right,
.pos-brand {
  display: flex;
  align-items: center;
}

.pos-header-left {
  gap: 12px;
}

.pos-header-right {
  gap: 4px;
}

.pos-brand {
  gap: 10px;
}

.pos-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--avo-300);
  color: var(--avo-900);
}

.shop-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
}

.shop-sub {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.back-btn,
.tool-btn,
.user-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.82) !important;
  border-radius: 9px !important;
}

.back-btn:hover,
.tool-btn:hover,
.user-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.muted {
  margin-left: 4px;
  opacity: 0.58;
  font-size: 12px;
}

.pos-tabs {
  flex-shrink: 0;
  min-height: 0;
  background: var(--paper-3);
  border-bottom: 1px solid var(--line);
}

.pos-main {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

@media (max-width: 767px) {
  .pos-header {
    height: auto;
    min-height: 52px;
    flex-wrap: wrap;
    padding: 8px;
  }

  .shop-sub,
  .back-text,
  .tool-label,
  .user-label {
    display: none;
  }
}
</style>
