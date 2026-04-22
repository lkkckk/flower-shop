<template>
  <div class="pos-layout">
    <!-- POS 顶部栏 -->
    <header class="pos-header">
      <div class="pos-header-left">
        <a-button
          v-if="isAdmin"
          type="link"
          class="back-btn"
          @click="navigateTo('/')"
        >
          <ArrowLeftOutlined />
          <span class="back-text">返回后台</span>
        </a-button>
        <a-divider v-if="isAdmin" type="vertical" />
        <span class="shop-name">🌸 花店收银台</span>
      </div>
      <div class="pos-header-right">
        <!-- 当前收银员显示与切换 -->
        <a-button type="text" size="small" class="tool-btn" @click="switchCashierModalVisible = true">
          <UserOutlined />
          <span class="tool-label">
            {{ currentCashier?.name || '未知' }}
            <span class="text-xs opacity-60 ml-1">切换</span>
          </span>
        </a-button>
        <a-divider type="vertical" />
        <a-button
          type="text"
          size="small"
          class="tool-btn"
          @click="navigateTo('/pos/stocktake')"
        >
          <InboxOutlined />
          <span class="tool-label">盘点</span>
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

    <!-- 切换收银员 Modal -->
    <a-modal
      v-model:open="switchCashierModalVisible"
      title="切换收银员"
      @ok="handleSwitchCashier"
      @cancel="switchCashierModalVisible = false"
      :confirm-loading="switchingCashier"
      ok-text="确认切换"
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

    <!-- 多单 Tab 占位 -->
    <div class="pos-tabs">
      <slot name="tabs" />
    </div>

    <!-- 主工作区 -->
    <main class="pos-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftOutlined,
  UserOutlined,
  InboxOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

const { user, isAdmin, logout } = useAuth()
const { currentCashier, setActiveCashier } = useActiveCashier()

const handleLogout = async () => {
  await logout('pos')
}

// 切换收银员
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
      body: { username: switchForm.username, password: switchForm.password, scope: 'pos' },
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.pos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  flex-shrink: 0;
}

.pos-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pos-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.back-btn {
  color: rgba(255, 255, 255, 0.85) !important;
  padding: 0 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.back-btn:hover {
  color: #f472b6 !important;
}

.back-text {
  display: none;
}

@media (min-width: 768px) {
  .back-text {
    display: inline;
  }
}

.shop-name {
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #f472b6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:deep(.ant-divider-vertical) {
  border-color: rgba(255, 255, 255, 0.2);
}

.tool-btn,
.user-btn {
  color: rgba(255, 255, 255, 0.85) !important;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.tool-btn:hover,
.user-btn:hover {
  color: #f472b6 !important;
}

.tool-label,
.user-label {
  display: none;
}

@media (min-width: 768px) {
  .tool-label,
  .user-label {
    display: inline;
  }
}

.pos-tabs {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  min-height: 0;
}

.pos-main {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/* 手机端：单列垂直流 */
@media (max-width: 767px) {
  .pos-header {
    padding: 0 8px;
    height: 44px;
  }

  .pos-main {
    flex-direction: column;
  }
}
</style>
