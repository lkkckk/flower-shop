# 商品图片部署

生产环境设置 `PRODUCT_IMAGE_DIR=/var/lib/flower-shop/uploads/products`。
该目录必须持久保存，不能放在每次发布替换的 `.output` 中。
开发环境未配置时默认写入项目 `public/products`。

首次升级前，将原 `public/products` 中的图片复制到持久化目录并校验哈希，保留原文件备份。
数据库中的 `/products/2.jpeg` 等历史 URL 不需修改。
新上传使用商品 ID + UUID 文件名，避免图片替换后缓存旧内容。
历史文件保留，供订单图片快照继续读取；数据库更新失败时清理本次新文件。

Nginx 在当前 server 块中添加以下规则（保留原有 `location /`）：

```nginx
location ~ "^/products/(?<product_image>[0-9]+(?:-[a-f0-9-]{36})?\.(?:jpg|jpeg|png|webp))$" {
    alias /var/lib/flower-shop/uploads/products/$product_image;
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    add_header X-Content-Type-Options nosniff always;
}
```

规则只匹配图片文件，不影响 `/products` 商品页面。
Nuxt 同时提供运行时图片路由，直接访问应用端口也能读取新上传图片；不存在的图片返回 404。
Nginx 配置通过 `nginx -t` 后 reload；环境变量变更后重启应用。

验收：公网和应用端口返回 `image/jpeg`（或对应 MIME），响应文件 SHA-256 与落盘文件一致。
重启应用后重复请求确认持久化；每次发布继续保留上传目录与环境变量。
