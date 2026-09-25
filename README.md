# github-raw-cdn

Surge 模块：把 `raw.githubusercontent.com` 的请求 302 跳到 `cdn.jsdelivr.net`，GitHub Raw 频繁访问时少碰到 429/503。

改自 [Yuheng0101/X](https://github.com/Yuheng0101/X/tree/main/Scripts/GitRawAutoCDN)，在原逻辑上加了三处：

- 私有仓库（URL 带 `token=`）和带 `Authorization` 头的请求不转，否则 token 会发给 jsDelivr，而且只会拿到 404
- 新版 Raw 链接里的 `refs/heads/分支名`、`refs/tags/标签名` 会换成 jsDelivr 的 `@分支名` 写法
- 只转 GET 请求，查询参数不带过去

## 原理

`raw.githubusercontent.com/{用户}/{仓库}/{分支}/{路径}` 在本机改写成 `cdn.jsdelivr.net/gh/{用户}/{仓库}@{分支}/{路径}`，返回 302。改写在本机完成，之后文件由 jsDelivr 提供。

## 注意

jsDelivr 有缓存：按分支取的文件，CDN 最多缓存 12 小时，响应头里的 `max-age` 是 7 天。刚推送的改动可能要过一阵才看得到。更新频繁的模块如果急着拿新版，先关掉本模块再更新。

另外 jsDelivr 偶尔会返回不完整的内容，这个模块只是降低限流的概率，不保证每次都成功。

## 安装

Surge →「模块」→「从 URL 安装」：

```
https://raw.githubusercontent.com/godsonkg/github-raw-cdn/main/surge.sgmodule
```

需要开启 MITM，并安装、信任 Surge 的 CA 证书。模块会自动把 `raw.githubusercontent.com` 加进 MITM 列表。
