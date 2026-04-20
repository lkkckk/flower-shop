# 任务：实现 POS 开单收银页面（鲜花批发系统核心功能）

## 背景

项目已经初始化完成，已经实现了商品管理、客户管理、库存管理模块。数据库里有真实的商品、客户、库存批次数据。现在要实现最核心的功能：POS 开单收银页面。

这个页面的特点：
- 用 pos 布局（不是 default 布局）
- 左右双栏：左侧选商品、右侧购物清单
- 支持同时开多个单（多 Tab）
- 开单时可选客户（不选默认散客）
- 支持按多种单位开单（枝/扎/箱等）
- 结账时走数据库事务：FIFO 扣库存 + 创建订单 + 更新客户欠款 + 写流水
- 支持挂单和结账两种完成方式
- 支持键盘快捷键加速开单

## 技术栈约束

同前，重点复习：
- Vue 3 + <script setup lang="ts">
- Ant Design Vue 4.x
- Pinia 做多单状态管理
- Prisma 事务处理开单
- 所有类型从 @prisma/client 导入

## 第 1 部分：Pinia 购物车 store

**stores/cart.ts**

完整 TypeScript 代码，包含以下 interface 和逻辑：

```typescript
interface CartItem {
  id: string                    // 本地唯一 ID（nanoid 或 crypto.randomUUID）
  productId: number
  productName: string
  grade: string | null
  specification: string | null
  baseUnit: string              // 商品基础单位
  unit: string                  // 当前选择的销售单位
  unitConversions: { fromUnit: string; toBaseQty: number }[]  // 可切换的单位
  qty: number                   // 当前单位的数量
  baseQty: number               // 换算后的基础单位数量
  unitPrice: number             // 实际售价
  originalPrice: number         // 原价
  subtotal: number              // qty * unitPrice
  notes: string
}

interface Cart {
  id: string                    // tab 唯一 ID
  label: string                 // tab 显示（客户名或"散客"）
  customerId: number | null
  customerName: string
  customerLevel: string         // normal/member/vip/wholesale
  customerBalance: number
  items: CartItem[]
  notes: string
  deliveryTime: Date | null
  deliveryAddress: string
  discount: number              // 整单优惠金额
  createdAt: Date
}

interface PaymentInfo {
  method: 'cash' | 'wechat' | 'alipay' | 'credit' | 'mixed'
  paidAmount: number            // 实收金额
  owedAmount: number            // 挂账金额
}
```

store 需要提供：

**State**
- carts: Cart[]（至少有一个空 cart）
- activeCartId: string | null

**Getters**
- activeCart: 当前选中的 cart
- cartSubtotal: (cartId) => number  所有 item 的 subtotal 之和
- cartTotal: (cartId) => number  subtotal - discount

**Actions**
- createCart(): 创建新 cart 并切换到它
- closeCart(cartId): 关闭 cart（如果有未结账内容先弹确认）
- switchCart(cartId): 切换当前 cart
- setCustomer(cartId, customer | null): 设置客户，自动根据等级重算所有 item 的价格
- addItem(cartId, product, unit, qty): 添加商品
  * 注意：同一商品同一单位已存在时，合并数量
  * 注意：根据当前 cart 的 customerLevel 选择对应的价格
- updateItemQty(cartId, itemId, qty): 更新数量
- updateItemUnit(cartId, itemId, unit): 切换单位（自动重算 baseQty 和 subtotal）
- updateItemPrice(cartId, itemId, price): 手动改价
- removeItem(cartId, itemId): 删除
- setDiscount(cartId, amount): 整单优惠
- setNotes / setDeliveryTime / setDeliveryAddress: 设置订单备注信息
- clearCart(cartId): 清空 cart 的 items 但保留 cart 本身

**价格计算规则**
- 当 customerLevel = 'vip' 时用 product.vipPrice（如果存在）
- 当 customerLevel = 'wholesale' 时用 product.wholesalePrice（如果存在）
- 否则用 product.defaultPrice

## 第 2 部分：开单事务 API

**server/api/orders/checkout.post.ts**

这是系统最关键的接口，必须用 Prisma 事务保证原子性。

入参：
```typescript
{
  cart: Cart,           // 来自前端的完整 cart
  payment: PaymentInfo
}
```

处理流程（必须全部在一个 prisma.$transaction 内）：

1. **对每个 cart item 执行 FIFO 扣库存**：
   - 查询该 product 所有 status='in_stock' 且 currentQty > 0 的批次，按 inboundDate asc 排序
   - 从最早的批次依次扣减，直到扣完该 item 的 baseQty
   - 每扣一个批次：更新 batch.currentQty，如果扣完了设 status='sold_out'
   - 记录每个 item 实际是从哪些批次扣的（一个 item 可能跨多个批次）
   - 如果库存不足，抛出错误"{商品名}库存不足"并回滚事务

