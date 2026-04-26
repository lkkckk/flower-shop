<template>
  <div class="admin-shell" :class="{ 'cashier-workspace': isCashierRoute }">
    <aside class="admin-sider" :class="{ collapsed }">
      <SiderContent
        :collapsed="collapsed"
        :selected-key="selectedKey"
        @navigate="navigate"
      />
    </aside>

    <a-drawer
      :open="drawerVisible"
      placement="left"
      :closable="false"
      :width="240"
      :body-style="{ padding: 0 }"
      @close="drawerVisible = false"
    >
      <SiderContent
        :collapsed="false"
        :selected-key="selectedKey"
        @navigate="navigate"
      />
    </a-drawer>

    <section class="admin-main" :class="{ collapsed }">
      <header class="admin-topbar">
        <div class="topbar-left">
          <a-button type="text" class="icon-trigger mobile-only" @click="drawerVisible = true">
            <MenuUnfoldOutlined />
          </a-button>
          <a-button type="text" class="icon-trigger desktop-only" @click="collapsed = !collapsed">
            <MenuFoldOutlined v-if="!collapsed" />
            <MenuUnfoldOutlined v-else />
          </a-button>
          <div class="crumb">
            <AppstoreOutlined />
            <span>花店管理</span>
            <span class="sep">/</span>
            <b>{{ currentPage || '首页' }}</b>
          </div>
        </div>

        <div class="topbar-right">
          <div class="topbar-search">
            <SearchOutlined />
            <input placeholder="搜索订单、客户、商品..." @keydown.enter="handleSearch" />
          </div>
          <a-button type="text" class="topbar-icon">
            <BellOutlined />
            <i />
          </a-button>
          <a-button type="text" class="topbar-icon" @click="router.go(0)">
            <ReloadOutlined />
          </a-button>
          <a-dropdown>
            <button class="user-pill">
              <span class="avatar">{{ userInitial }}</span>
              <span class="user-name">{{ user?.name || user?.username || '管理员' }}</span>
              <DownOutlined />
            </button>
            <template #overlay>
              <a-menu>
                <a-menu-item v-if="!isCashier" key="settings">
                  <NuxtLink to="/settings">系统设置</NuxtLink>
                </a-menu-item>
                <a-menu-divider v-if="!isCashier" />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined /> 退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  AccountBookOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  DownOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from 'vue'

const route = useRoute()
const router = useRouter()
const { user, logout, isCashier } = useAuth()

const collapsed = ref(false)
const drawerVisible = ref(false)

const menuGroups = [
  {
    label: '主要工作台',
    items: [
      { key: '/reports', label: '每日复盘', path: '/reports', icon: BarChartOutlined },
    ],
  },
  {
    label: '销售',
    items: [
      { key: '/orders', label: '订单记录', path: '/orders', icon: FileTextOutlined },
      { key: '/orders/schedule', label: '订单排单', path: '/orders/schedule', icon: CalendarOutlined },
      { key: '/orders/preparation', label: '今日备货', path: '/orders/preparation', icon: InboxOutlined },
      { key: '/preorders', label: '预售管理', path: '/preorders', icon: CalendarOutlined },
    ],
  },
  {
    label: '客户与商品',
    items: [
      { key: '/products', label: '商品管理', path: '/products', icon: ShoppingOutlined },
      { key: '/customers', label: '客户管理', path: '/customers', icon: TeamOutlined },
      { key: '/payments', label: '对账单', path: '/payments', icon: AccountBookOutlined },
    ],
  },
  {
    label: '库存',
    items: [
      { key: '/stocks', label: '库存管理', path: '/stocks', icon: InboxOutlined },
      { key: '/stocks/inbound', label: '入库登记', path: '/stocks/inbound', icon: InboxOutlined },
      { key: '/settings', label: '系统设置', path: '/settings', icon: SettingOutlined },
    ],
  },
]

