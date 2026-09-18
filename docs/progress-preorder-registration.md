# Avocado 花店管理系统 - 预售自由登记重构进展

## 状态：本地修复与专项验收通过，尚未发布

2026-09-19 复审修复及实际验证范围见 [预售与功能精简验收记录](verification-preorder-cleanup.md)。下文为原实施记录，不代表全部业务、实体打印或生产环境已验收。

## 核心落地成果
1. **数据模型彻底独立**：
   - 新增 `PreorderRegistration`、`PreorderRegistrationItem`、`PreorderRegistrationPhoto` 三张独立数据表。
   - 订单编号支持重复，内置并发版本号 `version` 乐观锁；记录创建人、修改人、软删除回收站字段。
   - 在旧 `Order` 表仅兼容追加 `trashedAt` 与 `trashedById` 软删除字段，未触碰任何历史迁移。
   - 数据库增量迁移 `20260918000000_preorder_registration` 成功部署。

2. **接口与业务隔离**：
   - 新增 `/api/preorder-registrations` CRUD 分页列表、详情、新增、修改接口，支持 8-128 字符幂等键。
   - 修改接口严格校验 `version`，并发版本冲突时精准返回 409。
   - 新增回收站及恢复接口（`/api/preorder-registrations/[id]/trash` 与 `restore`，以及历史预售对应接口），角色严格限定为 `admin`（非管理员返回 403）。
   - 彻底移除旧预售 `GET /api/preorders` 及 `GET /api/preorders/[id]` 中的 `prisma.order.update`，改为纯只读。
   - 整个预售登记全流程对销售订单 `Order`、库存流水 `StockMovement`、账户流水 `CustomerAccountEntry` 变动均为 0，完全解耦。

3. **前端多端适配与交互**：
   - `/preorders` 首页划分为“登记记录”、“历史预售”（只读）、“回收站”（仅管理员可见）三大 Tab。
   - 新建登记表单（`PreorderRegistrationForm.vue`）：完全移除了客户、商品库、单价金额、订金尾款、库存扣减、制作与配送状态；支持多商品项与每项多图上传（≤10MB，JPG/PNG/WebP），支持图片排序、删除与失败重试，存在上传中/失败照片时禁止保存。
   - 历史预售详情页彻底改为只读，停止调用旧编辑、制作、配送推进等接口。
   - 首页即将履约预售单接入新预售自由登记，点击直达新登记详情。
   - POS 端预售入口直达 `/preorders/new` 自由登记。

4. **规范 A4 配送单打印**：
   - 统一大标题为“配送单”，店铺名称居中。
   - “顾客姓名”改为“订单编号”，彻底删除收货人、客户地址、订单来源、金额及装饰性条码。
   - A4 纵向排版，四周 10mm 留白；字号符合商品名 16pt、数量 14pt、正文 12pt。
   - 照片区域为规范 160mm × 100mm 容器，`object-fit: contain`，保持比例不裁剪。
   - 每张照片作为一个独立分页单元（`page-break-inside: avoid`），上方重复标明商品名称与数量，多商品、多照片自动分页。
   - 严格在字体与全部图片预加载成功后才放行打印，加载失败时阻止打印并提供重试。

## 验证证据与测试通过记录
1. **单元与业务测试**：
   - `tests/preorder-registrations.test.ts` (100% 通过)
   - `tests/preorder-images.test.ts` (100% 通过)
   - `tests/pos-quantity.test.ts` (100% 通过)
   - `tests/product-images.test.ts` (100% 通过)
2. **生产构建测试**：
   - `pnpm build` 顺利编译完成，生成客户端和 Nitro 服务端生产产物（.output）。
3. **端到端 HTTP 真实验收**：
   - `tests/preorder-http-acceptance.mjs` 在正在运行的服务上完整执行 11 项用例全部成功：
     - 登录鉴权
     - 照片上传
     - 收银员自由登记
     - 相同单号多条登记
     - 幂等防重放
     - 单条与列表搜索
     - 409 并发冲突拦截
     - 403 权限隔离
     - 管理员回收站与恢复
     - 即期履约查询
     - 前端页面路由可达性检查