2. **创建 Order 记录**：
   - 生成 orderNo（格式 'O' + yyyyMMdd + 4位序号）
   - 序号：查询当天已有订单数 + 1
   - totalAmount = cart subtotal - cart.discount
   - paidAmount / owedAmount 来自 payment
   - status：根据 payment 判断（paid / partial / pending）
   - 记录 customerId、orderType、deliveryTime、notes 等

3. **创建 OrderItem 记录**（批量）：
   - 注意一个 cart item 可能被拆成多个 OrderItem（如果跨了批次）
   - 也可以选择在一个 OrderItem 里记录主要批次，简化处理。推荐：**如果跨批次，按批次拆成多个 OrderItem**

4. **创建 StockMovement 流水**：
   - 为每次批次扣减创建一条 type='sale' 的流水记录
   - 记录 batchId、qtyChange（负数）、relatedOrderId

5. **更新客户余额和欠款**（如果有 customerId）：
   - 如果有欠款：customer.balance -= payment.owedAmount, customer.totalOwed += payment.owedAmount
   - 注意 balance 是正数为预存款、负数为欠款的累计值

6. **创建 Payment 流水**：
   - 如果 payment.paidAmount > 0，创建 type='payment' 的记录
   - 如果 payment.owedAmount > 0 且有 customerId，这个欠款本身不算一条 payment，它体现在 order.owedAmount 字段

返回：
```typescript
{ data: { order, message: '结账成功' }, error: null }
```

**重点**：整个流程必须在 prisma.$transaction 内，任何一步失败全部回滚。库存不足是常见错误，要友好提示。

## 第 3 部分：POS 页面主组件

**pages/pos.vue**

指定布局：
```typescript
definePageMeta({ layout: 'pos' })
```

页面结构：
- 顶部多单 Tab 区（CartTabs 组件）
- 左右双栏主工作区
  * 左侧（flex-1）：ProductPicker 组件
  * 右侧（固定宽度 380px，手机端全屏）：CartPanel 组件
- 挂载时初始化一个空 cart（如果 store 里没有）
- 键盘快捷键监听（用 @vueuse/core 的 useMagicKeys）

响应式：
- 桌面/平板（≥768px）：左右双栏
- 手机（<768px）：默认显示 ProductPicker，右下角有一个悬浮按钮显示购物清单数量，点击打开全屏 CartPanel 抽屉

## 第 4 部分：CartTabs 组件

**components/pos/CartTabs.vue**

功能：
- 显示所有 cart 的 Tab（使用 a-tabs type="editable-card"）
- 每个 tab 显示：客户名（散客时显示"散客"）+ 商品数量小圆点 + 金额
- 支持新建 tab（点击 + 按钮）
- 支持关闭 tab（点击 x）——关闭前如果有未结账商品，弹确认框
- 点击 tab 切换 activeCart
- 最多 10 个并行 cart

## 第 5 部分：ProductPicker 组件

**components/pos/ProductPicker.vue**

布局：
- 顶部搜索栏：a-input-search（大尺寸）+ "添加临时商品"按钮
- 左侧分类筛选（a-menu mode="inline"，宽度 120px）
- 右侧商品列表（a-table 紧凑模式，不要用 ProTable 或网格）

商品列表列：
- 名称（含等级 tag 和规格）
- 基础单位
- 库存（总剩余量，绿黄红三色）
- 默认单价
- 操作：一个"+"按钮

交互：
- 搜索框支持名称和拼音首字母搜索（简化版：只搜索名称即可）
- 搜索防抖 300ms
- 点击任意行或"+"按钮弹出"加入购物车"弹窗，输入单位和数量
- 加入购物车弹窗：
  * 显示商品名、等级、规格、当前库存
  * 单位选择（a-radio-group 显示所有可选单位包括基础单位）
  * 数量输入（a-input-number）
  * 实时显示换算后的基础单位数量和小计
  * 确认按钮：调用 cartStore.addItem

数据来源：
- 调用 /api/products 接口（已实现）
- 库存数据需要从批次聚合，可能需要新建一个 /api/products/with-stock 接口返回商品 + 总库存

注意：
- 搜索框聚焦时监听 Enter 键，回车 = 加入第一个匹配结果
- 加入购物车弹窗不关闭默认焦点在数量框，方便连续加商品

## 第 6 部分：CartPanel 组件

**components/pos/CartPanel.vue**

布局（从上到下）：

1. **客户区**：
   - 未选客户：一个大按钮 "👤 散客（点击选择客户）"
   - 已选客户：头像 + 姓名 + 等级 tag + 欠款余额 + "更换"和"清除"按钮
   - 点击打开客户选择抽屉（a-drawer 右侧滑出）
   - 抽屉内：搜索框 + 客户列表，点击一个选中