const primaryActions = [
  { key: '/', label: '首页', path: '/', icon: HomeOutlined },
  { key: '/pos', label: '收银台', path: '/pos', icon: ShopOutlined },
]

const cashierActions = [
  { key: '/pos', label: '收银台', path: '/pos', icon: ShopOutlined },
  { key: '/pos/schedule', label: '订单排单', path: '/pos/schedule', icon: CalendarOutlined },
  { key: '/pos/preparation', label: '今日备货', path: '/pos/preparation', icon: InboxOutlined },
  { key: '/pos/stocktake', label: '库存盘点', path: '/pos/stocktake', icon: InboxOutlined },
  { key: '/customers', label: '客户管理', path: '/customers', icon: TeamOutlined },
  { key: '/products', label: '商品管理', path: '/products', icon: ShoppingOutlined },
]

const visiblePrimaryActions = computed(() => (isCashier.value ? cashierActions : primaryActions))
const visibleMenuGroups = computed(() => (isCashier.value ? [] : menuGroups))
const flatItems = computed(() => [
  ...visiblePrimaryActions.value,
  ...visibleMenuGroups.value.flatMap((group) => group.items),
])

const selectedKey = computed(() => {
  const path = route.path
  const matched = flatItems.value
    .filter((item) => path === item.key || (item.key !== '/' && path.startsWith(item.key)))
    .sort((a, b) => b.key.length - a.key.length)
  return matched[0]?.key || (isCashier.value ? '/pos' : '/')
})

const currentPage = computed(() => flatItems.value.find((item) => item.key === selectedKey.value)?.label || '')

const isCashierRoute = computed(() => route.path === '/pos')

const userInitial = computed(() => (user.value?.name || user.value?.username || '管').slice(0, 1))

const navigate = async (path: string) => {
  await router.push(path)
  drawerVisible.value = false
}

const handleLogout = async () => {
  await logout()
}

const handleSearch = (event: KeyboardEvent) => {
  const keyword = (event.target as HTMLInputElement).value.trim()
  if (keyword) router.push({ path: '/orders', query: { q: keyword } })
}

const checkMobile = () => {
  if (window.innerWidth < 768) collapsed.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => window.removeEventListener('resize', checkMobile))

const SiderContent = defineComponent({
  name: 'SiderContent',
  props: {
    collapsed: Boolean,
    selectedKey: { type: String, default: '/' },
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: ['sider-content', props.collapsed ? 'is-collapsed' : ''] }, [
        h('div', { class: 'brand' }, [
          h('div', { class: 'brand-mark' }, h(AppstoreOutlined)),
          !props.collapsed
            ? h('div', { class: 'brand-text' }, [
                h('div', { class: 'brand-name' }, '花店管理'),
                h('div', { class: 'brand-sub' }, 'Avocado · v2.4'),
              ])
            : null,
        ]),
        h(
          'div',
          { class: 'primary-nav' },
          visiblePrimaryActions.value.map((item) =>
            h(
              'button',
              {
                class: ['primary-nav-item', props.selectedKey === item.key ? 'active' : ''],
                title: props.collapsed ? item.label : undefined,
                onClick: () => emit('navigate', item.path),
              },
              [
                h('span', { class: 'primary-nav-icon' }, h(item.icon)),
                !props.collapsed ? h('span', { class: 'primary-nav-text' }, item.label) : null,
              ],
            ),
          ),
        ),
        ...visibleMenuGroups.value.map((group) =>
          h('div', { class: 'nav-group' }, [
            !props.collapsed ? h('div', { class: 'nav-label' }, group.label) : null,
            ...group.items.map((item) =>
              h(
                'button',
                {
                  class: ['nav-item', props.selectedKey === item.key ? 'active' : ''],
                  title: props.collapsed ? item.label : undefined,
                  onClick: () => emit('navigate', item.path),
                },
                [
                  h('span', { class: 'nav-icon' }, h(item.icon)),
                  !props.collapsed ? h('span', { class: 'nav-text' }, item.label) : null,
                ],
              ),
            ),
          ]),
        ),
      ])
  },
})
</script>

