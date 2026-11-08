# PickCat WinUI 3 —— 开发规范

> 本文件由 `@pickcat/dsh-plugin` 于 {{GENERATED_AT}} 自动生成。
> 插件只补缺失文件，不覆盖已有内容。若本文件已经存在，插件会跳过写入。

## 〇、本机环境

| 项 | 值 |
| --- | --- |
| 桌面版版本 | {{INSTALL_VERSION}} |
| 安装目录 | `{{INSTALL_PATH}}` |
| 旧版内置 DSH 内核 | {{INSTALL_KERNEL}} |
| 源码仓库 | `{{REPO_PATH}}` |
| 扩展版本 | {{EXTENSION_VERSION}} |
| 组件库依赖 | `{{WINUIONWEB_SPEC}}` |

改代码以源码仓库为准。安装目录里只有构建产物（`Assets\content.js`、`Assets\content.css`），不要直接改安装目录。

## 一、项目定位

`pickcat.dao3.fun` 是中文创作社区。PickCat WinUI 3 是它的第三方重写版本，同一套前端代码有两种交付形态：

| 形态 | 说明 |
| --- | --- |
| Chrome MV3 扩展 | 内容脚本把 Vue 应用挂到站点的 `#pickcat-root`，整体替换原界面 |
| Windows 桌面应用 | WinUI 3 + WebView2，内嵌同一份 `content.js`，提供原生窗口、自定义标题栏 |

原创站点的登录相关页面（`/login`、`/register`、`/forgot-password`、`/reset-password`）保持原样，不要接管或改写。

## 二、仓库结构

```
extension/
  src/
    App.vue           根组件：标题栏、侧栏、路由出口
    router.ts         手写哈希路由（无 vue-router）
    api/              client.ts（fetch 封装）与各资源 API
    stores/           响应式状态（session / ui / notifications …）
    pages/            页面，一个路由一个 .vue 文件
    components/       复用组件
    lib/              纯函数工具（markdown、格式化、图标等）
  public/manifest.json
desktop/PickCat.WinUI3/   WinUI 3 宿主（XAML + C#）
installer/PickCatWinUI3.wxs  WiX 安装包定义
tools/                    构建、发布、上下文生成脚本
docs/                     GitHub Pages 站点与文档
```

## 三、组件库：WinUIonWeb

所有界面必须使用 `winuionweb`（GPL-3.0），不要引入其他 UI 框架，也不要自己写按钮、对话框、侧栏等基础控件。

### 属性命名

属性采用 XAML 大小写，必须逐字匹配：

```vue
<Button Style="AccentButtonStyle" IsEnabled="false" @Click="save">保存</Button>
<NavigationViewItem Content="设置" Tag="prefs" :IsSelected="active === 'prefs'" />
```

- 字符串属性直接写：`Style="AccentButtonStyle"`
- 布尔与对象用绑定：`:IsEnabled="canSave"`
- 事件用 PascalCase：`@Click`、`@BackRequested`、`@update:IsOpen`
- 子组件没有具名导出，必须通过 `app.use(WinUIOnWeb)` 全局注册后再用

### 属性元素

需要具名插槽时使用属性元素写法：

```vue
<InfoBar Severity="Success" IsOpen="true">
  <InfoBar.ActionButton>
    <Button Content="撤销" />
  </InfoBar.ActionButton>
</InfoBar>
```

### 组件清单

仓库根目录的 `components.json` 列出了全部可用组件及其 props 与事件：

```json
{ "name": "Button", "props": ["Content", "Style", "IsEnabled", "..."], "events": ["Click"] }
```

写组件前先查这份清单，不要凭印象写属性名。组件清单可以用下面的命令从仓库重新生成：

```powershell
node .\dsh-plugin\scripts\build-context.mjs .
```

`components.json` 由 `winuionweb` 的 `.vue.d.ts` 生成；个别全局注册的子组件（例如 `NavigationViewItem`）没有类型声明文件，写法以仓库里现有用法为准。

## 四、路由

`extension/src/router.ts` 是手写实现，没有 vue-router：

- 路由表 `PATTERNS`：`{ name, segments }`
- 页面表 `PAGES`（`App.vue`）：路由名 → 组件
- 导航：`navigate('/settings')`；返回：`goBack()`
- 层级 `DEPTH` 决定转场：前进 `drill`、返回 `back`、同级 `fade`

新增页面必须同步三处：`RouteName` 联合类型、`PATTERNS`、`PAGES`。现有页面与路由对照见仓库根目录的 `pages.md`。

## 五、接口访问

统一走 `extension/src/api/client.ts`：

```ts
import { api } from '@/api/client'

const post = await api.get<Post>('/forum/posts/1234')
await api.post('/forum/posts', body)
```

- 写操作自动附加 `Idempotency-Key`（UUID），不要手工构造
- 所有请求有 15 秒默认超时，不要绕过 client 直接用 `fetch` 访问站点接口
- 错误处理用 `notifyError(err, '操作失败')`，不要用 `alert`
- 接口是严格校验的：多余参数会返回 400，404 表示端点不存在

## 六、样式

- 颜色一律用 CSS 变量：`var(--text-primary)`、`var(--text-secondary)`、`var(--text-tertiary)`、`var(--pc-accent)`
- 卡片背景 `var(--card-bg)` 是半透明的，叠在深色上会变浅；需要实体色时用 `color-mix`
- 字号常用 11.5–13.5px，行高 20px
- 动效时长 120–200ms，缓动 `ease` / `cubic-bezier(0.2, 0, 0, 1)`

## 七、禁止事项

1. 不要新增第三方 UI 库、图标库、状态管理库
2. 不要访问 `pickcat.dao3.fun` 以外的域名（项目没有跨域代理）
3. 不要读写 `chrome.cookies`、`chrome.history`，不要申请新的 `permissions`
4. 不要在内容脚本里直接改站点 DOM，所有界面改动都在 Vue 层完成
5. 不要提交密钥、令牌、本机绝对路径
6. 不要修改 `isStockPath()` 覆盖的登录相关页面行为

## 八、产出要求

1. 先读相关文件，确认现有写法，再动笔
2. 改动尽量小，优先在既有文件内完成
3. 新增文件放在对应目录，命名与现有文件一致（PascalCase 组件、camelCase 工具）
4. 不臆造接口：不确定的字段先在代码里确认，或声明为可选
5. 说明改了什么、为什么、影响范围
6. 用实际渲染结果验证界面改动（截图、DOM 断言），不要只凭代码推断

## 九、构建与验证

前端：

```powershell
cd extension
npx vite build
```

产物是 `extension/dist/content.js` 与 `content.css`。

桌面版：

```powershell
dotnet build desktop\PickCat.WinUI3\PickCat.WinUI3.csproj -c Release
```

验证界面改动时，优先用实际渲染结果说话。
