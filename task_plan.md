# Task Plan — 修复 Bug 1 / 2 / 4 / 5

> 阶段、决策与进度。每个阶段独立可验收。每条 TODO 完成后在 `[ ]` 内打 `x`。
> 配套文件：[findings.md](findings.md) 记录证据，[progress.md](progress.md) 记录会话日志。

更新时间：2026-05-19
状态：✅ **全部完成**（修复落地，等待用户最终验证 + commit）

---

## 整体策略

- **修复顺序**：Bug 2（i18n，最小风险） → Bug 5（Prisma 工具） → Bug 1（响应规范化，复用 Bug 5 工具） → Bug 4（鉴权）
- **关键决策**（用户已确认）：
  - ✅ Bug 4 采用「最严」策略：customer token 仅允许访问 `/api/public/*` 和 `/api/auth/me`
  - ✅ 不需要考虑小程序兼容（小程序尚未上线）
- **不在本次范围**：F6 列出的小问题、HTTPS/部署运维、性能优化（用户已知 dev→build 即可）

---

## Phase 0：基线准备 ✅ 已完成

- [x] 完成 systematic-debugging 四阶段调研
- [x] 确认 5 个 bug 的根因（见 findings.md）
- [x] 创建规划文件骨架

---

## Phase 1：修复 Bug 2 — i18n 中文化 ✅

- [x] **1.1** 新建 `app/plugins/locale.client.ts`：导入 `dayjs/locale/zh-cn` 并调用 `dayjs.locale('zh-cn')`
- [x] **1.2** 改写 `app/app.vue`：包一层 `<a-config-provider :locale="zhCN">`
- [ ] **1.3** 用户在 dev 环境验证（DatePicker、Empty、Pagination、Modal 中文化）

---

## Phase 2：修复 Bug 5 — Prisma 异常映射工具 ✅

- [x] **2.1** 新建 `server/utils/prismaError.ts`，导出 `handlePrismaError` 和 `respondWithPrismaError`，覆盖 P2002/P2003/P2025/ValidationError + Error/未知

---

## Phase 3：修复 Bug 1 — HTTP 状态码与响应信封解耦 ✅

最终结果：`server/api` 下 **零处** setResponseStatus(4xx/5xx)、**零处** throw createError({statusCode:4xx})。

- [x] **3.1** customers 模块（5 文件 / ~20 处）— **包含用户报告的 DELETE 400 bug**
- [x] **3.2** products 模块（3 文件 / 4 处，含 `[id].get` 的 createError 改写）
- [x] **3.3** stocks 模块（4 文件 / 10 处）
- [x] **3.4** categories / promotions / users / orders / preorders / payments（剩余 12 文件 / ~16 处）
- [x] **3.5** 全局 grep 回归确认：零处剩余

---

## Phase 4：修复 Bug 4 — 员工接口加鉴权 ✅

- [x] **4.1** 给 15 个员工写接口加 `requireStaff(event)`（products/[id].delete 已有等效逻辑，未重复）
- [x] **4.2** `server/middleware/auth.ts` 改写：新增 `CUSTOMER_PREFIX_ALLOW = ['/api/auth/me']` 白名单，customer token 仅允许公开 + 自查
- [ ] **4.3** 用户在 dev 验证：staff/cashier 正常工作

---

## Phase 5：交付与文档

- [x] **5.1** progress.md 写「本次修复总结」
- [ ] **5.2** 用户决定 commit 策略：
  - (a) 一次性 commit 全部改动
  - (b) 按 phase 拆 4 个 commit
  - (c) 拉新分支推 PR
- [ ] **5.3** 用户决定 F6 小问题是否加入下一轮 backlog

---

## 决策记录

| 时间 | 决策 | 决策者 | 理由 |
|---|---|---|---|
| 2026-05-19 | 修复顺序：2 → 5 → 1 → 4 | Claude（建议） | 工具先建（Bug 5）再用（Bug 1），鉴权放最后避免影响调试 |
| 2026-05-19 | Bug 4 采用最严策略 | 用户 | 小程序未上线，没有 customer token 兼容性顾虑 |
| 2026-05-19 | 单份 Plan 不拆分 | 用户 | 单人开发 + 一起回归更高效 |
| 2026-05-19 | Phase 3 范围扩大：同时处理 `throw createError` | Claude（建议） | 这些和 setResponseStatus 同样会触发 FetchError，必须一起改才能彻底修复 Bug 1 |
| 2026-05-19 | Bug 4 客户原有 setResponseStatus(404) 也改成 envelope | Claude（建议） | 统一所有业务错误用 envelope，避免任何 HTTP 状态码导致 $fetch 抛错 |

---

## 修复后的项目级约定（重要）

**HTTP 状态码语义**：

| 状态码 | 由谁产生 | 含义 | 前端处理 |
|---|---|---|---|
| 200 | API 业务路由 | 业务成功 OR 业务校验错误（看 envelope `error` 字段） | `if (res.error) showMessage(res.error.message)` |
| 401 | `server/middleware/auth.ts` | 未登录 / token 过期 | `app/plugins/auth.ts` 自动跳转登录页 |
| 403 | `server/middleware/auth.ts` | 角色不允许 | $fetch 抛错，用户看到 toast |
| 5xx | Nitro 兜底 / Prisma 未知错误 | 真实服务器错误 | $fetch 抛错（罕见） |

**新写接口必须遵守**：
- ❌ 不要 `setResponseStatus(event, 400)` —— 用 envelope
- ❌ 不要 `throw createError({statusCode:400, ...})` —— 用 envelope
- ✅ catch 块用 `respondWithPrismaError(event, error, fallbackMsg)`
- ✅ 员工写接口顶部加 `requireStaff(event)`
