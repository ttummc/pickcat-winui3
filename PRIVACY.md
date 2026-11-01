# 隐私政策 / Privacy Policy

最后更新：2026-11-01

## 中文

**PickCat WinUI 3（非官方重制）**（下称"本扩展"）不收集、不上传、不出售任何用户数据。

### 本扩展会做什么

- 当你访问 `pickcat.dao3.fun` 时，隐藏站点原有界面，渲染一套本地打包的 WinUI 3 风格界面。
- 以**你本人的登录状态**调用该站点的公开 HTTP 接口（`https://pickcat.dao3.fun/api/v1/...`），用于显示帖子、作品、通知等内容。

### 本扩展不会做什么

- 不读取、不导出、不外传你的 Cookie 或登录凭据。接口请求由浏览器按同源规则自动携带 Cookie，本扩展无法读取其内容。
- 不收集浏览历史、不注入广告、不做统计埋点、不与任何第三方共享数据。
- 不向任何服务器发送数据（除上述对 `pickcat.dao3.fun` 本身的请求）。

### 本地存储

仅在你的浏览器本地（`localStorage`）保存两项偏好，不会上传：

- `pickcat-winui-theme`：浅色 / 深色 / 跟随系统
- `pickcat-winui-accent`：强调色选择

### 权限用途

| 权限 | 用途 |
| --- | --- |
| `host_permissions: https://pickcat.dao3.fun/*` | 仅在该站点注入界面、调用其公开接口 |
| `declarativeNetRequest` | 阻止该站点自带的 `/_nuxt/` 前端资源，避免与重写后的界面重复渲染、互相冲突。规则见 `rules.json`，只匹配这一个域名 |

### 第三方

登录时若触发人机验证，会调用阿里云验证码服务（`o.alicdn.com`），其数据处理遵循阿里云自身的隐私政策。除此之外无第三方。

### 联系方式

通过项目仓库的 Issues 联系。

---

## English

**PickCat WinUI 3 (unofficial remake)** does not collect, transmit or sell any user data.

- It hides the original UI on `pickcat.dao3.fun` and renders a locally bundled WinUI 3 style interface.
- It calls that site's public HTTP API using **your own existing session cookie** (the browser attaches it; the extension cannot read it).
- No analytics, no ads, no tracking, no third-party sharing.
- Only two UI preferences are stored locally (`localStorage`): `pickcat-winui-theme`, `pickcat-winui-accent`.
- `declarativeNetRequest` is used solely to block `/_nuxt/` resources of that one domain so the original app does not render underneath the replacement UI.
- The Aliyun CAPTCHA script (`o.alicdn.com`) is loaded only during sign-in and is governed by Alibaba Cloud's own privacy policy.
