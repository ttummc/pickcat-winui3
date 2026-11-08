# PickCat WinUI 3 —— 开发规范

本文件是工作区内的开发约定。你在这个工作区里产出的任何改动都必须遵守它。

## 一、项目定位

`pickcat.dao3.fun` 的三次重写产物，两个交付形态共用同一套前端代码：

| 形态 | 说明 |
|---|---|
| Chrome MV3 扩展 | 内容脚本把 Vue 应用挂到 `#pickcat-root`，替换站点原界面 |
| Windows 桌面应用 | WinUI 3 + WebView2，内嵌同一份 `content.js`，另加原生窗口、标题栏与 DSH 内核 |

原创站点 `/login`、`/register`、`/forgot-password`、`/reset-password` 保持原样，不做接管。

## 二、仓库结构

```
extension/
  src/
    App.vue           根组件：标题栏、侧栏、路由出口
    router.ts         手写哈希路由（无 vue-router）
    api/              client.ts（fetch 封装）、各资源 API
    stores/           响应式状态（session / ui / notifications / dsh …）
    pages/            页面，一个路由一个文件
    components/       复用组件
    lib/              纯函数工具（markdown、占位格式化等）
  public/manifest.json
desktop/PickCat.WinUI3/   WinUI 3 宿主
installer/                WiX 安装包定义
tools/                    构建、发布、上下文生成脚本
```

## 三、组件库：WinUIonWeb

界面统一使用 `winuionweb@0.2.0`（GPL-3.0），**不要引入其他 UI 框架**，也不要自己写按钮、对话框、侧栏等基础控件。

### 属性命名

组件属性采用 XAML 大小写，必须逐字匹配：

```vue
<Button Style="AccentButtonStyle" IsEnabled="false" @Click="save">保存</Button>
<NavigationViewItem Content="设置" Tag="prefs" :IsSelected="active === 'prefs'" />
```

- 字符串属性直接写：`Style="AccentButtonStyle"`
- 布尔与对象用绑定：`:IsEnabled="canSave"`
- 事件用 PascalCase：`@Click`、`@BackRequested`、`@update:IsOpen`

### 属性元素

子内容需要具名插槽时使用属性元素写法：

```vue
<InfoBar Severity="Success" IsOpen="true">
  <InfoBar.ActionButton>
    <Button Content="撤销" />
  </InfoBar.ActionButton>
</InfoBar>
```

### 组件清单

工作区内的 `components.json` 列出了全部 78 个可用组件及其 props，例如：

```json
{ "name": "Button", "props": ["Content", "Style", "IsEnabled", "Command", "..."] }
```

选择组件时先查这份清单，不要凭印象写属性名。

### 命名导出限制

`NavigationViewItem` 等子组件**没有具名导出**，必须通过全局注册使用：

```ts
import WinUIOnWeb from 'winuionweb'
import 'winuionweb/style.css'
app.use(WinUIOnWeb)
```

## 四、路由

`src/router.ts` 是手写实现，没有 vue-router：

- 路由表 `PATTERNS`：`{ name, segments }`
- 页面表 `PAGES`（App.vue）：路由名 → 组件
- 导航：`navigate('/settings')`，返回：`goBack()`
- 层级 `DEPTH` 决定转场：前进 `drill`、返回 `back`、同级 `fade`

新增页面需要同步三处：`RouteName` 联合类型、`PATTERNS`、`PAGES`。

## 五、接口访问

统一走 `src/api/client.ts`：

```ts
import { api } from '@/api/client'
const post = await api.get<Post>('/forum/posts/1234')
await api.post('/forum/posts', body)
```

- 写操作自动附加 `Idempotency-Key`（UUID），不要手工构造
- 所有请求有 15 秒默认超时；不要绕过 client 直接用 `fetch` 访问站点接口
- 错误处理用 `notifyError(err, '操作失败')`，不要 `alert`

接口是严格校验的：多余参数会返回 400，404 表示端点不存在。

## 六、样式

- 颜色一律用 CSS 变量：`var(--text-primary)`、`var(--text-secondary)`、`var(--text-tertiary)`、`var(--pc-accent)`
- 卡片背景 `var(--card-bg)` 是半透明的，叠在深色上会变浅，需要实体色时用 `color-mix`
- 字号常用 11.5–13.5px，行高 20px
- 动效时长 120–200ms，缓动 `ease` / `cubic-bezier(0.2, 0, 0, 1)`

## 七、禁止事项

1. 不要新增第三方 UI 库、图标库、状态管理库
2. 不要访问 `pickcat.dao3.fun` 以外的域名（项目无跨域代理）
3. 不要读写 `chrome.cookies`、`chrome.history`，不要申请新的 `permissions`
4. 不要在内容脚本里直接改站点 DOM——所有界面改动都在 Vue 层完成
5. 不要提交密钥、令牌、本机绝对路径
6. 不要修改 `isStockPath()` 覆盖的登录相关页面行为

## 八、产出要求

改动一个功能时：

1. 先读相关文件，确认现有写法
2. 改动尽量小，优先在既有文件内完成
3. 新增文件放在对应目录，命名与现有文件一致（PascalCase 组件、camelCase 工具）
4. 说明改了什么、为什么、影响范围
5. 不臆造接口：不确定的字段先在代码里确认或声明为可选

## 九、构建与验证

```powershell
cd extension
npx vite build           # 产出 dist/content.js 与 content.css
```

桌面版：`dotnet build desktop\PickCat.WinUI3\PickCat.WinUI3.csproj -c Release`

验证界面改动时，优先用实际渲染结果说话（截图、DOM 断言），不要只凭代码推断。
