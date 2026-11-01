# Privacy Policy

**English** · [简体中文](#简体中文)

Last updated: 2026-11-01

**PickCat WinUI 3 (unofficial)** ("the extension") does not collect, transmit or sell any user data.

## What the extension does

- On `pickcat.dao3.fun` it hides the site's original interface and renders a locally bundled
  WinUI 3 style interface.
- It calls that site's public HTTP API (`https://pickcat.dao3.fun/api/v1/...`) **using your own
  existing session** to display topics, works and notifications.

## What the extension does not do

- It does not read, export or transmit your cookies or credentials. API requests are made by the
  browser under normal same-origin rules; the extension cannot read the cookie itself.
- No browsing history, no ads, no analytics, no sharing with any third party.
- No data is sent to any server other than `pickcat.dao3.fun` itself.

## Local storage

Two UI preferences are kept in your browser's `localStorage` and never uploaded:

- `pickcat-winui-theme` — light / dark / follow system
- `pickcat-winui-accent` — accent colour choice

## Permissions

| Permission | Purpose |
| --- | --- |
| `host_permissions: https://pickcat.dao3.fun/*` | Inject the interface into that one site and call its public API |
| `declarativeNetRequest` | Block that site's own `/_nuxt/` frontend bundle so the original and rewritten interfaces do not render on top of each other. The rule in `rules.json` matches this one domain only |

## Third parties

Sign-in may trigger an Aliyun CAPTCHA, which loads a script from `o.alicdn.com`; that service is
governed by Alibaba Cloud's own privacy policy. No other third parties are involved.

## Contact

Open an issue on the project repository.

---

## 简体中文

**PickCat WinUI 3（非官方重制）**（下称"本扩展"）不收集、不上传、不出售任何用户数据。

### 本扩展会做什么

- 当你访问 `pickcat.dao3.fun` 时，隐藏站点原有界面，渲染一套本地打包的 WinUI 3 风格界面。
- 以**你本人的登录状态**调用该站点的公开 HTTP 接口（`https://pickcat.dao3.fun/api/v1/...`），
  用于显示帖子、作品、通知等内容。

### 本扩展不会做什么

- 不读取、不导出、不外传你的 Cookie 或登录凭据。接口请求由浏览器按同源规则自动携带 Cookie，
  本扩展无法读取其内容。
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
| `declarativeNetRequest` | 阻止该站点自带的 `/_nuxt/` 前端资源，避免原界面与重写界面重复渲染、互相冲突。规则见 `rules.json`，只匹配这一个域名 |

### 第三方

登录时若触发人机验证，会调用阿里云验证码服务（`o.alicdn.com`），其数据处理遵循阿里云自身的
隐私政策。除此之外无第三方。

### 联系方式

通过项目仓库的 Issues 联系。
