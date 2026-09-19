# 本机打印与预售金额交付记录

日期：2026-09-19。基线：`codex/mvp-hardening` / `b579da7`，开始时与 `origin/codex/mvp-hardening` 一致且工作区干净。仅本地实施，未提交、推送或部署 VPS。

## 1. 文件与范围

新增：

- `app/utils/printing/`：settings、escapeHtml、document、saleReceipt、preorderReceipt、browser、qz。
- `app/composables/usePrinter.ts`、`app/components/printing/PrinterSettingsModal.vue`。
- `app/pages/preorders/registrations/[id]/receipt.vue`。
- `shared/preorderMoney.ts`、`server/utils/preorderRegistrationAmounts.ts`。
- `prisma/migrations/20260919010000_preorder_registration_amount/migration.sql`。
- `tests/preorder-money.test.ts`、`tests/printing.test.ts`、`tests/printing-api-acceptance.mjs`、`tests/browser-printing.js`、`tests/browser-print-failure.js`、`tests/browser-printer-settings.js`。

修改：POS 页面、销售打印页、预售列表/登记表/详情/配送单数据映射、共享 A4 配送单组件、预售登记四个读写接口、类型、Schema、依赖与已有验收测试的金额输入。

没有修改 POS 收款事务、库存服务、客户账务、照片上传接口或权限矩阵。详情及列表新增小票入口，原 A4 配送单入口保留。

## 2. 数据结构与历史兼容

仅给 `PreorderRegistrationItem` 新增 `amount Decimal? @db.Decimal(12,2)`，无默认值，无历史金额回填。历史 null 显示“未填写”；只要任一项未填写，总额也显示“未填写”。历史登记编辑保存时须补齐金额。

新建/编辑必须提供非负金额，最多两位小数，上限 9999999999.99；拒绝空值、非法文本、负数和超精度值。API 返回固定两位字符串。既有请求幂等及版本冲突保护保留。正式历史订单配送单沿用已有 subtotal/totalAmount，不迁移成新登记。

## 3. 打印架构

已保存单据 → GET 权威详情及店名 → 统一安全 HTML renderer → Browser 或 QZ backend。预览与打印共享模板；所有业务文本均 HTML 转义。58/80mm 宽度含内边距，店名居中，长文本换行；热敏单不含照片、不强制 A4。