2. **商品列表**：
   - 用 a-list 而非 a-table
   - 每个 item 显示：
     * 第一行：商品名 + 等级 tag + 规格
     * 第二行：单位下拉选择 + 数量调整器 + 单价（可点击编辑） + 小计
     * 第三行（可折叠）：备注输入
     * 右侧：删除按钮（a-button danger type="text"）
   - 空状态：a-empty "购物车为空，请从左侧选择商品"

3. **合计区**（底部）：
   - 用 a-descriptions 或手写 flex 布局
   - 小计、优惠（可点击弹窗设置）、应付
   - 应付金额用大字号显示

4. **备注区**（可折叠）：
   - 订单备注（a-textarea autosize）
   - 配送时间（a-date-picker 带时间）
   - 配送地址（a-input，选了客户自动带出可编辑）

5. **底部操作栏**：
   - 左侧"挂单"按钮（a-button size="large"）
   - 右侧"结账"按钮（a-button type="primary" size="large"，占大部分宽度）
   - 购物车为空时两个按钮 disabled

## 第 7 部分：CheckoutDialog 组件

**components/pos/CheckoutDialog.vue**

结账弹窗（a-modal，手机端全屏）：

- 顶部大字显示应付金额
- 支付方式：a-radio-group 按钮模式（现金/微信/支付宝/欠款/混合）
- 当选"混合"时显示多个支付方式的实收金额输入
- 实收金额（a-input-number 大字号）
- 自动算找零
- 当客户未选择但要用"欠款"支付时，提示"必须先选择客户才能挂账"
- 底部"取消"和"确认收款"按钮

确认收款流程：
1. 构造 PaymentInfo
2. 调用 /api/orders/checkout
3. 成功：
   - 弹出"结账成功"message
   - 打开打印预览（新窗口或打印对话框）
   - 清空当前 cart 的 items（但保留 cart 本身）
   - 关闭弹窗
4. 失败：
   - 显示错误信息（比如"玫瑰 A 级库存不足"）
   - 不关闭弹窗，允许用户修改

## 第 8 部分：键盘快捷键

在 pages/pos.vue 里用 @vueuse/core 的 useMagicKeys 实现：

| 快捷键 | 动作 |
|---|---|
| / | 聚焦搜索框 |
| Esc | 关闭弹窗 / 清空搜索 |
| Ctrl+Enter | 打开结账弹窗 |
| Ctrl+S | 挂单 |
| Ctrl+N | 新建 cart |

注意：快捷键监听器要在 onUnmounted 里清理。

## 第 9 部分：小票打印

**components/pos/PrintReceipt.vue**

一个简单的打印组件：

- 用固定 58mm 宽度样式
- 内容：店铺名（居中大字）、订单号、时间、客户、商品列表（每行：名称 / 数量单位 / 小计）、合计、应付、实收、欠款、备注
- 打印 CSS：@media print { body > :not(.print-area) { display: none; } }
- 调用方式：window.print()
- 用一个 ref 控制 print-area 的显示

简化做法：结账成功后直接打开一个新路由 /orders/[id]/print，这个路由用极简布局（没有侧边栏没有header），挂载后自动触发 window.print()。

## 完成标志

以下场景全部跑通：

1. 访问 /pos 看到 POS 布局（无侧边栏）和初始的一个空 cart
2. 左侧能搜索和筛选商品，显示真实库存数据
3. 点击商品打开弹窗，选单位、输数量、确认后右侧购物清单多一项
4. 右侧能调整数量、切换单位（价格自动重算）、改单价、删除
5. 点击客户区打开抽屉，选一个 VIP 客户后所有商品价格自动变为 VIP 价
6. 点"+"新建一个 cart，两个 cart 能独立管理，tab 切换时右侧内容跟着切
7. 关闭有商品的 tab 弹确认框
8. 点结账打开弹窗，选支付方式，确认后：
   - 数据库里新增一个 Order 和若干 OrderItem
   - 相关 StockBatch 的 currentQty 被扣减
   - 相关 StockMovement 流水新增
   - 如果有欠款，Customer 的 balance 和 totalOwed 更新
   - 弹出打印预览
9. 库存不足时结账失败，显示错误且数据库状态没变（事务回滚）
10. 快捷键 / 能聚焦搜索框，Ctrl+Enter 能打开结账
11. 手机宽度下界面可用，购物清单变成抽屉

## 最后

完成后告诉我：
1. 所有新增文件的路径
2. 测试步骤（具体到每一个场景）
3. 已知的不足或未来改进点
4. 你在实现过程中做的关键决策