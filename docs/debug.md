## Context

经过对照有赞 / 千牛 / Shopify Admin 的功能审计，整体水平评分 **3 星**：dashboard / 报表 / POS / 排单看板 / 备货 / 对账已达主流水平（★★★★），但三个"列表型"页面是明显短板（★★）：

- **订单记录** [app/pages/orders/index.vue](app/pages/orders/index.vue) — 只有 3 个筛选，平表格，唯一操作是"查看 → 新开打印页"。看不到大盘、看不到商品明细、不能批量、不能导出
- **客户列表** [app/pages/customers/index.vue](app/pages/customers/index.vue) — 缺整体 KPI、缺分群标签、缺批量
- **库存列表** [app/pages/stocks/index.vue](app/pages/stocks/index.vue) — 缺 KPI、缺采购建议、缺预警入口

P0/P1 目标：**把三个列表页统一提到 ★★★½**。P2 #16 消息中心：在 layout 右上角加铃铛，把"临期/欠款/低库存/异常订单"聚合提醒做出来。

本 Plan **不动**业务核心（POS、排单、报表 - 已 OK）。Float→Decimal、自动化工作流、移动端、角色权限矩阵继续留 TODO。

---

## P0 — 立竿见影改动（每个 1-3 小时）

### P0-1 订单记录顶部 KPI 卡（4 张）

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue)、[server/api/orders/index.get.ts](server/api/orders/index.get.ts)

**展示**：跟筛选联动的 4 张卡 — 订单数 / 销售额 / 已收 / 未收。
```
┌── 订单数 N ──┬── 销售额 ¥X ──┬── 已收 ¥Y ──┬── 未收 ¥Z ──┐
```

**后端**：在 [orders/index.get.ts](server/api/orders/index.get.ts:29-40) 的 `Promise.all` 里再加一个聚合：
```ts
prisma.order.aggregate({
  where,
  _count: { _all: true },
  _sum: { totalAmount: true, paidAmount: true, owedAmount: true },
}),
```
返回到 `data.summary = { count, total, paid, owed }`。

**前端**：用 [app/pages/index.vue](app/pages/index.vue) dashboard 的 `.kpi-grid` 同款样式（直接挪 CSS 类名），4 张 `<a-card>`。

---

### P0-2 订单记录行内可展开 → 商品明细

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue:36-84)

**做法**：`<a-table :expandable="{ expandedRowRender }">`。展开后在行下方显示商品摘要 mini-table（商品名 / 规格 / 单价 / 数量 / 小计）。

**后端**：[orders/index.get.ts](server/api/orders/index.get.ts:32-35) 的 `include` 加 `items: { include: { product: { select: { id, name, baseUnit } } } }`。需注意 N+1 风险 — 当前 pageSize 20，加 items 后查询体积仍可控。

**收益**：不打开新页就能扫商品；如果有"复制为新单"需求（P2），数据也已经在前端。

---

### P0-3 快捷日期预设

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue:5-13)

**做法**：复用 [app/pages/payments/index.vue:190](app/pages/payments/index.vue#L190) 已经写好的预设逻辑。在 `<a-range-picker>` 前加一组 `<a-radio-group>`：
```
[今天] [昨天] [本周] [本月] [上月] [自定义]
```
选择即填充 `dateRange.value` 并触发 `onFilterChange()`。

**抽取**：把这段预设逻辑提到 `app/composables/useDatePresets.ts`（新建），三处复用（orders / customers / stocks）。

---

### P0-4 订单记录导出 Excel

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue)

**做法**：工具栏右侧加"导出"按钮 → 调用 [useExport().exportToCsv()](app/composables/useExport.ts:17)。导出**当前筛选下的全量**（不仅当前页）— 需要额外发一次请求把 pageSize 设大（如 5000）拿全量。

**字段**：单号 / 下单日期 / 客户 / 联系电话 / 总额 / 已付 / 未付 / 状态 / 收银员 / 支付方式 / 备注。