Browser 使用隐藏 iframe，等待字体，调用原生打印。份数以独立单据分页生成，原生面板应选 1 份。QZ 按需仅在客户端加载，使用 Windows 驱动的 pixel/html/plain 打印；HTML pageWidth 用英寸，配置边距用毫米，高度由驱动处理。参考 [QZ Pixel Printing](https://qz.io/docs/pixel) 与 [QZ config](https://qz.io/api/qz.configs)。

预留证书/签名服务钩子，没有前端私钥。未配置受信任签名时不承诺静默打印，首次连接可能要求授权，参见 [QZ signing](https://qz.io/docs/signing)。

本机设置键：`flower-shop-printer-settings-v1`。字段 mode/printerName/paperWidth/copies/autoPrintPos；默认 browser、空打印机、58mm、1份、自动打印关闭。支持1—10份；损坏配置恢复默认；无全店设置写入。

## 4. POS 流程

收款成功 → 保存 lastOrderId / 显示成功 → 如启用则自动打印。打印只读取已保存订单，无结账调用。失败显示“订单已保存”，可手动重打、明确改用浏览器、修改设置或继续开单；不会自动二次发送到另一后端，避免出纸状态不明时重复打印。

小票保留名称及规格快照、数量、成交单价、小计、累计收款、积分抵扣、已退款、欠款、退货数量及作废状态。

## 5. 预售流程与金额口径

商品名称 → 数量 → 行金额 → 每项照片 → 保存 → 小票或 A4 配送单。金额是整项小计，不是单价；`268.00 + 128.50 = 396.50`，第二项数量为2仍是396.50。Decimal 精确求和，不信任客户端总额，不保存冗余总额；照片块重复展示行金额，但总额只按商品项计算一次。

登记金额不生成付款、欠款、库存或客户流水。A4 保留照片预加载、分页与大图，新增每项金额和一次总额。

## 6. 本地迁移与生产部署要求

本地 PostgreSQL public 已先备份为 `.cache/backups/flower-shop-before-printing-20260919.dump`，并验证 pg_restore 目录可读，再执行扩展迁移。12个迁移均已应用，无 reset、drop、历史回填。

生产尚未执行。用户确认发布后，通过 GitHub 同步明确提交，再按以下顺序：

1. 备份生产 PostgreSQL、商品图片和预售图片；保留旧构建。
2. 在发布目录安装锁定依赖：`pnpm install --frozen-lockfile`。
3. 使用生产环境配置执行 `pnpm exec prisma generate`、`pnpm exec prisma migrate deploy`；核对本次唯一金额迁移为可空新增列，不运行 db push/reset。
4. `pnpm build`，备用端口启动，检查 `/api/health`、登记金额读写、收银及两种小票。
5. 健康检查通过后切换现有 systemd 服务；如失败回滚旧构建，新增可空列可保留。
6. 每台终端安装/启动 QZ Tray 和 Windows 打印驱动，选择对应纸宽，先测试打印。浏览器方式不依赖 QZ。

## 7. 验证记录与边界

- 单元测试：32项，29通过、0失败、3个环境选择性集成测试默认跳过。
- `pnpm build`：通过（独立输出 `.cache/printing-output`，避免覆盖正在使用的旧构建）。
- 独立 PostgreSQL schema/API：金额精度及固定字符串、零值、非法金额400、并发修改幂等、历史null、登记与财务库存隔离、收银员打印数据读取及设置写入403通过。
- 原预售/免交班真实接口回归、饮品定价/库存/退款/历史快照回归均通过。
- 浏览器：375/768/1440宽度 × 58/80mm，店名居中、无横溢出、金额一致、纸宽保存恢复；历史未知金额；A4照片和单次合计；销售小票通过。
- 本机设置：损坏配置恢复默认、保存重载、手机/平板弹窗、2份测试打印、全店设置零写入通过。
- 真实 QZ 服务不可用：自动打印失败、手动重打后结账请求仍只有1次；浏览器替代调用1次原生 print，订单读取仍有效，继续开单后购物车为空。
- 照片浏览器回归：上传中删除前项、排序、失败重试、多视口表单、三张照片关联、3页 A4 PDF通过。原生 print 在自动化中用探针替代，PDF单独导出检查。
- 未验证：实体热敏打印机出纸、QZ连接成功后的实际驱动打印、受信任签名免提示；需要连接实体设备验收。

复现：先设置 `FLOWER_BUILD_OUTPUT=.cache/printing-output` 并构建，再运行 `node tests/printing-api-acceptance.mjs --serve`。它建立独立 schema 并输出登录信息/单据ID到 `.cache/printing-browser.json`，回车清理独立环境。浏览器脚本按打印预览、POS结账确认、设置弹窗的前置页面运行；使用一次性验收账号，不用于生产数据。

截图和 PDF 在 `output/playwright/`；构建、单测与接口回归日志在 `.cache/printing-*.log`。这些验收产物不加入业务代码提交。

## 8. Git 自检与运行状态

最终 `git status --short`：19个已跟踪文件修改、20个新增文件，均属于本次打印/预售金额、对应测试和交付文档；无删除文件。`git diff --stat`（不含未跟踪新文件）：201行新增、229行删除。`git diff --check`通过。

最终构建产物位于 `.cache/printing-final-output`，包含详情页小票入口。隔离验收服务和数据库 schema 已关闭清理；原本地开发服务保留，`http://localhost:3000/api/health` 返回200。本地32项历史登记明细金额仍为null。未执行 Git提交、推送或 VPS修改。
