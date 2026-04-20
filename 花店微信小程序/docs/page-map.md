## 页面稿映射

`yemian.html` 里一共识别出 10 个页面稿，其中 9 个对应独立路由，另 1 个是 `我的` 页的未登录状态稿。

1. 首页
路由：`pages/index/index`

2. 分类
路由：`pages/category/category`

3. 订单
路由：`pages/order/order`

4. 我的
路由：`pages/mine/mine`

5. 商品详情
路由：`pages/product/product`

6. 收货地址管理
路由：`pages/address/address`

7. 确认订单
路由：`pages/confirm-order/confirm-order`

8. 支付成功
路由：`pages/payment-success/payment-success`

9. 物流详情
路由：`pages/logistics/logistics`

10. 我的（未登录态稿）
复用路由：`pages/mine/mine`
说明：当前页面已通过 `isLoggedIn` 状态覆盖登录态与未登录态两套稿面。

## 当前结论

- 底部主导航统一为：`首页 / 分类 / 订单 / 我的`
- 原型中的“购物车”在小程序里统一替换为“订单”
- 现有 `pages.json` 已与主导航命名保持一致
