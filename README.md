# github-raw-cdn

Surge 模块：把所有 `raw.githubusercontent.com` 请求自动 302 重定向到 `cdn.jsdelivr.net`，
缓解 GitHub Raw 高频访问时的 429/503 限流。

Fork 自 [Yuheng0101/X](https://github.com/Yuheng0101/X/tree/main/Scripts/GitRawAutoCDN)，逻辑未改动，仅改了指向自己仓库。

## 原理

拦截匹配 `raw.githubusercontent.com/{user}/{repo}/{branch}/{path}` 的请求，本地改写成
`cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}` 并返回 302 跳转。纯 URL 改写，
不经过任何第三方服务器中转、不记录任何数据。

⚠️ **已知限制**：jsdelivr 偶尔会有缓存滞后或返回不完整内容的情况（实测遇到过），
不是 100% 保险，只是显著降低 429/503 的概率。

## 安装（Surge）

Surge → 模块 → 从链接安装：

```
https://raw.githubusercontent.com/godsonkg/github-raw-cdn/main/surge.sgmodule
```

安装后需要在 Surge 里对 `raw.githubusercontent.com` 的 MITM 证书完全信任（模块已自动把这个
域名加进 MITM hostname 列表，但 Surge 首次遇到新 MITM 域名可能仍需手动确认信任一次）。
