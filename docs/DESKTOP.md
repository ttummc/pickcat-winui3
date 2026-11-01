# 桌面化方案：从浏览器扩展 → 真正的 Windows 窗口

**English** · 简体中文

---

## 0. 现状与目标

现在是一个 Chrome 扩展：在 `pickcat.dao3.fun` 的标签页里，屏蔽原站前端、注入自己写的
Vue 3 + WinUIonWeb 界面，然后**用网页模拟**一个 Windows 窗口（假的标题栏、假的三颗按钮、
假的导航面板）。

要的是**真的窗口**：任务栏里有它、Alt+Tab 能切、能贴边分屏、有 Snap Layouts、
标题栏是系统画的、能设置图标和跳转列表。

**关键判断：前端代码一行都不用重写。** 现有 `content.js` 就是一个「把 Vue 应用挂到某个 DOM 节点上」
的脚本，它对宿主是浏览器标签页还是 WebView2 毫无感知。要换的只是**外壳**。

---

## 1. 三条路线

| | **WinUI 3 + WebView2** | **Tauri 2** | **Electron** |
| --- | --- | --- | --- |
| 语言 | C# / C++ | Rust | JS/TS |
| 渲染引擎 | WebView2（系统自带） | WebView2（Windows） | 自带 Chromium |
| 安装包 | **≈ 8–15 MB** | ≈ 5–10 MB | ≈ 90–150 MB |
| 内存占用 | 低（共享系统 WebView2） | 低 | 高 |
| 窗口原生度 | **最高**：标题栏、Mica、Snap Layouts 都是系统的 | 高（原生窗口，Mica 需插件） | 中（无边框自绘，Snap 需手写） |
| 本机前置条件 | Windows App SDK ✅ 已装、VS 2026 ✅、.NET SDK ⚠️ 待装 | 需装 Rust 工具链（约 1 GB） | **已具备**（Node 24） |
| 与项目主题的契合 | **最高** —— 名字就叫 WinUI 3 | 中 | 低 |
| 开发量（复用现有前端） | 3–5 天 | 3–5 天 | 1–2 天 |
| 自动更新 | MSIX / Velopack | tauri-updater | electron-updater |
| 上架微软商店 | ✅ 直接支持 MSIX | 需自己打 MSIX | 需自己打 MSIX |

### 推荐：**WinUI 3 + WebView2**

理由不只是「好看」：

1. 这台机器上 Windows App SDK 运行时已经齐了（1.1 / 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 2.x），
   WebView2 156 也在 —— 生成的是**真 WinUI 3 窗口**，不是无边框自绘。
2. 项目本身就是在网页里模拟 WinUI 3。放进真 WinUI 3 窗口后，**假标题栏可以整个删掉**，
   换成系统画的 —— 反而更省事。
3. MSIX 打包 = 自动更新 + 商店上架 + 干净卸载，一条链路解决。

> Tauri 也完全可行，体积更小。如果更想要 Rust 生态、或者未来上 macOS/Linux，选它。
> Electron 只在「必须今天出货」时才建议 —— 体量和内存代价太大。

---

## 2. 两种托管模式（这是最关键的架构选择）

### 模式 A：注入模式（推荐先做）

窗口里的 WebView2 直接打开 `https://pickcat.dao3.fun/`，屏蔽原站前端，注入我们的界面。

```
┌──────────── WinUI 3 Window（系统标题栏 + Mica）────────────┐
│  ┌────────────── WebView2 ──────────────┐                 │
│  │  文档：https://pickcat.dao3.fun/      │  ← 同源！       │
│  │  ├─ /_nuxt/ 请求 → WebResourceRequested 拦截           │
│  │  ├─ 注入 content.js（document created 时）              │
│  │  └─ fetch('/api/v1/...') 直接生效，无需 CORS           │
│  └───────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘
```

**优点**

- 同源 → Cookie、`fetch`、图片、字体全部照旧，**零 CORS 工作**
- 阿里云登录验证码照常工作（同一套引擎）
- 现有前端 100% 复用，只需隐藏假标题栏
- 与扩展版本共用同一份 `content.js`

