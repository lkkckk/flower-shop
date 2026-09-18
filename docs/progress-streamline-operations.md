# 精简经营功能与清理冗余代码进展文档

**更新时间**：2026-09-18 23:50
**状态**：已完成本地实施与全量验收测试，构建验证中
**执行环境**：`F:\flower-shop`（本机环境）

---

## 一、本次实施范围与改动文件清单

### 1. 解除交班强依赖
- `server/utils/accounts.ts`:
  - 移除了 `paymentRecord` 中对 `cashShift` 开启状态的强行校验及“现金收付款前请先开班”的拦截。
  - 新增付款记录统一写入 `cashShiftId: null`，完整保留真实操作人（`operatorUserId`、`operator`）与账户流水。
  - 现金结账、客户充值、订单补款、客户还款、订单退款全面解除开班限制。

### 2. 物理删除废弃前端页面与专用组件（访问直接 404）
- `app/pages/operations.vue`（门店经营工作台页面）
- `app/pages/shifts.vue`（收银交班页面）
- `app/pages/orders/schedule.vue`（后台订单排单页面）
- `app/pages/orders/preparation.vue`（后台今日备货页面）
- `app/pages/pos/schedule.vue`（POS 订单排单页面）
- `app/pages/pos/preparation.vue`（POS 今日备货页面）
- `app/components/OperationsConsole.vue`（工作台及交班专属组件）
- `components/orders/ScheduleBoard.vue`（排单专属看板组件）
- `components/orders/PreparationBoard.vue`（备货专属看板组件）

### 3. 清理前端菜单、工具栏与提示文案
- `app/layouts/default.vue`:
  - 管理员菜单移除“经营工作台”、“收银交班”、“订单排单”、“今日备货”。
  - 收银员侧边栏移除“收银交班”、“订单排单”、“今日备货”。
- `app/layouts/pos.vue`:
  - POS 顶部工具栏移除“排单”和“备货”快捷按钮。
- `app/components/pos/CheckoutDialog.vue`:
  - 移除“现金收款前先开班 · 查看交班”提示链接。
- `app/components/orders/FinancePanel.vue` & `app/components/preorders/PreorderForm.vue`:
  - 支付方式中的“现金（需开班）”简化修改为“现金”。
- `app/middleware/auth.global.ts`:
  - 收银员允许访问前缀移除 `'/shifts'`。

### 4. 物理删除废弃后端专用路由（访问直接 404）
- `server/api/shifts/`（交班接口全目录）
- `server/api/preorders/schedule.get.ts`（排单查询接口）
- `server/api/preorders/stats/hot.get.ts` 及 `stats/` 目录（备货查询接口）
- `server/api/preorders/[id]/made.patch.ts`（制作写接口）
- `server/api/preorders/[id]/urgent.patch.ts`（加急写接口）
- `server/api/purchases/` 目录（采购专用路由）
- `server/api/suppliers/` 目录（供应商专用路由）
- `server/api/imports/` 目录（导入专用路由）
- `server/api/exports/` 目录（导出专用路由）
- `server/api/reconciliation/` 目录（对账专用路由）
- `server/api/audit.get.ts`（审计专用路由）
- `server/api/loyalty-rules.put.ts`（积分规则修改写接口）

### 5. 保留底层核心服务与模型兼容
- `server/api/loyalty-rules.get.ts` 完整保留（收银台折算积分抵扣依赖）。
- `server/api/stocks/purchase-suggestion.get.ts` 完整保留（库存采购建议抽屉依赖）。
- `server/api/reports/dashboard.get.ts` 与 `server/api/reports/cashier.get.ts` 完整保留。
- 数据库未执行任何删表、删列或迁移回滚，保持完全向后兼容。

### 6. 权限中间件与安全加固
- `shared/permissions.ts`:
  - 移除废弃路由映射与 `shift.write` 权限。
  - 精确化 `preorders` 的 GET 路由匹配，未注册或已废弃路由在中间件鉴权阶段返回 404。
- `server/middleware/auth.ts`:
  - 区分 404 与 403：未匹配到系统定义 action 的访问直接抛出 `404 接口不存在`，权限不足时抛出 `403`。
- `server/api/preorder-registrations/index.post.ts` & `[id].put.ts`:
  - 加固相同幂等键并发串行化：捕获 `P2002` 唯一约束冲突，自动读取并返回首次成功的结果。
- `server/api/preorders/[id].get.ts`:
  - 规范非数字 ID 与不存在订单返回 404，透传 HTTP 状态码。

---

## 二、验收与测试事实（最小验证集）

### 1. 自动化综合验收测试 (`tests/cleanup-and-noshift-acceptance.mjs`)
- **执行命令**：`node tests/cleanup-and-noshift-acceptance.mjs`
- **验证结果**：
  - **23 项已删除路由 404 验证**：全部通过 (PASS)。
  - **4 项保留服务 200 验证**：全部通过 (PASS)。
  - **无开班状态下 5 大核心业务链路**：
    - 现金充值 ¥100 -> 通过。
    - 现金 POS 结账 2 枝 -> 通过，生成的付款记录 `cashShiftId === null` 且 `operatorUserId` 准确。
    - 挂账下单与现金补款 -> 通过。
    - 客户现金还款 -> 通过。
    - 订单退款审批 -> 通过。
  - **相同幂等键并发稳定性**：并发 2 个相同 key 请求均成功返回 200，登记 ID 完全一致，数据库仅创建 1 条记录 -> 通过。
  - **历史预售只读**：`PUT /api/preorders/1` 与 `POST /api/preorders/1/advance` 均被 403 只读拦截 -> 通过。
  - **隔离测试数据自清理**：测试创建的数据物理清理完成 -> 通过。

### 2. 新预售全流程与并发测试 (`tests/preorder-registrations.test.ts`)
- **执行命令**：`npx tsx tests/preorder-registrations.test.ts`
- **验证结果**：100% PASS (1/1 passed)。

### 3. 照片上传与持久化测试 (`tests/preorder-images.test.ts`)
- **执行命令**：`npx tsx tests/preorder-images.test.ts`
- **验证结果**：100% PASS (2/2 passed)。

### 4. 端到端 HTTP 接口验收 (`tests/preorder-http-acceptance.mjs`)
- **执行命令**：`node tests/preorder-http-acceptance.mjs`
- **验证结果**：11 项端到端 HTTP API 与页面可达性 100% PASS。
