# 完整 MVP 实施与验收记录

基线：`196b194ac87facfc5cb5fe96bd4494be0f864918`。实施日期：2026-09-07。

## 已落地的业务

- 金额 Decimal(12,2)、数量 Decimal(12,3)，API 定点字符串；旧前端组件在展示边界兼容数值，新账务、定价与成本均使用 Decimal 计算。
- 预存/应收分账、积分账本、服务端四等级价格、积分抵现、结清且完成后赠分、退款回退（允许负积分债务）。
- 事务级串行锁、请求路径与正文绑定的幂等键、不可修改的财务/库存/成本/审计流水。
- 订单纠错申请与审批，逐行确认库存去向、原路退款及外部退款凭证。未制作预售单通过整单作废退款处理。
- 预售订金、补款、挂账、履约事件、配送人员和联系电话；订单照片独立快照。
- 客户时间线、标签、偏好、信用额度、联系人跟进、节日提醒、手工等级/积分、预存调整及档案合并。
- 供应商、采购草稿、分批收货、实际成本/成本差异、供应商应付付款。
- 限量限时批次特价及指定批次 POS 销售，普通余量和特价到期后恢复普通 FIFO 可售。
- 成本分摊、销售/现金/应收口径报表、账本对账单、交班现金和收支明细。
- CSV 全行预检、原子导入、幂等重试、业务数据导出；备份/恢复工具与每日 systemd 备份定时器。

## 已获得的验证证据

- Prisma validate/generate 通过；Windows 生产构建通过；Linux Docker 生产镜像构建通过。
- 10 项自动化测试通过，其中两项连接隔离 PostgreSQL：账户/积分/退款/采购/交班，四等级定价、积分债务、并发补款、分币退货、特价与 FIFO、账本与 SQL 报表核对。
- `tests/mvp-api-acceptance.mjs` 在本机 3010 与 Docker 3001 均通过：权限、幂等、预售照片与订金补款、配送、成本、退款、CRM 跟进、CSV、库存入库/特价/报损、报表及账本核对。
- `tests/mvp-migration.mjs` 从固定基线提交的旧 Schema 构建数据库，验证混合还款、超额还款、负余额、旧积分、未付款预售漏记应收及不可变触发器；结束后删除其隔离 Schema。
- 浏览器检查客户、订单、预售、库存、经营工作台、报表、设置在 375×812、768×1024、1024×768、1440×900 下无页面级横向溢出；客户姓名被挤掉的问题已修复。
- 58mm 小票预览实测宽 219.20px，80mm 为 302.36px；店名居中。预售打印页长店名居中，快照图片加载成功。实体打印机/蓝牙驱动不在本期验收范围。
- Docker 备份与恢复：恢复库有 9 次已完成迁移，测试记录一致，两个图片目录逐字节/SHA256 一致。
- VPS 现网检查：systemd/Nginx/PostgreSQL 均 active，版本为基线。生产数据库副本包含 1 客户、3 订单、2 付款、1 批次。
- VPS 已完成迁移前 PostgreSQL 与图片备份：`/var/backups/flower-shop/flower-20260907T143421Z.tar.gz`。
- VPS 数据副本迁移发现唯一差异：订单 #1 为未付款预售，旧 owedAmount=0，而金额为 2.50。已按确认的迁移规则补记 2.50 应收，保留原值快照、期初调整流水和自动核对依据。仅此可严格证明的旧预售缺陷自动处理，其他差异仍需人工核对。

## 发布结果

- [x] 最终代码与最终 Linux 构建一致性核对：280 个源文件逐一 SHA256 校验。最终 Linux 构建在独立 Ubuntu 环境使用锁定依赖完成。
- [x] VPS 恢复图片、3100 备用端口健康和账本核对；最终 Linux 产物在恢复副本上再次通过完整 API 验收，包括只修改预售折扣后同步应收。
- [x] 2026-09-07 23:06（北京时间）正式备份、迁移与切换。公网首页及 `/api/health` 返回 200；三个报表口径、客户、预售、订单和对账接口通过只读检查。
- [x] `flower-shop`、Nginx、PostgreSQL 均 active，Nginx 配置检查通过；备用服务已停止。
- [x] 每日备份 timer 已启用，北京时间 03:30 加最多 5 分钟随机延迟，保留 30 天；已手动成功执行一次。
- [x] 发布后备份恢复到 `flower_restore_mvp_release_20260907`：9 次迁移、1 客户、3 订单、3 条账户流水一致，数据库归档和图片校验通过。