**文件名**：`orders_${startDate}_${endDate}.csv`。

---

### P0-5 客户列表 KPI 卡（3 张）

**文件**：[app/pages/customers/index.vue](app/pages/customers/index.vue)、[server/api/customers/index.get.ts](server/api/customers/index.get.ts)

**展示**：总客户数 / 欠款客户数 / 累计欠款总额。

**后端**：`customers/index.get.ts` 加 `aggregate` 输出 summary（沿用 P0-1 的模式）。

**前端**：复用 P0-1 的 `.kpi-grid` CSS。

---

### P0-6 库存列表 KPI 卡（4 张）

**文件**：[app/pages/stocks/index.vue](app/pages/stocks/index.vue)、[server/api/stocks/](server/api/stocks/)

**展示**：在售 SKU 数 / 总库存货值（`Σ currentQty × costPrice`） / 临期批次数 / 缺货品种数（活跃商品中 `Σ currentQty == 0` 的）。

**后端**：新增 [server/api/stocks/summary.get.ts](server/api/stocks/summary.get.ts)，做四个聚合查询。

**前端**：[app/pages/stocks/index.vue](app/pages/stocks/index.vue) 顶部加 `.kpi-grid`，挂载时调用 summary。

---

### P0 整体提交策略

```
feat(orders): 列表页加 KPI 卡、商品展开、快捷日期、导出 Excel
feat(customers): 列表页加 KPI 统计卡
feat(stocks):   列表页加库存货值与缺货 KPI 卡
```

---

## P1 — 体验升级（每个 0.5-1 天）

### P1-7 订单详情侧拉抽屉（OrderDetailDrawer）

**新建组件**：[app/components/orders/OrderDetailDrawer.vue](app/components/orders/OrderDetailDrawer.vue)

**结构**：
```
<a-drawer width="640">
  顶部：订单号 + 状态 tag + 创建时间 + 操作按钮组
  主体 Tabs:
    [基础信息]   客户/收银员/支付方式/价格模式/促销/折扣率/备注
    [商品明细]   表格：商品/规格/单价/数量/小计（来自 P0-2 已加的 items）
    [收款流水]   表格：时间/类型/金额/支付方式/操作员/备注 — 调 /api/payments?orderId=
    [打印/操作]  打印小票 · 打印配送单（预售）· 补款 · 退款 · 作废
</a-drawer>
```

**集成**：[orders/index.vue](app/pages/orders/index.vue:81) `viewOrder` 改成打开抽屉而不是 `window.open`；保留"打印"作为抽屉里的次按钮。

**后端复用**：
- [server/api/orders/\[id\].get.ts](server/api/orders/[id].get.ts) 已存在
- 新增 [server/api/payments/index.get.ts](server/api/payments/index.get.ts) 支持 `?orderId=` 过滤（如果还没有）

**注意**：补款/退款/作废这三个操作需要新接口（见 P2-13 — 但本 Plan 只做 UI 占位，按钮置灰提示"功能开发中"，或者只先做"补款"复用 [recharge.post.ts](server/api/customers/[id]/recharge.post.ts) 的扩展）。

---

### P1-8 订单批量操作

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue)

**做法**：
- `<a-table :row-selection="{ selectedRowKeys, onChange }">`
- 选中 ≥1 行时，表格上方弹出"已选 N 单" + 操作按钮 [批量打印小票] [批量导出] [批量打标]
- 批量打印：循环打开 `/orders/${id}/print`，或更好的方案是合成一个聚合打印页 `/orders/print?ids=1,2,3`（后续做）
- 批量导出：复用 P0-4 的导出逻辑，但只导出选中 id

**关闭按钮**：右侧 "清空选择" 一键解除。

---

### P1-9 订单更多筛选 + "更多筛选 v" 折叠

**文件**：[app/pages/orders/index.vue](app/pages/orders/index.vue)、[server/api/orders/index.get.ts](server/api/orders/index.get.ts)