**缺点**

- 依赖站点在线；站点改版可能影响注入
- 首次启动要等页面加载

### 模式 B：本地模式（后期可选）

前端打包进应用（`app://` 或 `webview2` 虚拟主机），API 请求由**原生层代理**：

```
WebView2  ← app://ui/index.html（随包分发，秒开）
   │  fetch('/api/...') → WebResourceRequested 拦截
   ↓
C# HttpClient（自带 Cookie 容器、TLS、重试）
   ↓
https://pickcat.dao3.fun/api/v1/...
```

拦截后由原生层发起真实请求，再把响应连同 `Access-Control-Allow-Origin` 一起回给页面 ——
CORS 问题在代理层解决掉。

**优点**：启动快、不依赖站点 HTML、站点改版基本无感。
**缺点**：要多写一层代理和 Cookie 同步；验证码必须仍然在 WebView 里跑。

> 建议：先做 A 拿到能用的桌面版，B 作为 v1.1 的性能/稳定性优化。

---

## 2.5 窗口形态：全自绘（frameless）

目标形态：**里面只有一个浏览器内核，连标题栏和三颗按钮都由我们自己画。**

```
┌──────────────────────────────────────────────┐
│  ▣ PickCat  社区首页        ─    □    ✕      │  ← 我们的 TitleBar 组件（网页画的）
├──────────┬───────────────────────────────────┤
│ 首页     │                                   │
│ 论坛     │        WebView2 渲染区            │  ← 浏览器内核
│ 作品     │   （同一个 Vue 应用，同一份代码）  │
│ 搜索     │                                   │
└──────────┴───────────────────────────────────┘
```

### 为什么要这么做

| | 系统标题栏 | **全自绘** |
| --- | --- | --- |
| 外观一致性 | 系统画，和网页部分风格可能割裂 | 和界面完全一致（同一个设计系统） |
| 主题联动 | 需要单独调 `AppWindow.TitleBar` 颜色 | 跟随网页主题，深/浅色自动同步 |
| 品牌感 | 弱 | 强 |
| 代价 | 无 | 要自己实现拖动、双击最大化、Snap Layouts |

### 关键点：全自绘不等于放弃系统行为

这是最容易踩坑的地方。**按钮画在我们这边，但行为必须交给系统**，否则会丢失：

- 拖动窗口
- 双击最大化 / 还原
- 贴边分屏、Snap Layouts 悬停弹出
- 边缘缩放
- 最大化时的 8px 留白与圆角

Windows App SDK 1.4+ 提供了 **`InputNonClientPointerSource`**，可以告诉系统「这块区域属于标题栏」，
系统就会按原生行为处理，**即使按钮是我们画的**：

```csharp
var source = InputNonClientPointerSource.GetForWindowId(AppWindow.Id);

source.SetRegionRects(NonClientRegionKind.Caption, new[] {
    new RectInt32(0, 0, width, titleBarHeight)   // 整条标题栏 = 可拖动
});

source.SetRegionRects(NonClientRegionKind.Minimize,  minimizeRect);
source.SetRegionRects(NonClientRegionKind.Maximize,  maximizeRect);  // ← Snap Layouts 靠它
source.SetRegionRects(NonClientRegionKind.Close,     closeRect);
```

关键在 `Maximize`：把矩形登记成系统认的「最大化块」后，鼠标悬停时 Windows 会**自己弹出
Snap Layouts 面板**，点击也由系统执行 —— 我们只需要把按钮画在那儿。

> 纯 `SetTitleBar(element)` 的方案在这里不适用：WebView2 是整块控件，拿不到边缘区域的命中测试，
> 必须用 `InputNonClientPointerSource` 划分区域。

### 三颗按钮怎么接

网页里的按钮不能直接操作窗口，通过 WebView2 的消息桥：

```
网页 TitleBar 按钮
   │  window.chrome.webview.postMessage({ type: 'pc:capp', action: 'minimize' })
   ↓
MainWindow.WebMessageReceived
   │
   ├─ minimize → AppWindow.  (系统 caption 行为，或直接 SetPresenterState)
   ├─ maximize → 切换 Max/Default 状态
   └─ close    → Close()
```

