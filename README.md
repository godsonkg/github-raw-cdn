# github-raw-cdn

Surge 模块：把 `raw.githubusercontent.com` 的公开仓库 GET 请求 302 跳到 `cdn.jsdelivr.net`，改由 jsDelivr 提供文件。

改自 [Yuheng0101/X](https://github.com/Yuheng0101/X/tree/main/Scripts/GitRawAutoCDN)，在原逻辑上加了三处：

- URL 带 `token`、`access_token`、`authorization` 查询参数（含大小写、一次 URL 编码的参数名），或带 `Authorization` 头的请求保持原请求；jsDelivr 无法读取私有仓库
- 常见新版 Raw 链接里的 `refs/heads/main/文件路径`、`refs/tags/v1.2.3/文件路径` 会换成 jsDelivr 的 `@main`、`@v1.2.3` 写法；带编码斜杠的 ref 或无法安全识别的结构保持原请求
- 只转 GET 请求，查询参数不带过去

## 原理

`raw.githubusercontent.com/{用户}/{仓库}/{分支}/{路径}` 在本机改写成 `cdn.jsdelivr.net/gh/{用户}/{仓库}@{分支}/{路径}`，返回 302。改写在本机完成，之后文件由 jsDelivr 提供。

## ref 和路径的限制

普通 `main/dir/file.js`、`refs/heads/main/dir/file.js`、标签和完整提交 SHA 的现有改写行为保留；不增加网络查询。

但 Raw URL 中未编码的斜杠无法仅靠字符串区分「分支名的一部分」还是「文件路径」。例如 `feature/topic/file.js` 仍按旧规则视为分支 `feature`、文件 `topic/file.js`，不能保证适用于名为 `feature/topic` 的分支。`refs/heads/` 前缀也不能消除这个歧义。本次没有彻底解决这个问题；需要精确版本时使用完整提交 SHA，含斜杠分支可关闭此模块使用原始链接。

包含 `%2F` / `%5C` 等编码分隔符的 ref、无效百分号编码、空文件路径、路径穿越片段和不支持的 `refs/` 结构会直接放行，避免生成误导的 CDN 地址。非 GET、认证请求保持不变；公共请求的普通查询参数仍按原行为丢弃。

## 注意

jsDelivr 会缓存文件，按分支取的内容可能落后于 GitHub 上的最新提交。具体缓存时间以 CDN 响应为准。更新频繁的模块如果急着拿新版，先关掉本模块再更新。

模块只返回重定向，不检查 CDN 返回的文件，也不会在 CDN 请求失败时自动回退到 GitHub Raw。

## 安装

Surge →「模块」→「从 URL 安装」：

```
https://raw.githubusercontent.com/godsonkg/github-raw-cdn/main/surge.sgmodule
```

需要开启 MITM，并安装、信任 Surge 的 CA 证书。模块会自动把 `raw.githubusercontent.com` 加进 MITM 列表。

## 本地测试

需要 Node.js 20 或更高版本，无须安装依赖：

```bash
npm test
```

测试用脚本运行时模拟对象检查嵌套文件、tags/SHA、认证与查询参数、编码 ref、畸形 URL、Surge 和 Quantumult X 返回对象。没有运行真实 Surge / Quantumult X 或请求 GitHub/CDN，因此不代表设备侧和 CDN 可用性实测。

## 持续回归检查

每次 push / pull request 会在 Node 22、24 上执行 `npm test`，也可手动运行 Actions。工作流只有读取权限，不部署、不使用 Secrets、不安装部署依赖。