**新增筛选项**：
- 订单类型（零售 / 预售 / 全部） — 后端 `orderType` 已支持
- 收银员（`cashierId`） — 新增 query 参数
- 支付方式（cash / wechat / alipay / balance / credit） — 经 `Payment.paymentMethod` 聚合或在 `Order` 上挂主支付方式
- 渠道（`sourceChannel` 包含匹配，如 "美团/抖音/店内/电话"）— 用 `contains` 或精确匹配
- 金额区间（`totalAmount` ≥ min, ≤ max）
- 关键词（单号 / 客户名 / 收货人 / 联系电话） — `OR` 查询
- 是否含折扣（`priceMode in ['discount','promotion']`）
- 仅看欠款（`owedAmount > 0`）

**UI**：常用 3 个筛选保留可见，剩下放进 `<a-form>` 折叠区，默认收起。"展开更多筛选 ↓"按钮切换。

**抽取**：折叠表单容器可以做成 `app/components/common/AdvancedFilter.vue` 复用。

---

### P1-10 客户 RFM 自动分群标签

**新文件**：[server/api/customers/index.get.ts](server/api/customers/index.get.ts) 输出每个客户的 `rfmTag`

**逻辑**（轻量版，不用聚类，按阈值打标）：
- `lastOrderAt` ≤ 30 天 + `orderCount` ≥ 3 + `totalSpent` ≥ 5000 → **VIP 活跃**
- `lastOrderAt` ≤ 30 天 + `orderCount` < 3 → **新客**
- 30 < `lastOrderAt` ≤ 90 天 → **沉睡**
- `lastOrderAt` > 90 天 → **流失**
- `totalOwed` > 0 → 叠加 **欠款** 标签

**实现**：用 `Order` 上的 `createdAt`、`totalAmount` 聚合到客户维度。查询代价中等（一次 group by），可按需缓存。

**前端**：[customers/index.vue](app/pages/customers/index.vue) 表格新增"分群"列，显示彩色 tag。筛选器加"按分群筛选"。

**收益**：老板一眼能看出谁该回访、谁该催收、谁是 VIP — 比单纯的 `level` 字段实用 10 倍。

---

### P1-11 库存"采购建议"小工具

**新文件**：[server/api/stocks/purchase-suggestion.get.ts](server/api/stocks/purchase-suggestion.get.ts)

**逻辑**（最小可用版）：
- 对每个 status='active' 的商品
- 计算近 7 天总销量 `weekly = Σ baseQty (OrderItem where order.createdAt ≥ 7d)`
- 安全库存天数 N（来自 Setting，默认 5）
- 建议库存 = `weekly / 7 × N`
- 当前库存 = `Σ stockBatch.currentQty where status='in_stock'`
- 缺口 = 建议库存 - 当前库存
- 返回缺口 > 0 的商品列表，按缺口降序

**前端**：[app/pages/stocks/index.vue](app/pages/stocks/index.vue) 顶部 KPI 卡之下加一个可折叠的"📦 本周采购建议（N 个商品）"按钮 → 点击展开侧拉抽屉显示建议列表。每行有"复制到入库单"按钮（跳 [stocks/inbound.vue](app/pages/stocks/inbound.vue) 并预填）。

