# Progress Log — 整体 Debug

> 会话流水。每次新会话/继续工作前先读这里恢复上下文。

---

## 2026-05-19 / Session 1 — 调研、规划、修复

### 调研阶段（已完成）
- 用户提出"对项目整体进行 debug"
- 通过 AskUserQuestion 锁定 4 个具体方向：静态检查 / 运行时 / 代码审查 / Schema
- 用户给出具体痛点：
  1. VPS 上 `DELETE /api/customers/1` 报 400
  2. 时间组件 + "No Data" 等英文
  3. 项目跑起来很卡顿（不确定是否因为没 build）
  4. 让我找出隐藏 bug

### 关键发现
共 5 个 bug，详见 [findings.md](findings.md)。

### 用户决策
- 修 Bug 1 / 2 / 4 / 5（Bug 3 是部署问题，用户自行处理）
- Plan 用单份文件组织
- Bug 4 采用「最严」customer 白名单策略（小程序未上线）

### 修复阶段（已完成）

**Phase 1 — i18n** ✅
- 新建 `app/plugins/locale.client.ts` 设置 `dayjs.locale('zh-cn')`
- 重写 `app/app.vue` 顶层包 `<a-config-provider :locale="zhCN">`

**Phase 2 — Prisma 错误工具** ✅
- 新建 `server/utils/prismaError.ts`
- 提供 `handlePrismaError(error)` 和 `respondWithPrismaError(event, error, fallback)`
- 映射 P2002/P2003/P2025/PrismaClientValidationError 为友好中文 + 业务码

**Phase 3 — 响应规范化（全项目级）** ✅
- 改动文件总计 **24 个 server/api 文件**
- 处理 **44 处 `setResponseStatus(event, 4xx/5xx)`** + **16 处 `throw createError({statusCode:4xx})`**
- 全部转为 HTTP 200 + envelope `{ data, error: {message, code} }`
- catch 块全部接入 `respondWithPrismaError`
- 最终 grep 结果：`server/api` 下零处非 2xx 状态码（401/403 由中间件处理）

**Phase 4 — 鉴权加固** ✅
- 给 **15 个员工写接口**顶部加 `requireStaff(event)`：
  - customers ×5（index.post, [id].put/delete, recharge, repay）
  - products ×3（index.post, [id].put, image.post）
  - preorders ×3（index.post, [id].put, advance.post）
  - stocks ×3（inbound, scrap, discount）
  - orders ×1（checkout.post）
  - 注：products/[id].delete 已有自己的鉴权检查，未重复加
- 改写 `server/middleware/auth.ts`：
  - 新增 `CUSTOMER_PREFIX_ALLOW = ['/api/auth/me']` 白名单
  - customer 类型 token 仅允许公开商品 + 自查身份，其余 403

### 验证
- ✅ 静态 grep：`server/api` 下零处 setResponseStatus(4xx/5xx)
- ✅ 静态 grep：`server/api` 下零处 throw createError({statusCode:4xx})
- ⚠️ 类型检查 / dev 启动：本地缺 `node_modules`，已发起 `pnpm install`

### 改动汇总

| 类别 | 新增 | 修改 |
|---|---|---|
| 文件 | 2（`locale.client.ts`、`prismaError.ts`） | 25（24 个 api + 1 个 middleware） |

`app.vue` 完全重写（之前仅 NuxtLayout 包裹，现加 ConfigProvider）。

### 下次会话开始时
1. 读本文件恢复上下文
2. 检查 [task_plan.md](task_plan.md) Phase 5 是否还有未勾选项
3. 如果是新一天：在下方追加新会话区块
4. 推荐用户 commit 改动（建议拆 4 个 phase 各一个 commit，或合一个）

### F6 加修（用户追加要求，已完成）
- **F6.1** 客户/商品/预售搜索的 `contains` 全部加 `mode: 'insensitive'`（共 5 个文件 8 处）
- **F6.2** `server/utils/auth.ts` `getSecret()` 在生产模式检测 `.env.example` 示例值并拒绝启动
- **F6.3** `app/layouts/pos.vue:140` 错误对象路径改为 `e.data?.error?.message || e.message`
- F6.4（开启 `typeCheck: true`）跳过：约 50+ 处历史 implicit any 错误，需要单独"清债"任务

### 已知遗留 / 未在本次修复范围
- Bug 3（VPS 卡顿 → 改用 `pnpm build` + Node 部署）：用户自行处理
- F6.4 typeCheck：单独清债任务（不在本次范围）
- 小程序未来上线时，需要在 `server/middleware/auth.ts` 的 `CUSTOMER_PREFIX_ALLOW` 显式加路径，并在对应接口内部校验 `customerId === user.sub`