<style>
.admin-shell {
  min-height: 100vh;
  background: var(--paper);
}

.admin-sider {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  width: 240px;
  background: linear-gradient(180deg, var(--avo-800), var(--avo-900));
  color: #f4f2e5;
  transition: width 0.2s ease;
}

.admin-sider.collapsed {
  width: 82px;
}

.sider-content {
  height: 100%;
  padding: 22px 14px;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--avo-300);
  color: var(--avo-900);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
}

.brand-sub {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.primary-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.primary-nav-item {
  min-height: 82px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 8px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font: inherit;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.primary-nav-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateY(-1px);
}

.primary-nav-item.active {
  background: var(--avo-300);
  color: var(--avo-900);
  box-shadow: 0 10px 24px rgba(168, 185, 127, 0.22);
}

.primary-nav-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 28px;
  line-height: 1;
}

.primary-nav-text {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
}

.nav-group {
  margin-top: 6px;
}

.nav-label {
  padding: 14px 12px 6px;
  color: rgba(255, 255, 255, 0.36);
  font-size: 11px;
  letter-spacing: 1px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.nav-item.active {
  background: var(--avo-300);
  color: var(--avo-900);
  font-weight: 700;
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.is-collapsed .brand {
  justify-content: center;
  padding-inline: 0;
}

.is-collapsed .primary-nav {
  grid-template-columns: 1fr;
  gap: 8px;
}

.is-collapsed .primary-nav-item {
  min-height: 52px;
  padding: 9px 0;
}

.is-collapsed .primary-nav-icon {
  width: 26px;
  height: 26px;
  font-size: 22px;
}

.is-collapsed .nav-item {
  justify-content: center;
  padding-inline: 0;
}

.admin-main {
  min-height: 100vh;
  margin-left: 240px;
  transition: margin-left 0.2s ease;
}

.admin-main.collapsed {
  margin-left: 82px;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 12;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 254, 247, 0.88);
  backdrop-filter: blur(10px);
}

.topbar-left,
.topbar-right,
.crumb,
.topbar-search,
.user-pill {
  display: flex;
  align-items: center;
}

.topbar-left {
  gap: 12px;
  min-width: 0;
}

.topbar-right {
  gap: 10px;
}

.icon-trigger,
.topbar-icon {
  color: var(--ink-500) !important;
}

.crumb {
  gap: 8px;
  color: var(--ink-500);
  font-size: 13px;
}

.crumb b {
  color: var(--ink-900);
}

.sep {
  color: var(--ink-400);
}

.topbar-search {
  width: min(300px, 26vw);
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--avo-50);
  color: var(--ink-500);
}

.topbar-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink-900);
}

.topbar-icon {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px !important;
}

.topbar-icon i {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--paper-3);
  border-radius: 50%;
  background: var(--danger);
}

.user-pill {
  gap: 9px;
  padding: 5px 12px 5px 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-3);
  color: var(--ink-700);
  cursor: pointer;
}

.avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--avo-300);
  color: var(--avo-900);
  font-weight: 700;
}

.admin-content {
  padding: 28px;
}

.cashier-workspace .admin-content {
  height: calc(100vh - 60px);
  padding: 0;
  overflow: hidden;
}

.mobile-only {
  display: none;
}

@media (max-width: 767px) {
  .admin-sider {
    display: none;
  }

  .admin-main,
  .admin-main.collapsed {
    margin-left: 0;
  }

  .admin-topbar {
    height: auto;
    min-height: 58px;
    padding: 10px 14px;
    flex-wrap: wrap;
  }

  .desktop-only,
  .topbar-search {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }

  .admin-content {
    padding: 16px;
  }

  .cashier-workspace .admin-content {
    height: calc(100vh - 58px);
    padding: 0;
  }

  .user-name {
    display: none;
  }
}
</style>