正式库没有插入验收订单。预售 #1 应收调整为 2.50 元后，逐客户账户、积分、订单应收与账本一致，无未解释迁移差异。

发布产物 SHA256：`f6b4912e276d218651cf4fca27788573ed3b0deb3e549b39c0656bb3de65944c`。

- 旧输出：`/opt/flower-shop/.output.rollback.20260907T150639Z`。
- 迁移前最终备份：`/var/backups/flower-shop/flower-20260907T150640Z.tar.gz`。
- 发布后备份：`/var/backups/flower-shop/flower-20260907T150726Z.tar.gz`。
- 基线源码备份：`/var/backups/flower-shop/source-20260907T150639Z.tar.gz`。
- VPS 源码已同步，未替用户创建 Git 提交或推送；版本凭据保存在 `/opt/flower-shop/release-mvp.json`。

## 当前限制与剩余本机问题

本轮较早的 Docker 镜像已通过完整迁移、API 与备份恢复验收。最终重建时 Docker 引擎断连，随后 Docker Desktop 因残留 `sailor-ingest.sock` 启动失败；常规重启未恢复，手工清理该 socket 的命令被自动审批审查拒绝。因此最终版本使用 Ubuntu Linux 构建，并在 VPS 隔离副本验收后上线；不能声称最终版本已再次通过 Docker 运行验收。本机可用服务为 `http://127.0.0.1:3010`，使用隔离测试数据。

浏览器回归覆盖主要页面的四种尺寸和实际手机 POS 结账，未遍历每个弹窗的所有状态；打印验收为浏览器预览，未连接实体打印机。本轮执行了生产构建和业务测试，未单独完成全项目 TypeScript 类型检查。旧目录中历史说明以本文件和当前 Schema/服务为准。

后续恢复演练建议每月在新建的 `flower_restore_*` 数据库执行，验证归档 SHA256、两类图片、迁移数及账户对账；演练不得覆盖正式库。

## 2026-09-07 浏览器兼容热修复

VPS 通过 HTTP/IP 访问时，部分浏览器不提供 `crypto.randomUUID()`，导致带幂等键的写请求在发送前报错。购物车、全局请求拦截器和经营业务请求现统一使用兼容 UUID v4 生成器：优先调用 `crypto.randomUUID()`，不可用时使用 `crypto.getRandomValues()`，更旧环境再使用最终降级实现。

热修复在 Windows 与 Ubuntu 完成生产构建，缺少 `randomUUID()` 的模拟环境生成结果通过 UUID v4 格式校验，8 项相关测试通过。VPS 备用端口健康检查和账本只读核对通过后，于北京时间 2026-09-07 23:20 切换；公网返回的新脚本 `/_nuxt/kQprUOgq.js` 已包含降级逻辑，健康检查返回 200。回滚产物为 `/opt/flower-shop/.output.rollback.randomuuid-20260907T152025Z`，Linux 产物 SHA256 为 `cf52ed12c2039f8ac4b24651ce7f9d90f10aa1c770c47f91e355d1be47ac197e`。

## 运行验证

```powershell
node tests/prepare-pos-acceptance.mjs
$env:MVP_DATABASE_TEST='1'
pnpm exec tsx --test --test-concurrency=1 tests/mvp-business.test.ts tests/mvp-invariants.test.ts tests/pos-quantity.test.ts tests/product-images.test.ts tests/preorder-images.test.ts
node tests/mvp-migration.mjs
pnpm build
node tests/start-mvp-server.mjs
# 另一个终端
node tests/mvp-api-acceptance.mjs
```

测试仅写入命名的隔离 Schema，或显式指定的 Docker 测试数据库。生产验收只读，禁止在真实账本中插入验收销售。

## 回滚约束

保留原 `.output` 和迁移前备份。旧列仍保留，但旧应用不会维护新账本，因此不能在已有新流水后直接恢复旧应用并继续收款。紧急回退需先暂停业务写入，核对新流水并恢复兼容版本；不能以“Schema 向后兼容”宣称财务语义自动兼容。
