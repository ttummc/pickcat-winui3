# 需求：为 PickCat WinUI 3 开发一个 DeepSeek Harness 插件

> 本文档是给 AI 的完整任务说明。读完应当能在不了解背景的情况下，独立完成这个插件。

---

## 1. 一句话目标

写一个 **DeepSeek Harness（下称 DSH）插件**。它安装到用户自己的 DSH 里，自动识别本机安装的 PickCat WinUI 3 应用，把该应用的开发规范、组件库清单、页面索引喂给 DSH 的编码智能体，让用户可以直接对 AI 说「给帖子页加个收藏按钮」，AI 就知道该改哪个仓库、用哪个 UI 组件、遵守什么约定。

**不要做自定义 UI。** 插件的用户界面完全复用 DSH 自带的界面，插件只提供能力与上下文。

---

## 2. 背景：PickCat WinUI 3 是什么

`pickcat.dao3.fun` 是一个中文创作社区。PickCat WinUI 3 是它的第三方重写版本，同一套前端代码有两种交付形态：

| 形态 | 说明 |
|---|---|
| Chrome MV3 扩展 | 内容脚本把 Vue 应用挂到站点的 `#pickcat-root`，整体替换原界面 |
| Windows 桌面应用 | WinUI 3 + WebView2，内嵌同一份 `content.js`，额外提供原生窗口、自定义标题栏、内置 AI 内核（旧方案，现决定移除） |

技术栈：Vue 3 + TypeScript + Vite（IIFE 库构建）+ WinUIonWeb 组件库；桌面侧是 WinUI 3（.NET 10）+ WebView2 + WiX 5 安装包。