5. **UI 表单控件漏洞修复与视觉优化**：
   - **问题定位**：`PreorderRegistrationForm.vue` 与 `ProductForm.vue` 中原本使用 Tailwind `class="hidden"` 隐藏文件输入控件 `<input type="file">`，因 preflight 禁用与特定 CSS 优先级原因，在浏览器中暴露出了原生的 `[选择文件] 未选择文件` 按钮，破坏了上传卡片排版。
   - **修复方案**：
     1) 行内统一改为显式 `style="display: none;"`；
     2) 在组件 `<style scoped>` 中追加 `input[type="file"] { display: none !important; }` 双重防护；
     3) 优化“上传照片”按钮为 Ant Design 统一纸感风格的边刻操作按钮（含图标与平滑 hover 过渡）；
     4) 照片墙末尾保留“+ 添加照片”快捷入口卡片，方便在已有照片后追加新图；
     5) 顺便在 `ProductForm.vue` 中消除同类隐患。
   - **验证**：`pnpm build` 与 `tests/preorder-http-acceptance.mjs` 重新验证 100% 通过。

6. **图片上传跨端可靠性彻底加固**：
   - **问题定位**：
     1) 之前使用原生 `<label>` 包裹 `display: none` 的 `<input type="file">`，在 Chrome / Edge 等浏览器中会因无障碍/安全性限制导致点击 label 无法唤起系统文件选择框；
     2) 错误处理静默（无 toast 提示），上传失败时用户无法得知原因；
     3) 缺少本地即时预览（选择文件后直接黑屏转圈）；
     4) 服务端鉴权仅支持 `Authorization: Bearer`，无 Cookie 兜底；
     5) 不支持 Windows 常见另存为 `.jfif` 格式，且缺少基于 MIME/Magic Bytes 的无后缀自动推导。
   - **解决方案**：
     1) 前端改用 Ant Design Vue 原生标准 `<a-upload :show-upload-list="false" :multiple="true">`，彻底杜绝文件选择框无法弹出的跨浏览器兼容问题；
     2) 选定文件后通过 `URL.createObjectURL(file)` 实现秒级本地预览，并在组件卸载时及时释放；
     3) 失败时通过 `message.error` 精确提示错误原因；
     4) `server/middleware/auth.ts` 增加 `getCookie(event, 'auth_token')` 自动兜底；
     5) 后端增加 `.jfif` 支持（自动规整为 `.jpg`），并基于 MIME 和文件头 Magic Bytes 实现智能格式推导。
   - **验证**：`tests/preorder-images.test.ts` 与 `tests/preorder-http-acceptance.mjs` 覆盖 Cookie 模式、jfif、无后缀与 Magic Bytes 全面通过。

7. **高/中风险专项问题彻底修复与数据隔离（本次落地）**：
   - **问题 1（高）照片上传响应式丢失无法保存**：
     - 在 `PreorderRegistrationForm.vue` 中引入独立的响应式计数器 `uploadingCount = ref(0)`，重构上传回调避免原始非响应式对象赋值，改用索引直接操作响应式代理，`hasUploadingOrError` 实时感知，上传完成后保存按钮立即解锁。
   - **问题 2（高）并发修改保护不严**：
     - 在 `server/api/preorder-registrations/[id].put.ts` 事务中引入 PostgreSQL `SELECT id, version FROM "PreorderRegistration" WHERE id = ${id} FOR UPDATE` 行级排他锁，锁内读取当前最新 `version` 并校验，彻底消除两人同时提交通过检查、覆盖明细的漏洞。
   - **问题 3（高）历史预售仍可修改**：
     - 在详情页 `app/pages/preorders/[id]/index.vue` 彻底移除 `<OrdersFinancePanel>`（收款/退款/作废面板）和旧排单跳转按钮，仅展示只读历史财务简报；
     - 历史写接口（`[id].put`、`advance`、`made`、`urgent`）全部统一抛出 `403` 拦截。
   - **问题 4（中）测试直接改动现有数据与缺少并发测试**：
     - 重构 `tests/preorder-registrations.test.ts`，杜绝查询现有预售，全部自建独立测试前缀的专用单据与用户，并在 `finally` 块中物理删除全部临时登记、订单、幂等记录与图片文件；
     - 引入真实 `Promise.all` 双请求并发竞争测试，严格验证 1 成功 1 被 409 拦截，且数据库无交错明细。
   - **问题 5（中）收银员 POS 入口被隐藏**：
     - 移除 `CartTabs.vue` 中的 `v-if="!isCashier"`，收银员在 POS 端可见并可点击“预售开单”直达 `/preorders/new`。
   - **全量验证**：
     - `tests/preorder-registrations.test.ts` (真并发 + 隔离清理 100% 通过)
     - `tests/preorder-images.test.ts` (100% 通过)
     - `tests/preorder-http-acceptance.mjs` (端到端 HTTP 11项 100% 通过)
     - `pnpm build` (生产编译 0 错误顺利通过)
