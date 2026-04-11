# 🌸 花店管理系统 (Flower Shop Management)

鲜花批发店自用的进销存 + 收银管理系统。单店部署在店里电脑上，手机平板通过局域网访问。

## 核心功能

- 商品管理（多单位、多规格）
- 客户管理（等级、欠款）
- 库存批次管理（临期提醒）
- 多单并行开单收银（POS）
- 欠款对账
- 经营报表

## 环境要求

- **Node.js** >= 18.x
- **pnpm** >= 8.x

## 安装步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库（创建 SQLite 数据库并应用迁移）
pnpm prisma migrate dev

# 3. 启动开发服务器
pnpm dev
```

启动后访问 http://localhost:3000

## 常用命令

```bash
# 启动开发服务器
pnpm dev

# 打开 Prisma Studio（可视化数据库管理）
pnpm prisma studio

# 重置数据库（清空所有数据并重新应用迁移）
pnpm prisma migrate reset

# 数据库迁移（修改 schema 后执行）
pnpm prisma migrate dev --name <迁移名称>

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 项目结构

```
flower-shop/
├── app/
│   ├── app.vue                 # 应用入口
│   ├── assets/css/main.css     # 全局样式
│   ├── layouts/
│   │   ├── default.vue         # 后台管理布局（侧边栏）
│   │   └── pos.vue             # POS 收银端布局（全屏）
│   └── pages/
│       ├── index.vue           # 首页仪表盘
│       ├── products/           # 商品管理
│       ├── customers/          # 客户管理
│       ├── stocks/             # 库存管理
│       ├── pos.vue             # 开单收银
│       ├── orders/             # 订单记录
│       ├── payments/           # 对账单
│       ├── reports/            # 报表
│       └── settings/           # 系统设置
├── server/
│   ├── api/
│   │   └── health.get.ts       # 健康检查 API
│   └── utils/
│       └── prisma.ts           # Prisma Client 单例
├── prisma/
│   ├── schema.prisma           # 数据模型定义
│   ├── migrations/             # 数据库迁移文件
│   └── dev.db                  # SQLite 数据库文件
├── nuxt.config.ts              # Nuxt 配置
├── tailwind.config.ts          # Tailwind CSS 配置
└── package.json
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Nuxt 4 + TypeScript |
| UI 组件 | Ant Design Vue 4.x |
| 原子 CSS | Tailwind CSS |
| 状态管理 | Pinia |
| ORM | Prisma 5.x |
| 数据库 | SQLite |
| 包管理 | pnpm |