前端只需要在 `TitleBar` 组件里判断宿主：

```ts
const host = (window as any).chrome?.webview
function onMinimize() {
  if (host) host.postMessage({ type: 'pc:capp', action: 'minimize' })
  else notify('最小化', '请使用浏览器窗口控件')   // 扩展里保留原提示
}
```

这样**同一份前端代码**，在扩展里点按钮弹提示，在桌面版里真的最小化窗口。

### 要补的细节（都是老坑）

| 项目 | 说明 |
| --- | --- |
| 最大化留白 | 最大化时窗口会有 8px 不可见边框，标题栏内容要 `padding-top` 补偿，否则会被裁掉 |
| 拖拽区域 | 标题栏里**可交互元素**（头像、按钮、搜索框）必须从 Caption 区域里挖掉，否则点不动 |
| 双击最大化 | 登记了 Caption 区域后系统自动处理，不用自己写 |
| 边缘缩放 | `AppWindow` 保持可缩放即可；全屏 WebView2 不会吃掉边缘，因为系统在处理非客户区 |
| 圆角 | Win11 自动给；自定义背景色时注意 `CornerRadius` 不被 WebView2 盖住 |
| Mica | WebView2 必须设 `DefaultBackgroundColor = Transparent` 才能透出 Mica；但网页本身有不透明背景，所以**实际看不到 Mica** —— 想要 Mica 只能做「标题栏 Mica + 内容区不透明」 |
| 高 DPI | 区域矩形是物理像素，要用 `XamlRoot.RasterizationScale` 换算 |

### 与模式 A/B 的关系

不冲突。窗口形态（全自绘）和内容托管方式（注入 / 本地代理）是两个正交的选择：

```
              注入模式 A        本地模式 B
全自绘窗口  ◀── 推荐首版 ──▶      以后可选
系统标题栏     也能用            也能用
```

---

## 3. 扩展 API → WebView2 API 对照

| 现在（扩展） | 桌面版（WebView2） |
| --- | --- |
| `declarativeNetRequest` 屏蔽 `/_nuxt/` | `CoreWebView2.AddWebResourceRequestedFilter(...)` + `WebResourceRequested` 事件里 `args.Response = CreateWebResourceResponse(...)` 返回空响应 |
| `content_scripts[].js` | `AddScriptToExecuteOnDocumentCreatedAsync(contentJs)` |
| `content_scripts[].css` | 同上下发一段 `<style>`，或 `WebResourceRequested` 拦截 `content.css` |
| `content_scripts[].world = "MAIN"` | 不需要了 —— 所有脚本默认就在主世界；验证码桥接可以直接合并进主脚本 |
| `chrome.storage` | `ApplicationData.Current.LocalSettings` 或 JSON 文件 |
| 假 `TitleBar` 组件 | **删掉**，用系统标题栏（`AppWindow.TitleBar` + Mica） |
| 扩展图标 | `AppWindow.SetIcon` + `Package.appxmanifest` 资源 |
| 后台 Service Worker | 不需要 |

**要改的前端改动，只有一处**：加一个「原生宿主」开关，隐藏假标题栏并留出拖动区域。

```ts
// content.ts
const isNativeHost = new URLSearchParams(location.search).has('pc-native') || !!window.__PC_HOST__
if (isNativeHost) document.documentElement.classList.add('pc-native-host')
```

```css
/* 真窗口里：不要假标题栏，顶部留出可拖动条 */
.pc-native-host .pc-titlebar { display: none; }
.pc-native-host .pc-shell { padding-top: 0; }
```

其余页面、路由、API 客户端、控件用法**完全不动**。

---

## 4. 分阶段路线

### P0 · 起跑（半天）

1. 装 .NET SDK 10（本机只有运行时，没有 SDK）
   ```powershell
   winget install Microsoft.DotNet.SDK.10
   ```
