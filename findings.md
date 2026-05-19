# Findings — 整体 Debug 调研

> 本文件记录调研阶段确认的事实、根因证据、关键决策。Plan 中的每一步都应能追溯到这里的一条 finding。

更新时间：2026-05-19
调研者：Claude（systematic-debugging 流程，仅读不改）

---

## F1. DELETE /api/customers/1 返回 400 的真实根因

### 现象
VPS 部署后删除客户提示：`[DELETE] "/api/customers/1": 400 Bad Request`，看不到中文错误消息。

### 调查路径

1. 读 [server/api/customers/[id].delete.ts](server/api/customers/%5Bid%5D.delete.ts)：
   - 业务逻辑正确：先查存在性，再查订单数，有订单时返回 `HAS_ORDERS` + `setResponseStatus(event, 400)`
   - id=1 大概率是测试客户，有历史订单 → 命中 HAS_ORDERS 分支

2. 读 [app/composables/useCustomers.ts:32-55](app/composables/useCustomers.ts:32) 的 `handle()`：
   - 期望响应是 `{ data, error }` envelope
   - 进入 `try` → `if (res?.error)` 解析业务错误码 `HAS_ORDERS`
   - 抛出带 `e.code = 'HAS_ORDERS'` 的自定义错误

3. 读 [app/pages/customers/index.vue:237-252](app/pages/customers/index.vue:237) 的 `onDelete`：
   - 捕获 `e.code === 'HAS_ORDERS'` 时弹 `Modal.warning({ title: '无法删除', content: e.message })`
   - 这里逻辑也正确

### 根因（确认）

**问题不在删除接口本身，而在所有写接口共有的"双标响应"模式：**

- 服务端：`setResponseStatus(event, 400)` + `return { data: null, error: {...} }`
- `$fetch` 默认在 HTTP 非 2xx 时抛 `FetchError`，**永远不会**进入 `useCustomers` 的 `if (res?.error)` 分支
- `FetchError.message` 形如 `"[DELETE] \"/api/customers/1\": 400 Bad Request"`
- `FetchError.code` 是 fetch 错误码（如 `ERR_HTTP_BAD_REQUEST`），不是业务码 `HAS_ORDERS`
- 结果：[customers/index.vue:243](app/pages/customers/index.vue:243) 的 `Modal.warning` 永远不触发，前端 fallback 到 `message.error(e.message)`，用户看到原始 fetch 错误

### 影响面（Grep 量化）

```
44 处 setResponseStatus(event, 400)  分布在 20 个文件
```

所有"业务校验失败的友好提示"（PHONE_EXISTS / INVALID_PARAMS / HAS_ORDERS / RECHARGE_ERROR / DELETE_ERROR 等）都被这套模式吞掉。

### 修复策略

**核心原则**：业务错误用 envelope（HTTP 200），技术错误用 HTTP 状态码。

| 错误场景 | 当前做法 | 修复后 |
|---|---|---|
| 业务校验失败（INVALID_PARAMS、HAS_ORDERS、PHONE_EXISTS） | `setResponseStatus(400)` + envelope | **只返回 envelope（HTTP 200）** |
| 资源不存在 | `setResponseStatus(404)` + envelope | 保留 404 ✅（前端 catch e.data.error 处理） |
| 鉴权 401 | `createError({statusCode: 401})` | 保留 401 ✅ |
| 服务器内部错误 | catch 块 setResponseStatus(400) | 改为 500，envelope 内 code='INTERNAL_ERROR' |

---

## F2. 时间组件 & "No Data" 显示英文

### 现象
DatePicker / TimePicker / Empty / Pagination 等组件文案是英文。

### 证据

```bash
# 全局搜索均零命中
grep -r "ConfigProvider"     → only docs/
grep -r "zh_CN" / "zhCN"     → 仅 nuxt.config 注释、docs
grep -r "dayjs.locale"       → 零命中（只有 dayjs/plugin/* import）
```

### 根因
- **app.vue 没有 `<a-config-provider :locale="zhCN">` 包裹** → AntD 用默认英文 locale
- **没有任何地方调用 `dayjs.locale('zh-cn')`** → DatePicker 周一周二、月份、相对时间全英文
- `nuxt.config.ts` 的 `optimizeDeps` 只是预打包，不会执行 locale 设置

### 修复方案

1. `app/app.vue` 顶层包 `<a-config-provider :locale="zhCN">`
2. 新建 `app/plugins/locale.client.ts`：导入并执行 `dayjs.locale('zh-cn')`
3. （可选）`a-config-provider` 同时传 `:date-locale="zhCN"` 给 DatePicker 用

---

## F3. VPS 卡顿 = 没 build，跑的是 dev server

### 现象
项目部署到 VPS 后非常卡顿。

