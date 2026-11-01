# PickCat · WinUI 3 Edition

[English](README.md) · **简体中文**

[![下载](https://img.shields.io/badge/⬇_下载_for_Chrome-最新版本-ff6b60?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip)

[![build](https://github.com/ttummc/pickcat-winui3/actions/workflows/build.yml/badge.svg)](https://github.com/ttummc/pickcat-winui3/actions/workflows/build.yml)
[![license: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

> **非官方项目。** 这是粉丝实现，与 PickCat 官方无关，未获其认可或授权。
> 只在 `pickcat.dao3.fun` 上生效，不收集任何用户数据（见 [PRIVACY.md](PRIVACY.md)）。

## 安装

1. 下载 **[PickCat-WinUI3-extension.zip](https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip)**，
   解压到一个**固定目录**（不要放在会被清理的临时目录，Chrome 之后还要持续读这些文件）
2. Chrome 打开 `chrome://extensions`
3. 右上角开启「开发者模式」
4. 点「加载已解压的扩展程序」，选择解压出来的目录（含 `manifest.json` 那一层）

访问 <https://pickcat.dao3.fun/> 就是新界面。

> 只在 `pickcat.dao3.fun` 生效；关掉扩展就回到原站。

把 [PickCat](https://pickcat.dao3.fun/) 社区**从零重做成一个 WinUI 3 风格的应用**——
不是给原站套一层皮，而是把原站的 UI 整个丢掉，用扒下来的 API 重新写一套界面。

- 界面库：[WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb)（Vue 3 + WinUI 3 控件）
- 形态：Chrome 扩展（MV3），在原站域名下接管窗口
- 数据：原站真实的 245 个接口（见 [docs/API.md](docs/API.md)）

**安装**：见下方「安装（开发版）」，或直接下载 [Releases](https://github.com/ttummc/pickcat-winui3/releases) 里的 `PickCat-WinUI3-extension.zip`。

---

## 它长什么样

窗口由真正的 WinUI 控件构成：`TitleBar`（带最小化/最大化/关闭的三颗标题栏按钮）、
`NavigationView`（左侧导航 + 底部项目）、`Button` / `TextBox` / `PasswordBox` / `InfoBar` /
`ProgressRing` / `InfoBadge` / `TeachingTip` 等等。字体图标走 Segoe Fluent Icons，
配色走 WinUI 的 Fluent Token（`--card-bg`、`--text-primary`、`--accent-base` …）。

主题支持浅色 / 深色 / 跟随系统，强调色可切换（默认用 PickCat 的珊瑚红）。

---

## 安装（开发版）

```powershell
npm install
cd extension
npx vite build          # 产物在 extension/dist
```

然后打开 Chrome：

1. 地址栏输入 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选择 `extension/dist` 目录
4. 打开 <https://pickcat.dao3.fun/> —— 已经是新的 WinUI 界面了

> 只在 `pickcat.dao3.fun` 下生效；关掉扩展就会回到原站。

---

## 原理

```
┌─────────────────────────────── pickcat.dao3.fun ───────────────────────────────┐
│                                                                                │
│  rules.json (declarativeNetRequest)  ── 拦掉原站 /_nuxt/ 的 JS/CSS             │
│                                                                                │
│  content.css  ── 隐藏 body 上除 #pickcat-root 以外的一切                        │
│                                                                                │
│  content.js (isolated world) ── Vue 3 + winuionweb，挂载到 #pickcat-root        │
│         │                                                                      │
│         └── fetch('/api/v1/...')  ← 同源，Cookie 直接生效，无需 CORS 处理       │
│                                                                                │
│  bridge.js (MAIN world) ── 只有它能访问页面的 window.initAliyunCaptcha          │
│                             通过 DOM 事件（detail 为 JSON 字符串）与 content.js 通信 │
└────────────────────────────────────────────────────────────────────────────────┘
```

几个关键决定：

1. **拦掉原站资源而不是覆盖它**。`declarativeNetRequest` 静态规则直接 block
   `/_nuxt/`，原站的 Nuxt 应用根本不会启动，不会和我们抢 DOM，也不会偷偷发请求。
2. **UI 全部重写**。路由是自己写的 hash 路由（`#/forum/post/<id>`），
   页面是全新的 Vue 组件，布局、信息层级、交互都按 WinUI 应用的习惯重新设计过。
3. **人机验证要跨世界**。MV3 的 content script 在隔离世界里，看不到页面的
   `window.initAliyunCaptcha`；而 MV3 又禁止 content script 往页面注入内联脚本。
   所以桥接脚本用 `manifest.content_scripts[].world = "MAIN"` 声明，
   两边靠 `CustomEvent` + JSON 字符串通信。

---

## 页面

| 路由 | 页面 | 主要接口 |
| --- | --- | --- |
| `#/` | 首页（推荐 / 最新信息流） | `/topic-recommendations`、`/topics`、`/tags` |
| `#/forum` | 论坛总览 + 分类 | `/topics?sort=latest`、`/tags` |
| `#/forum/category/:slug` | 分类下的帖子 | `/topics?tag=<slug>` |
| `#/forum/post/:id` | 帖子详情（正文 + 楼中楼 + 回复） | `/topics/{id}`、`/topics/{id}/posts`、`POST /posts`、`PUT /posts/{id}/like` |
| `#/forum/editor` | 发帖 | `POST /posts` |
| `#/works` | 作品（精选轮播 + 发现） | `/featured-works`、`/work-recommendations` |
| `#/works/:id` | 作品详情 + 评论 | `/works/{id}`、`/works/{id}/comments` |
| `#/profile/:uid` | 个人主页（资料 / 帖子 / 作品 / 回复 / 关注 / 粉丝 / 贡献热力图） | `/users/{id}`、`/users/{id}/*` |
| `#/notifications` | 通知 | `/notifications`、`/notification-summary`、`PATCH /notifications` |
| `#/search` | 搜索（用户 / 作品） | `/search/users`、`/search/works` |
| `#/library` | 个人作品库 | `/users/{id}/works`、`/users/{id}/topics` |
| `#/settings` | 设置（主题 / 强调色 / 账户 / 退出） | `/level-progress`、`/avatar-presets`、`DELETE /session` |
| `#/login` | 登录（含阿里云滑块） | `POST /session` + `initAliyunCaptcha` |

---

## 用到了哪些 WinUI 控件

不是「套一层 CSS」，而是真的让 WinUIonWeb 的控件承担交互：

| 类别 | 控件 | 用在哪 |
| --- | --- | --- |
| 窗口 / 导航 | `TitleBar`、`NavigationView`（Left 模式 + 底部项目） | 整个外壳；返回、窗格开合、三颗标题栏按钮 |
| 角标 | `InfoBadge` | 左侧「通知」的未读数 |
| 选择 | `SelectorBar` | 首页推荐/最新、论坛最新/活跃、个人主页 6 个标签页、搜索用户/作品、作品库/帖子、作品推荐/最新 |
| 菜单 | `MenuFlyout` | 帖子卡片的右键菜单 + 「⋯」按钮（打开 / 新标签页 / 复制链接 / 分类 / 举报），全局单例 |
| 设置行 | `SettingsCard` | 设置页每一行（Header + Description + 右侧动作 + HeaderIcon 头像） |
| 对话框 | `ContentDialog` | 退出登录的模态确认（`ShowAsync()`） |
| 进度 | `ProgressBar`、`ProgressRing` | 等级进度条、各页加载态 |
| 分页 | `PipsPager` | 作品页精选轮播的圆点指示 + 左右翻页 |
| 折叠 | `Expander` | 作品详情的「操作说明」 |
| 输入 | `TextBox`、`PasswordBox` | 搜索、发帖、回复、登录 |
| 头像 | `PersonPicture` | 个人主页头像（带首字母兜底 + `role="img"`） |
| 状态 | `InfoBar` | 右下角消息栈（成功 / 警告 / 错误） |
| 基础 | `FontIcon`、`ImageIconSource`、`ToolTipService` | 图标、应用图标、全局提示 |

> `BreadcrumbBar` 试过了但没用上：它的 `ItemTemplate` 走 `{x:Bind Name}` 的
> XAML 绑定通道，在我们的组件里解析不出标签（`Mode=OneWay`、函数式模板都试过），
> 会渲染成一排空按钮。所以帖子页仍用返回链接。

---

## 动效

WinUI 的「手感」有一半在动效上，所以这块单独说。全部复用库里的 Fluent 令牌
（`--fast-out-slow-in`、`--fast-duration`、`--faster-duration`），没有另造一套缓动。

| 场景 | 行为 |
| --- | --- |
| 进入下一层（列表 → 详情） | 新页面从右侧 56px 滑入 + 淡入，旧页面向左退出（`drill`，300ms / 120ms） |
| 返回上一层 | 反向：从左侧滑入，向右退出（`back`） |
| 同级切换（论坛 ↔ 作品 ↔ 搜索） | 淡入 + 上移 10px（`fade`） |
| 列表入场 | 卡片逐个上浮 12px 淡入，每项 +30ms 递增（`pc-rise-in`） |
| 按压反馈 | 卡片 `scale(0.995)`，83ms |
| 分段切换 / 展开 / 菜单 | `SelectorBar` 胶囊、`MenuFlyout`、窗格开合用的是库自己的动画 |

方向不是猜的：路由给每个页面标了层级（首页 0 → 论坛 1 → 分类 2 → 帖子 3），
切换时比较新旧层级来决定是 `drill` 还是 `back`，所以「返回」和「前进」的动画是相反的。

`prefers-reduced-motion: reduce` 下全部动效降为 0.01ms。

---

## 目录结构

```
extension/
  public/            manifest.json / rules.json / bridge.js / icons
  src/
    content.ts       内容脚本入口（挂载 Vue 应用）
    App.vue          WinUI 窗口外壳（TitleBar + NavigationView）
    router.ts        自写的 hash 路由
    api/             接口客户端与类型（对应 docs/API.md）
    stores/          会话、主题/强调色、通知条
    lib/             captcha 桥、HTML 消毒、格式化
    components/      卡片、标签页、空状态等
    pages/           13 个页面
  dist/              构建产物（可直接加载）
docs/
  API.md             245 个接口清单
  gallery/           WinUIonWeb 控件参考（约 8900 行，逐控件）
  original-ui/       重构前原站截图（功能对照）
  screenshots/live/  重构后逐页截图
research/            扒接口时的原始素材（bundle 里的接口调用表等）
tools/               CDP 验证脚本
vendor/              winuionweb 0.2.0 的 tarball
```

---

## 开发

```powershell
# 构建
cd extension; npx vite build

# 一键：构建 + 重启 Chrome + 重新加载扩展 + 逐页截图验证
powershell -NoProfile -ExecutionPolicy Bypass -File tools/check.ps1

# 只验证某一页
powershell -NoProfile -ExecutionPolicy Bypass -File tools/check.ps1 -Name topic -Hash "#/forum/post/<id>"
```

`tools/` 下的脚本用 CDP 驱动 Chrome：

- `verify-all.mjs` — 遍历所有路由，检测渲染进程是否卡死并截图到 `shots/`
- `debug-hang.mjs` — 挂调试器抓主线程卡死的调用栈（就是靠它定位到 `Tag="settings"` 的坑）
- `capture_routes.mjs` — 抓原站各页面的截图，作为重构前的功能对照

### 踩过的坑

- **`const history = []` 会遮蔽 `window.history`**。路由里我手写了一个同名数组当栈，
  `navigate()` 里的 `history.push(hash)` 变成往数组里塞字符串 —— URL 不变、页面不变，
  表现就是「整个界面怎么点都没反应」。现已改用 `location.hash`。
- **`NavigationView` 的 `SelectionChanged` 在挂载时会自己触发一次**，会把用户真正打开的
  路由顶掉（比如直接访问 `/` 却落在论坛）。现在用一个「用户是否真的操作过」的标志把它挡掉。
- **`NavigationView` 的 `Tag="settings"` 是保留字**。它和内置的 Settings 项冲突，
  会让 Vue 陷入无限更新循环、把渲染进程卡死。改叫 `prefs` 即可。
- `NavigationView` 的事件是 `(sender, args)` 两段式，不是普通 Vue 事件；`ItemInvoked`
  实测不触发，能用的只有 `SelectionChanged`。
- `ContentDialog` 是命令式的（`ShowAsync()`），没有 `v-model:isOpen`。
- **`NavigationView` 自带返回按钮**。和 `TitleBar` 的返回按钮会重复成两个箭头，
  而且那条空行会把「首页」往下顶 ~130px，窗口一矮就把底部的「个人作品库 / 设置」
  挤出屏幕。必须 `IsBackButtonVisible="Collapsed"`，返回交给 `TitleBar`。
- **`position: relative` 的横幅会盖住负 margin 上移的头像**。头像看起来像被裁掉了，
  其实是被横幅压在下面 —— 给正文容器补 `position: relative; z-index: 1`。
- 帖子列表的 `sort` 只接受 `hot | latest | earliest`。
- **MV3 禁止 content script 往页面注入内联脚本**，所以人机验证的 main-world 桥接
  必须用 `content_scripts[].world = "MAIN"` 声明，不能在 JS 里 `document.head.append`。
- 重建扩展后**必须重启 Chrome 或重载扩展**，否则测的还是旧 bundle。
- 用 CDP 做点击测试时，**必须先发 `mouseMoved` 再发 `mousePressed`**，
  否则 WinUI 控件因为没有 pointerover 而不响应 —— 这会让测试误报「按钮没反应」。

---

## 发布

| 文件 | 说明 |
| --- | --- |
| `PickCat-WinUI3-extension.zip` | v1.0.0 构建产物，可「加载已解压的扩展程序」直接使用 |
| `LICENSE` | GPL-3.0（因打包了同样以 GPL-3.0 发布的 WinUIonWeb） |
| `PRIVACY.md` | 隐私政策：不收集任何数据 |
| `STORE.md` | 商店文案、权限说明、素材清单、提交前自检 |
| `docs/store/` | 440×280 小图、1400×560 横幅、1280×800 截图 ×5、128 图标 |

⚠️ **提交 Chrome 应用商店前必读 [STORE.md](STORE.md)**：当前形态有三处会被审核卡住
（运行时加载阿里云验证码脚本属于「远程代码」、替换他站界面、名称含他站商标）。

---

## 第三方

| 组件 | 许可 |
| --- | --- |
| [WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb) | GPL-3.0-only |
| [Vue 3](https://vuejs.org/) | MIT |

⚠️ 因为打包了 GPL-3.0 的 WinUIonWeb，本扩展整体按 **GPL-3.0-only** 分发。
详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目和 Microsoft 无关，也不是 PickCat 官方客户端。