2. 新建 WinUI 3 项目（`dotnet new winui3` 或 VS 模板）
3. 放一个 `WebView2` 填满 ClientArea，加载 `https://pickcat.dao3.fun/`
4. 跑起来能看到原站 → 说明宿主通了

**验收**：一个真正的 Windows 窗口，里面有原站页面。

### P1 · 移植外壳（1–2 天）

1. 打包好的 `content.js` / `content.css` 作为嵌入资源
2. `AddScriptToExecuteOnDocumentCreatedAsync` 注入
3. `WebResourceRequested` 拦截 `/_nuxt/`
4. 前端加 `pc-native-host` 分支，隐藏假标题栏
5. WebView2 用户数据目录指到 `%LOCALAPPDATA%\PickCatWinUI3\WebView2`
   （Cookie、登录态持久化就靠它）

**验收**：窗口里是重写后的界面，登录一次后重启仍保持登录。

### P2 · 窗口体验（1 天）

- Mica 背景：`SystemBackdrop = new MicaBackdrop()`；WebView2 `DefaultBackgroundColor = Transparent`
- 标题栏：`ExtendsContentIntoTitleBar` + `SetTitleBar` 拖拽区，或干脆用系统标题栏
- 单实例（`AppInstance.FindOrRegisterForKey`）
- 窗口尺寸/位置记忆
- 任务栏跳转列表（首页 / 论坛 / 作品 / 通知）

**验收**：拖到屏幕边缘能分屏，最大化按钮能出 Snap Layouts，Alt+Tab 有缩略图。

### P3 · 分发（1–2 天）

| 方式 | 说明 |
| --- | --- |
| **MSIX** | 自动更新、干净卸载、可上微软商店；需代码签名证书 |
| 未打包 exe | 免签名，但 SmartScreen 会警告，且要自带 Windows App SDK 运行时 |
| Velopack | 未打包 + 自动更新，比 MSIX 轻 |

**签名是绕不过去的坑**：没有代码签名证书，用户第一次运行会看到
「Windows 已保护你的电脑」。证书约 $100–400/年；也可以走微软商店（商店代签）。

---

## 5. 风险与注意事项

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 站点改版导致注入失效 | 界面白屏 | 注入失败时自动回退到原站，并提示「已切回官方界面」 |
| 无代码签名 | SmartScreen 警告 | 买证书，或只发 MSIX 走商店 |
| GPL-3.0 传染 | 桌面客户端也必须 GPL 并开源 | 仓库已经是 GPL-3.0，照做即可 |
| Windows App SDK 运行时缺失（用户机器） | 启动失败 | MSIX 声明依赖，或 self-contained 打包 |
| 站点方不认可 | 法律/口碑风险 | 保持「非官方」声明，不用于商业分发 |
| 阿里云验证码 | 若被判定为异常客户端可能失败 | 模式 A 下与浏览器完全一致，风险最低 |

---

## 6. 结论

| 问题 | 答案 |
| --- | --- |
| 前端要重写吗 | **不用**，只加「原生宿主」判断（隐藏假标题栏 → 改用宿主标题栏 / 按钮接桥） |
| 推荐技术栈 | **WinUI 3（C#）+ WebView2** |
| 窗口形态 | **全自绘**：`ExtendsContentIntoTitleBar` + `InputNonClientPointerSource` |
| 标题栏谁画 | 我们画（复用现有 `TitleBar` 组件），行为交给系统 |
| 第一版内容托管 | 模式 A（注入），复用现有 `content.js` |
| 多久能出一个能跑的窗口 | **半天**（P0） |
| 多久能发给别人用 | **4–6 天**（含打包签名） |

---

## 7. 下一步

要开工的话，我按 P0 直接搭一个最小可运行工程：

```
desktop/
  PickCat.WinUI3/
    App.xaml(.cs)
    MainWindow.xaml(.cs)     ← WebView2 + Mica + 标题栏
    Host/
      ResourceBlocker.cs      ← 替代 declarativeNetRequest
      ScriptInjector.cs       ← 替代 content_scripts
      Assets/content.js       ← 构建产物直接引用
    Package.appxmanifest
```

说一声就开始。
