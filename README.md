# github-raw-cdn

Surge 模块：把 `raw.githubusercontent.com` 的公开仓库 GET 请求 302 跳到 `cdn.jsdelivr.net`，改由 jsDelivr 提供文件。

改自 [Yuheng0101/X](https://github.com/Yuheng0101/X/tree/main/Scripts/GitRawAutoCDN)，在原逻辑上加了三处：

- URL 带 `token=` 或带 `Authorization` 头的请求保持原请求；jsDelivr 无法读取私有仓库
- 新版 Raw 链接里的 `refs/heads/分支名`、`refs/tags/标签名` 会换成 jsDelivr 的 `@分支名` 写法
- 只转 GET 请求，查询参数不带过去

## 原理

`raw.githubusercontent.com/{用户}/{仓库}/{分支}/{路径}` 在本机改写成 `cdn.jsdelivr.net/gh/{用户}/{仓库}@{分支}/{路径}`，返回 302。改写在本机完成，之后文件由 jsDelivr 提供。

## 注意

jsDelivr 会缓存文件，按分支取的内容可能落后于 GitHub 上的最新提交。具体缓存时间以 CDN 响应为准。更新频繁的模块如果急着拿新版，先关掉本模块再更新。

模块只返回重定向，不检查 CDN 返回的文件，也不会在 CDN 请求失败时自动回退到 GitHub Raw。

## 安装

Surge →「模块」→「从 URL 安装」：

```
https://raw.githubusercontent.com/godsonkg/github-raw-cdn/main/surge.sgmodule
```

需要开启 MITM，并安装、信任 Surge 的 CA 证书。模块会自动把 `raw.githubusercontent.com` 加进 MITM 列表。
