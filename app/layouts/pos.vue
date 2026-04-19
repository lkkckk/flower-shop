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
        <a-button
          type="text"
          size="small"
          class="tool-btn"
          @click="navigateTo('/pos/stocktake')"
        >
          <InboxOutlined />
          <span class="tool-label">盘点</span>
        </a-button>
        <a-badge :count="0" :show-zero="false">
          <a-button type="text" shape="circle" size="small">
            <BellOutlined />
          </a-button>
        </a-badge>
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
  BellOutlined,
  UserOutlined,
  InboxOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'

const { user, isAdmin, logout } = useAuth()

const handleLogout = async () => {
  await logout('pos')
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