UI 组件库是 [`winuionweb`](https://github.com/Furry-Xiyi/WinUIonWeb)（`winuionweb@0.2.0`，GPL-3.0），模拟 Windows 11 / WinUI 3 的外观。**这是本项目的硬性要求：所有界面必须用这个库，不允许换其他 UI 框架。**

### 仓库结构

```
extension/
  src/
    App.vue           根组件：标题栏、侧栏、路由出口
    router.ts         手写哈希路由（无 vue-router）
    api/              client.ts（fetch 封装，15 秒超时，写操作带 Idempotency-Key）
    stores/           响应式状态（session / ui / notifications / dsh …）
    pages/            页面，一个路由一个 .vue 文件
    components/       复用组件
    lib/              纯函数工具（markdown、格式化、图标等）
  public/manifest.json
desktop/PickCat.WinUI3/   WinUI 3 宿主（XAML + C#）
  Dsh/                    当前内置内核相关代码（新方案下应移除）
installer/PickCatWinUI3.wxs  WiX 安装包定义
tools/                    构建、发布、上下文生成脚本
docs/                     GitHub Pages 站点与文档
```

### 关键约定（写代码时必须遵守）

1. 组件属性用 **XAML 大小写**：`<Button Style="AccentButtonStyle" IsEnabled="false" @Click="save">`
2. 布尔/对象用绑定：`:IsEnabled="canSave"`；事件用 PascalCase：`@Click`
3. 具名插槽用属性元素：`<InfoBar.ActionButton><Button /></InfoBar.ActionButton>`
4. `NavigationViewItem` 等子组件没有具名导出，必须 `app.use(WinUIOnWeb)` 全局注册
5. 路由是手写的：新增页面要同步 `RouteName` 联合类型、`PATTERNS`、`PAGES` 三处
6. 颜色一律用 CSS 变量（`var(--text-primary)` / `var(--pc-accent)` 等）
7. 不引入新的 UI 库、图标库、状态管理库
8. 不访问 `pickcat.dao3.fun` 以外的域名
9. 不改动站点原有的登录页（`/login`、`/register`、`/forgot-password`、`/reset-password`）

---

## 3. 为什么改成插件

原方案是把 DSH 内核整个打进 PickCat 安装包（约 415 MB 压缩载荷，解压后 1.4 GB）。问题：

- 安装包从 68 MB 涨到 477 MB
- 内核版本锁定，DSH 升级要重新打包
- 用户若已装 DSH，机器上会有两份内核

新方案：**PickCat 安装包回到轻量形态，AI 能力由用户自己的 DSH 提供，我们只做一个插件把两者接起来。**

---

## 4. 插件要做什么

### 4.1 自动检测本机安装的 PickCat

检测顺序与依据（全部为 Windows）：

| 目标 | 检测方式 |
|---|---|
| 桌面应用安装目录 | `%LOCALAPPDATA%\Programs\PickCat WinUI 3`（默认路径） |
| 桌面应用版本 | 读 `PickCatWinUI3.exe` 的文件版本；或解析 `PickCatWinUI3.deps.json` |
| 是否已装内核 | 看 `dsh\resources\runtime\cli\bin\dsh.cmd` 是否存在（旧版本可能带） |
| 源码仓库 | 常见位置探测 + 用户手动指定（见 4.2） |
| 扩展版本 | 安装目录或仓库中的 `extension/public/manifest.json` 的 `version` |

若都没找到，插件不应报错崩溃，而是静默不激活，并在 DSH 的设置界面提供一个「选择 PickCat 路径」的输入（**用 DSH 自带的设置项机制，不要自建 UI 页面**）。

### 4.2 确定「以哪个安装为主」

用户可能同时存在：已安装的桌面版、本地源码仓库、旧的扩展目录。优先级：

1. 用户显式指定、且路径有效的 → 用它
2. 已安装的桌面应用（`%LOCALAPPDATA%\Programs\PickCat WinUI 3`）→ 用它
3. 什么都没有 → 插件不激活

**注意：已安装的应用只有构建产物（`Assets\content.js`、`content.css`），没有源码。** 要让 AI 能改功能，必须能拿到源码仓库。因此：

- 若检测到源码仓库（含 `extension/src` 且 `package.json` 里有 `winuionweb` 依赖）→ 以仓库为工作目标
- 只有安装版 → 只能读取版本与产物，AI 可做「解释现有行为」，不能改代码；此时插件应把这一限制写进上下文，让 AI 明确告知用户

### 4.3 把上下文喂给 DSH

DSH 的编码智能体默认读取**工作目录**下的 `AGENTS.md`。插件需要保证：当用户在一个 PickCat 相关工作区里对话时，工作区里存在以下文件：

| 文件 | 内容 | 生成方式 |
|---|---|---|
| `AGENTS.md` | 开发规范总纲（见附录 A） | 随插件分发，按检测到的版本填入实际数值 |
| `components.json` | WinUIonWeb 全部组件及其 props | 从仓库 `node_modules/winuionweb/dist-lib/types/components/*.vue.d.ts` 解析生成，或随插件预置一份 |
| `pages.md` | 现有页面与路由对照 | 扫描 `extension/src/pages/*.vue` 生成 |

**不要覆盖已有文件**：如果工作区里已经有 `AGENTS.md`（用户或上一次 AI 生成过），跳过不写。

生成组件的解析规则：`.d.ts` 里默认导出带 `ExtractPropTypes<{...}>`，花括号是嵌套的，必须做括号配平后逐行匹配 `PropName: {`，不能用非贪婪正则（会截断）。参考实现思路：定位 `ExtractPropTypes<{` 的起始下标，深度计数找到匹配的 `}`，再在子串上跑 `/^\s+([A-Za-z_$][\w$]*):\s*\{/gm`。

### 4.4 与 DSH 的集成方式

DSH 基于 Cordis 插件框架，「一切皆插件」。相关机制：

- 每个插件是一个 npm 包，`package.json` 里用 `dsh` 字段声明它是 profile 还是 bundle：
  - `dsh.profile` 列出一个 profile 由哪些 bundle 组成
  - `dsh.bundle` 指向该 bundle 的 patch 文件
- 配置在 `$DSH_HOME/profiles/<name>/cordis.yml`（组合后的树）与 `cordis.patch.yml`（用户层覆盖）
- 插件的启用/配置通过 `cordis.yml` 的条目（`- id: xxx` + `name: '@scope/pkg'` + `config:`）完成
- 装载：`dsh plugin --profile <name> add <package>`
- 环境变量是既有做法：配置项可以写成 `!!js process.env.XXX ?? '默认值'`（例如权限模式 `DSH_PERMISSION_MODE`）

请按 DSH 当前的插件规范实现，**优先复用 DSH 已有的能力**（工作区、会话、工具调用），不要另起一套。

### 4.5 UI 要求

- 不做独立窗口、不做自定义面板、不做 iframe
- 所有交互通过 DSH 自带界面完成：设置页里的配置项、会话里的对话、工作区列表
- 若需要展示 PickCat 状态（版本、路径），做成 DSH 设置项或让 AI 在对话中报告即可

---

## 5. 交付物

1. **插件包**（npm 包，可 `dsh plugin add` 安装）
   - 包名建议 `@pickcat/dsh-plugin`
   - 目录结构、`package.json` 的 `dsh` 字段、入口文件
2. **上下文文件**
   - `AGENTS.md`（模板，含占位符用于填入检测到的路径与版本）
   - `components.json`（预置一份，附带重新生成的脚本）
   - `pages.md`（模板）
3. **检测模块**：纯函数，输入无、输出结构化的检测结果，便于单测
4. **生成脚本**：`scripts/build-context.mjs`，从指定仓库重新生成 components.json 与 pages.md
5. **README**：安装方式、配置项、限制

---

## 6. 验收标准

| 编号 | 场景 | 期望 |
|---|---|---|
| A1 | 本机装了 PickCat 桌面版，用户用 DSH 打开一个工作区 | 插件能报告版本与安装路径，工作区自动出现 `AGENTS.md` |
| A2 | 用户把安装目录改到别处 | 在 DSH 设置里改路径后重新生效 |
| A3 | 本机没装 PickCat | 插件不激活、不报错、DSH 其余功能正常 |
| A4 | 工作区已有 `AGENTS.md` | 插件不覆盖 |
| A5 | 让 AI「用 WinUIonWeb 给页面加个按钮」 | AI 能说出用哪个组件、props 怎么拼（说明上下文生效） |
| A6 | 只有安装版、没有源码 | AI 明确说明无法改代码，而不是编造文件路径 |
| A7 | 卸载插件 | 已铺进工作区的文件保留，DSH 正常运行 |

---

## 7. 约束

1. **不内置、不打包、不启动 DSH 内核**——DSH 完全由用户自己安装和升级
2. **不修改 PickCat 应用本身**，插件只读取
3. **不写自定义 UI**，只用 DSH 默认界面与设置项
4. 仅支持 Windows（PickCat 只有 Windows 版）
5. 不要在日志或配置里写入 API Key
6. 插件卸载后不能影响 DSH 正常使用
7. 代码注释与文档用中文，界面文案用中文

---

## 8. 已知环境事实（供调试参考）

- DSH 桌面版典型安装路径：`%LOCALAPPDATA%\Programs\DeepSeek Harness`
- 内核入口：`<安装>\resources\runtime\cli\bin\dsh.cmd`，其内容为
  `ELECTRON_RUN_AS_NODE=1 "<安装>\DeepSeek Harness.exe" --expose-internals "<安装>\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js" %*`
- DSH 数据目录：`%APPDATA%\DeepSeek Harness` 或 `$DSH_HOME`（未设置时由启动器决定）
- 当前 DSH 版本：`0.2.1-rc.1`
- PickCat 桌面版配置与数据：`%APPDATA%\PickCat\`（`chats.json`、`api-key.txt`、`workspaces\`、`dsh-home\`）
- PickCat 安装版构建产物：`Assets\content.js`、`Assets\content.css`、`Assets\dsh-context\`

---

## 9. 待确认问题（可以在开始前问，也可以先按默认实现）

1. 插件是否需要同时支持「纯扩展用户」（没装桌面版、只装了 Chrome 扩展）？默认：不支持，只做桌面版。
2. 上下文是每次会话都重新铺，还是只在该工作区第一次使用时铺？默认：缺失才铺，不覆盖。
3. 是否需要把仓库源码复制进工作区（让 AI 能直接改），还是只铺文档？默认：只铺文档，源码由用户在仓库里改，插件在 AGENTS.md 中写明仓库绝对路径与构建命令。
4. `components.json` 预置一份 vs 每次从仓库现场生成？默认：预置 + 提供脚本。

---

## 附录 A：`AGENTS.md` 应包含的章节

以下是 PickCat 项目自己的开发规范，插件下发的 `AGENTS.md` 必须以它为基础（占位符替换为检测到的真实路径与版本）：

1. **项目定位**：两个交付形态、共享一套前端代码、登录页不接管
2. **仓库结构**：目录树与每个目录的职责
3. **组件库**：WinUIonWeb、XAML 大小写、属性元素写法、具名导出限制、指向 `components.json`
4. **路由**：手写实现，新增页面要改三处
5. **接口访问**：统一走 `api/client.ts`，自动 Idempotency-Key，15 秒超时，错误用 `notifyError`
6. **样式**：CSS 变量、卡片背景半透明、字号行高、动效时长
7. **禁止事项**：六条硬约束（同本文第 2 节）
8. **产出要求**：先读后改、改动最小、不臆造接口、用渲染结果验证
9. **构建与验证**：`cd extension && npx vite build`；桌面版 `dotnet build desktop\PickCat.WinUI3\PickCat.WinUI3.csproj -c Release`

---

## 附录 B：我方可提供的配合

- PickCat 仓库可随时提供，用于生成 `components.json` 与 `pages.md`
- 需要新增「机器可读的项目元数据」时，可以在仓库里加脚本生成，但**不改变应用运行时行为**
- 如插件需要固定格式的 JSON，可直接约定，我方按约定输出
