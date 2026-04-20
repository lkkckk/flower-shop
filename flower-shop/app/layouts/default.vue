<template>
  <a-layout class="min-h-screen">
    <!-- 移动端抽屉侧边栏 -->
    <a-drawer
      v-if="isMobile"
      :open="drawerVisible"
      placement="left"
      :closable="false"
      :width="240"
      :body-style="{ padding: 0 }"
      @close="drawerVisible = false"
    >
      <SiderContent
        :collapsed="false"
        :selected-keys="selectedKeys"
        @menu-click="handleMenuClick"
      />
    </a-drawer>

    <!-- 桌面端侧边栏 -->
    <a-layout-sider
      v-else
      v-model:collapsed="collapsed"
      :width="240"
      :collapsed-width="80"
      collapsible
      :trigger="null"
      class="sider"
    >
      <SiderContent
        :collapsed="collapsed"
        :selected-keys="selectedKeys"
        @menu-click="handleMenuClick"
      />
    </a-layout-sider>

    <a-layout>
      <!-- 顶部栏 -->
      <a-layout-header class="header">
        <div class="header-left">
          <!-- 移动端汉堡按钮 -->
          <a-button
            v-if="isMobile"
            type="text"
            class="trigger-btn"
            @click="drawerVisible = true"
          >
            <MenuUnfoldOutlined />
          </a-button>
          <!-- 桌面端折叠按钮 -->
          <a-button
            v-else
            type="text"
            class="trigger-btn"
            @click="collapsed = !collapsed"
          >
            <MenuFoldOutlined v-if="!collapsed" />
            <MenuUnfoldOutlined v-else />
          </a-button>
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item>
              <NuxtLink to="/">首页</NuxtLink>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="currentPage">{{ currentPage }}</a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <div class="header-right">
          <a-badge :count="0" :show-zero="false">
            <a-button type="text" shape="circle">
              <BellOutlined />
            </a-button>
          </a-badge>
          <a-dropdown>
            <a-button type="text" class="user-btn">
              <UserOutlined />
              <span class="user-name">{{ user?.name || user?.username || '店长' }}</span>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="settings">
                  <NuxtLink to="/settings">系统设置</NuxtLink>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined /> 退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- 主内容区 -->
      <a-layout-content class="content">
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  ShoppingOutlined,
  TeamOutlined,
  InboxOutlined,
  ShopOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

const { user, logout } = useAuth()

const handleLogout = async () => {
  logout()
  await router.push('/login')
}

const collapsed = ref(false)
const drawerVisible = ref(false)

// 响应式检测
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 菜单配置
interface MenuItem {
  key: string
  icon: string
  label: string
  path: string
}

const menuItems: MenuItem[] = [
  { key: '/', icon: 'HomeOutlined', label: '首页', path: '/' },
  { key: '/products', icon: 'ShoppingOutlined', label: '商品管理', path: '/products' },
  { key: '/customers', icon: 'TeamOutlined', label: '客户管理', path: '/customers' },
  { key: '/stocks', icon: 'InboxOutlined', label: '库存管理', path: '/stocks' },
  { key: '/pos', icon: 'ShopOutlined', label: '开单收银', path: '/pos' },
  { key: '/orders', icon: 'FileTextOutlined', label: '订单记录', path: '/orders' },
  { key: '/payments', icon: 'AccountBookOutlined', label: '对账单', path: '/payments' },
  { key: '/reports', icon: 'BarChartOutlined', label: '报表', path: '/reports' },
  { key: '/settings', icon: 'SettingOutlined', label: '系统设置', path: '/settings' },
]

// 当前选中菜单
const selectedKeys = computed(() => {
  const path = route.path
  // 匹配前缀最长的菜单项
  const matched = menuItems
    .filter(item => path === item.key || (item.key !== '/' && path.startsWith(item.key)))
    .sort((a, b) => b.key.length - a.key.length)
  return matched.length > 0 ? [matched[0].key] : ['/']
})

// 当前页面名称
const pageMap: Record<string, string> = {
  '/products': '商品管理',
  '/customers': '客户管理',
  '/stocks': '库存管理',
  '/pos': '开单收银',
  '/orders': '订单记录',
  '/payments': '对账单',
  '/reports': '报表',
  '/settings': '系统设置',
}

const currentPage = computed(() => {
  const path = route.path
  return pageMap[path] || ''
})

const handleMenuClick = (path: string) => {
  router.push(path)
  if (isMobile.value) {
    drawerVisible.value = false
  }
}
</script>

<script lang="ts">
// SiderContent 子组件（避免重复代码）
import { defineComponent, h } from 'vue'

const iconComponents: Record<string, any> = {}

const SiderContent = defineComponent({
  name: 'SiderContent',
  props: {
    collapsed: Boolean,
    selectedKeys: { type: Array as () => string[], default: () => [] },
  },
  emits: ['menuClick'],
  setup(props, { emit }) {
    const menuItems = [
      { key: '/', label: '首页', path: '/' },
      { key: '/products', label: '商品管理', path: '/products' },
      { key: '/customers', label: '客户管理', path: '/customers' },
      { key: '/stocks', label: '库存管理', path: '/stocks' },
      { key: '/pos', label: '开单收银', path: '/pos' },
      { key: '/orders', label: '订单记录', path: '/orders' },
      { key: '/payments', label: '对账单', path: '/payments' },
      { key: '/reports', label: '报表', path: '/reports' },
      { key: '/settings', label: '系统设置', path: '/settings' },
    ]

    return () =>
      h('div', { class: 'sider-inner' }, [
        h('div', { class: 'logo' }, [
          h('span', { class: 'logo-icon' }, '🌸'),
          !props.collapsed ? h('span', { class: 'logo-text' }, '花店管理') : null,
        ]),
        h(
          resolveComponent('a-menu') as any,
          {
            mode: 'inline',
            selectedKeys: props.selectedKeys,
            theme: 'light',
          },
          () =>
            menuItems.map(item =>
              h(
                resolveComponent('a-menu-item') as any,
                {
                  key: item.key,
                  onClick: () => emit('menuClick', item.path),
                },
                () => h('span', item.label)
              )
            )
        ),
      ])
  },
})

export default defineComponent({
  components: { SiderContent },
})
</script>

<style scoped>
.sider {
  background: #ffffff;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
  border-right: 1px solid rgba(0,0,0,0.04);
  overflow: auto;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
}

.sider-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  padding: 0 16px;
  gap: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trigger-btn {
  font-size: 18px;
  cursor: pointer;
}

.breadcrumb {
  display: none;
}

@media (min-width: 768px) {
  .breadcrumb {
    display: block;
  }
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-name {
  display: none;
}

@media (min-width: 768px) {
  .user-name {
    display: inline;
  }
}

.content {
  margin: 24px;
  min-height: calc(100vh - 64px - 48px);
}

/* 桌面端内容区偏移 */
@media (min-width: 768px) {
  :deep(.ant-layout) {
    margin-left: 240px;
    transition: margin-left 0.2s;
  }

  :deep(.ant-layout-sider-collapsed) ~ .ant-layout {
    margin-left: 80px;
  }
}
</style>