### 根因（推断 + 普遍规律）

- 用户提到"我不知道是不是因为我没有 build"——确认猜想成立
- `pnpm dev` 在 VPS 上慢的根本原因：
  1. Vite dev server 按需编译每个模块（HMR + source map）
  2. SPA 模式（`ssr:false`）首屏需下载完整 JS bundle 才渲染
  3. dayjs + 7 个 plugin + AntD 按需引入都在请求时编译
  4. VPS 通常 1-2 核 + 小内存，dev Node 进程吃满 CPU

### 修复方案
```bash
pnpm build                                            # 生成 .output/
NODE_ENV=production node .output/server/index.mjs    # 启动
```
推荐用 PM2 守护进程，配合 nginx 反向代理。

---

## F4. 鉴权层缺口（与 customer 概念无关）

### 调查路径

1. 全项目 grep `requireStaff` / `requireCustomer` / `getCurrentUser` → 18 个 server/api 文件命中
2. 全项目 glob `server/api/**/*.{post,put,delete}.ts` → 29 个写接口
3. 交集：**11 个有鉴权，18 个没有**

### 无鉴权的写接口清单

```
customers/index.post          # 创建客户
customers/[id].put            # 修改客户
customers/[id].delete         # 删除客户（用户报的 bug）
customers/[id]/recharge.post  # 客户充值
customers/[id]/repay.post     # 客户还款
products/index.post           # 创建商品
products/[id].put             # 修改商品
products/[id].delete          # 删除商品
products/[id]/image.post      # 上传商品图
preorders/index.post          # 创建预售单
preorders/[id].put            # 修改预售单
preorders/[id]/advance.post   # 推进预售单状态
stocks/inbound.post           # 入库
stocks/scrap.post             # 报损
stocks/discount.post          # 打折
orders/checkout.post          # POS 结账（关键！）
```

### 当前实际风险（用户澄清后）

**用户明确：微信小程序未上线、前端没有 customer 入口、目前没有 customer token 在使用。**

- 短期：实际风险 = 0（没有 customer token 存在）
- 中期：任何一个 staff 账号被攻破或 token 泄漏后影响范围扩大
- 长期：小程序上线后立刻有真实越权风险

### 修复方案（用户已选"最严策略"）

1. 上述 16 个员工写接口顶部统一加 `const staff = requireStaff(event)`
2. 全局中间件 [server/middleware/auth.ts](server/middleware/auth.ts) 改为白名单制：
   - 默认所有 `/api/*` 要求 `payload.type === 'staff'`
   - customer token 显式只允许访问 `/api/public/*`、`/api/auth/me`、`/api/auth/wx-login`
3. 即使小程序未来上线，新增 customer 可用接口需要显式在白名单声明

---

## F5. Catch 块吞 Prisma 异常成模糊 400

### 现象
40+ 处 `catch (error: any) { setResponseStatus(400); return {error:{message:error.message}} }`，会把：
- P2002 唯一约束 → "Unique constraint failed on the fields: (`phone`)"
- P2003 外键约束 → "Foreign key constraint failed on the field: `customerId`"
- P2025 记录不存在 → "An operation failed because it depends on..."

直接塞进 error.message 返回前端。

### 修复方案
新建 `server/utils/prismaError.ts` 工具：

```ts
import { Prisma } from '@prisma/client'

export function handlePrismaError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const field = (error.meta?.target as string[])?.join(',') || '字段'
        return { status: 200, code: 'UNIQUE_CONFLICT', message: `${field} 已存在` }
      }
      case 'P2003':
        return { status: 200, code: 'FK_CONSTRAINT', message: '存在关联数据，无法操作' }
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: '记录不存在' }
      default:
        return { status: 500, code: 'DB_ERROR', message: '数据库操作失败' }
    }
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: '服务器内部错误' }
}
```

每处 catch 改为：
```ts
catch (error) {
  const { status, code, message } = handlePrismaError(error)
  if (status !== 200) setResponseStatus(event, status)
  return { data: null, error: { code, message } }
}
```

---

## F6. 其他小问题（不在本次修复范围，仅记录）

- **PostgreSQL `contains` 大小写敏感**：[customers/index.get.ts:13-15](server/api/customers/index.get.ts:13) 客户搜索按 name/phone 模糊查，建议加 `mode: 'insensitive'`
- **默认 JWT_SECRET 弱密码风险**：[.env.example](.env.example) 默认 `dev-secret-change-me-min-32-chars-please-change`，VPS 部署如忘记改是大隐患
- **pos.vue:140 错误对象读取错位**：`e.data?.message` 应为 `e.data?.error?.message`
- **typeCheck 关闭**：[nuxt.config.ts:28](nuxt.config.ts:28) `typeCheck: false`