**复用**：[shared/](shared/) 可以放共享的"安全库存天数"常量与计算函数；[Setting](prisma/schema.prisma#L161) 表加 `safetyStockDays` key。

---

### P1 整体提交策略

```
feat(orders): 详情侧拉抽屉 + 批量操作 + 更多筛选折叠区
feat(customers): RFM 自动分群标签 + 分群筛选
feat(stocks): 采购建议小工具
```

---

## P2-16 — 消息中心（站内通知）

**目标**：右上角铃铛聚合 4 类提醒，点击展开下拉面板，跳转到对应位置。

### 数据模型（新增表）

**[prisma/schema.prisma](prisma/schema.prisma)** 加：
```prisma
model Notification {
  id         Int      @id @default(autoincrement())
  type       String   // 'low_stock' | 'expiring_batch' | 'debt_overdue' | 'anomaly_order'
  level      String   @default("info") // 'info' | 'warn' | 'urgent'
  title      String
  body       String
  /// 关联对象：商品 / 批次 / 客户 / 订单
  refType    String?  // 'product' | 'batch' | 'customer' | 'order'
  refId      Int?
  /// 接收者：null = 全店通知；指定 userId = 私信
  userId     Int?
  readAt     DateTime?
  /// 去重键：同一类同一对象同一天只生成一条，避免铃铛被刷屏
  dedupeKey  String   @unique
  createdAt  DateTime @default(now())

  @@index([userId, readAt])
  @@index([type, createdAt])
}
```

**`dedupeKey` 设计**：`{type}:{refId}:{YYYY-MM-DD}` — 例如 `low_stock:42:2026-05-19`，同一商品同一天只刷一次。

### 后端

**新建** [server/api/notifications/index.get.ts](server/api/notifications/index.get.ts)：
```ts
// 查询：未读优先，分页 20 条
// 返回 { list, total, unreadCount }
```

**新建** [server/api/notifications/\[id\]/read.post.ts](server/api/notifications/[id]/read.post.ts)：
```ts
// 标记单条已读
```

**新建** [server/api/notifications/mark-all-read.post.ts](server/api/notifications/mark-all-read.post.ts)：
```ts
// 当前用户的全部置已读
```

**生成器** [server/utils/notificationGenerator.ts](server/utils/notificationGenerator.ts)：
```ts
export async function generateNotifications() {
  // 1. 低库存：商品在售 + 总在库 < lowStockThreshold
  // 2. 临期批次：expiryDate 在 3 天内 + currentQty > 0
  // 3. 欠款逾期：customer.totalOwed > 0 + 最后下单 > 30 天
  // 4. 异常订单：(可选第二期) 异常大额、异常折扣等
  // 全部走 upsert(dedupeKey) — 重复触发不会产生新通知
}
```

**触发时机**（任选其一或组合）：
- **简单方案（推荐）**：写一个轻量定时器 — Nitro 启动时 `setInterval(generateNotifications, 30*60*1000)` 每 30 分钟跑一次；新建 [server/plugins/notification-tick.ts](server/plugins/notification-tick.ts)
- 复杂方案（暂不做）：用消息队列 / 跨进程定时器，目前单店单机无必要

**手动触发**：调试用 — [server/api/notifications/regenerate.post.ts](server/api/notifications/regenerate.post.ts)，admin 可手动跑一次。

### 前端

**新建组件** [app/components/common/NotificationBell.vue](app/components/common/NotificationBell.vue)：
```vue
<a-dropdown trigger="click" placement="bottomRight">
  <a-badge :count="unreadCount" :overflow-count="99">
    <BellOutlined class="bell-icon" />
  </a-badge>
  <template #overlay>
    <div class="notif-panel">
      <header>
        <span>消息中心</span>
        <a-button type="link" size="small" @click="markAllRead">全部已读</a-button>
      </header>
      <a-tabs>
        <a-tab-pane key="all">全部</a-tab-pane>
        <a-tab-pane key="unread">未读 ({{ unreadCount }})</a-tab-pane>
      </a-tabs>
      <a-list :data-source="list">
        <!-- 每条：图标(类型色) · 标题 · 副文 · 时间 · 跳转箭头 -->
      </a-list>
      <footer>
        <a-button type="link" block @click="router.push('/notifications')">查看全部</a-button>
      </footer>
    </div>
  </template>
</a-dropdown>
```

**集成**：[app/layouts/default.vue](app/layouts/default.vue) 顶部右侧（用户头像旁）加 `<NotificationBell />`。

**轮询**：组件内 `setInterval(fetch, 60*1000)` 每分钟拉一次未读计数，避免 WebSocket 复杂度。也可以监听 `visibilitychange` 切回标签页时刷新。

**点击跳转**：
- `low_stock` → `/stocks?productId={refId}`
- `expiring_batch` → `/stocks?batchId={refId}`
- `debt_overdue` → `/customers/{refId}`
- `anomaly_order` → `/orders` 并打开详情抽屉

### 配置面板（[settings/index.vue](app/pages/settings/index.vue) 加一个 Tab）

- 低库存阈值（已有 `lowStockThreshold`）
- 临期天数（默认 3 天）— 新 Setting key
- 欠款逾期天数（默认 30 天）— 新 Setting key
- 通知静默时段（如夜间 22:00 - 8:00 不弹）— 新 Setting key（前端控制是否触发桌面通知，不影响铃铛红点）

### 全量通知中心页（可延后）

[app/pages/notifications/index.vue](app/pages/notifications/index.vue) — 完整列表 + 按类型/级别筛选 + 历史清理（保留最近 90 天）。

### P2-16 提交策略

```
feat(notifications): 数据模型 + 后端 API + 定时生成器
feat(notifications): 顶部铃铛组件 + 未读数 + 下拉面板
feat(notifications): 配置面板 + 全量通知中心页
```

---

## 整体工作量估算

| 区块 | 内容 | 估时 |
|---|---|---|
| P0 (1-6) | 三个列表页加 KPI、订单展开/快捷日期/导出 | 1-2 天 |
| P1 (7-9) | 订单详情抽屉 + 批量 + 更多筛选 | 1.5 天 |
| P1 (10-11) | 客户 RFM + 库存采购建议 | 1.5 天 |
| P2-16 | 消息中心（数据模型 + API + 铃铛 + 配置） | 2-3 天 |
| **合计** | | **约 6-8 个工作日** |

可单 PR 串行交付，也可拆 3-4 个 PR 分别合并。

---

## 关键文件清单（按目录分组）

**前端组件新增**：
- [app/components/orders/OrderDetailDrawer.vue](app/components/orders/OrderDetailDrawer.vue) — P1-7
- [app/components/common/AdvancedFilter.vue](app/components/common/AdvancedFilter.vue) — P1-9（可选抽取）
- [app/components/common/NotificationBell.vue](app/components/common/NotificationBell.vue) — P2-16
- [app/composables/useDatePresets.ts](app/composables/useDatePresets.ts) — P0-3
- [app/composables/useNotifications.ts](app/composables/useNotifications.ts) — P2-16

**前端页面修改**：
- [app/pages/orders/index.vue](app/pages/orders/index.vue) — P0-1/2/3/4 + P1-7/8/9
- [app/pages/customers/index.vue](app/pages/customers/index.vue) — P0-5 + P1-10
- [app/pages/stocks/index.vue](app/pages/stocks/index.vue) — P0-6 + P1-11
- [app/pages/settings/index.vue](app/pages/settings/index.vue) — P2-16 配置面板
- [app/layouts/default.vue](app/layouts/default.vue) — 挂铃铛
- [app/pages/notifications/index.vue](app/pages/notifications/index.vue) — P2-16 新页（可延后）

**后端 API 新增/修改**：
- [server/api/orders/index.get.ts](server/api/orders/index.get.ts) — 加 summary + items + 更多筛选
- [server/api/customers/index.get.ts](server/api/customers/index.get.ts) — 加 summary + rfmTag
- [server/api/stocks/summary.get.ts](server/api/stocks/summary.get.ts) — 新
- [server/api/stocks/purchase-suggestion.get.ts](server/api/stocks/purchase-suggestion.get.ts) — 新
- [server/api/notifications/](server/api/notifications/) — 新目录（index.get / mark-all-read / [id]/read / regenerate）
- [server/utils/notificationGenerator.ts](server/utils/notificationGenerator.ts) — 新
- [server/plugins/notification-tick.ts](server/plugins/notification-tick.ts) — 新（定时触发）

**数据库**：
- [prisma/schema.prisma](prisma/schema.prisma) — 加 `Notification` 表 + 3 个 `Setting` key
- [prisma/migrations/2026XXXX_add_notifications/](prisma/migrations/) — 新迁移

---

## 可复用的现有代码

- [app/pages/index.vue](app/pages/index.vue) `.kpi-grid` 与 KPI 卡样式 — 直接挪到三个列表页
- [app/pages/payments/index.vue:190](app/pages/payments/index.vue#L190) 快捷日期预设逻辑 — 抽到 useDatePresets
- [app/composables/useExport.ts](app/composables/useExport.ts) `exportToCsv` — P0-4 / P1-8 复用
- [app/components/customers/RechargeDialog.vue](app/components/customers/RechargeDialog.vue) / [RepayDialog.vue](app/components/customers/RepayDialog.vue) — P1-7 抽屉里"补款"按钮的弹窗可直接嵌入
- [app/composables/useLowStockAlert.ts](app/composables/useLowStockAlert.ts) — 低库存检测逻辑，P2-16 通知生成器可复用
- [server/api/customers/debt-summary.get.ts](server/api/customers/debt-summary.get.ts)（若有） — RFM 与欠款通知都需要的客户聚合

---

## 验证清单（每个 Phase 完成后）

**P0**：
1. 进 `/orders`，顶部应有 4 张 KPI 卡，数字随筛选变化
2. 表格每行左边有 `>` 展开按钮，点开看到商品 mini-table
3. 工具栏出现"今天/本周/本月..."快捷按钮，点击日期联动
4. 工具栏右侧有"导出"按钮，点击下载 CSV（中文不乱码）
5. `/customers` 顶部 3 张 KPI；`/stocks` 顶部 4 张 KPI

**P1**：
6. 点订单"查看" → 应弹出右侧抽屉而非新打开标签页；抽屉 4 个 Tab 均能加载
7. 表格表头多选框，勾选后顶部出现"已选 N 单 [批量打印] [批量导出] [取消]"
8. 点"更多筛选 ↓"展开高级筛选区，能筛收银员/支付方式/渠道/金额区间/关键词
9. `/customers` 表格新增"分群"列，VIP/沉睡/流失/新客 标签正确；筛选器有"按分群"
10. `/stocks` 顶部"采购建议"按钮 → 抽屉显示缺口列表，点"复制到入库单"跳转并预填

**P2-16**：
11. 顶栏出现铃铛 + 红色未读数；初次启动后 30 分钟内应自动生成第一批通知（或手动 regenerate）
12. 点铃铛 → 下拉面板显示 4 类通知，区分级别色
13. 点单条通知 → 跳到对应页面（库存/客户/订单）且对应 id 已聚焦
14. 进设置 → 通知配置 Tab → 改阈值后下一次扫描生效
15. 同一天同商品 / 同客户 重复扫描不产生新通知（dedupeKey 验证）

---

## 风险与注意

- **P0-2 商品 include**：当前 `pageSize=20` + items + product，单次 ≤ 200 行联接，无性能问题。如果未来要把 pageSize 调到 100，需考虑分次查询或 select 字段收窄。
- **P1-10 RFM 计算**：每次列表查询都聚合所有客户订单可能慢（客户上千 + 订单上万时）。第一版直接每次算；性能不行再考虑给客户表加 `lastOrderAt/orderCount/totalSpent` 冗余字段（写订单时同步更新）。
- **P2-16 定时器**：Nitro 单进程，`setInterval` 简单可靠；如果未来 build + pm2 多 worker，需要加分布式锁。但本店单实例不会遇到。
- **P2-16 数据膨胀**：Notification 表 90 天后清理（生成器顺手 delete `createdAt < now - 90d`）。

---

## 推迟项（P2 其他、本 Plan 不含）

- P2-12 自动化工作流（欠款/低库存自动操作）
- P2-13 订单作废 + 退款（schema 改动较大）
- P2-14 角色权限矩阵
- P2-15 同比环比报表
- 移动端店员 / 配送员 App