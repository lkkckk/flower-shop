# 🌸 花店管理系统 (Flower Shop Management) - Gemini CLI 上下文

本项目是一个专为鲜花批发店设计的进销存与收银管理系统，采用 Nuxt 4 + TypeScript + Prisma 构建。

## 🚀 项目概览

- **定位**：单店部署，支持 PC 端后台管理及平板/手机局域网访问。
- **核心模块**：商品管理（多规格/单位）、客户管理（等级/欠款）、库存批次（临期提醒）、POS 收银（多单并行）、经营报表。
- **技术栈**：
    - **前端**：Nuxt 4 (SPA 模式), Vue 3, Ant Design Vue 4.x, Tailwind CSS, Pinia。
    - **后端**：Nuxt Nitro 服务器引擎, Prisma ORM。
    - **数据库**：开发环境使用 SQLite (`prisma/dev.db`)，Schema 兼容 PostgreSQL。

## 📂 核心目录结构

- `app/`：前端应用代码。
    - `composables/`：业务逻辑封装（API 请求、通用逻辑）。
    - `stores/`：Pinia 状态管理（如 `cart.ts` 处理 POS 购物车状态）。
    - `pages/`：视图路由。
    - `layouts/`：布局模板（`default.vue` 为管理端，`pos.vue` 为收银端）。
- `server/`：后端服务代码。
    - `api/`：Nitro API 路由。
    - `utils/`：后端工具类（如 `prisma.ts` 导出的单例 Client）。
- `prisma/`：数据库定义及迁移文件。
- `docs/`：项目相关设计文档与进度跟踪。

## 🛠️ 开发指南

### 常用命令

| 任务 | 命令 |
| :--- | :--- |
| 启动开发环境 | `pnpm dev` |
| 数据库迁移 | `pnpm prisma migrate dev` |
| 数据库 GUI | `pnpm prisma studio` |
| 填充测试数据 | `pnpm db:seed` |
| 构建生产版本 | `pnpm build` |

### 开发规范

1.  **API 响应格式**：服务端 API 统一返回 `{ data: T \| null, error: { message: string, code: string } \| null }`。
2.  **前端数据请求**：优先在 `app/composables` 中封装业务请求逻辑，而非直接在组件内调用 `$fetch`。
3.  **状态管理**：跨组件或需要持久化的状态（如购物车、当前登录用户）存放在 Pinia Store。
4.  **数据库操作**：所有数据库交互必须通过 `server/utils/prisma.ts` 中导出的 `prisma` 实例。
5.  **样式**：使用 Tailwind CSS 进行原子化布局，Ant Design Vue 负责组件级 UI。

## ⚠️ 注意事项

- **SSR 状态**：项目目前配置为 `ssr: false`（单页应用模式），以解决局域网部署时的样式闪烁并提升内部管理系统的响应感。
- **数据库同步**：修改 `prisma/schema.prisma` 后，务必运行 `pnpm prisma migrate dev` 并重启服务。
- **环境要求**：Node.js >= 18.x, pnpm >= 8.x。
