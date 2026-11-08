# PickCat WinUI 3 —— 当前只有安装版

> 本文件由 `@pickcat/dsh-plugin` 于 {{GENERATED_AT}} 自动生成。
> 插件没有找到 PickCat 源码仓库，只检测到已安装的桌面应用。

## 〇、本机环境

| 项 | 值 |
| --- | --- |
| 桌面版版本 | {{INSTALL_VERSION}} |
| 安装目录 | `{{INSTALL_PATH}}` |
| 旧版内置 DSH 内核 | {{INSTALL_KERNEL}} |
| 源码仓库 | 未找到 |
| 扩展版本 | 未知 |

## 一、关键限制

本机只有构建产物，没有源码：

- `Assets\content.js` 与 `Assets\content.css` 是打包后的代码，不要直接修改
- 没有 `extension/src`，无法按项目规范改页面、组件或路由
- 无法提供源码补丁、无法执行 `vite build`、无法验证改动

当用户要求修改 PickCat 功能时，必须明确说明：

> 当前只检测到 PickCat 安装版，没有源码仓库，因此我无法直接修改代码。我可以帮你解释现有行为，或者告诉你在拿到源码后应该改哪里。

不要编造 `src/pages/...`、`src/components/...` 等文件路径，也不要假装已经改过代码。

## 二、可以做的事

- 根据安装目录里的文件名、版本号解释当前安装状态
- 解释 `content.js` 的加载方式：扩展与桌面版共用同一份前端代码，挂载到站点的 `#pickcat-root`
- 指导用户获取源码仓库，或把源码路径填进 DSH 设置里的「PickCat 源码仓库」
- 解释 WinUIonWeb 的一般用法（属性用 XAML 大小写、事件用 PascalCase），但不要声称已经看到本仓库的组件清单

## 三、如何解除限制

1. 取得 PickCat 源码仓库（包含 `extension/src`，且 `package.json` 依赖 `winuionweb`）
2. 在 DSH 设置里把「PickCat 源码仓库」填成仓库根目录
3. 新建一个以该仓库为工作目录的会话；插件会自动补齐 `AGENTS.md`、`components.json`、`pages.md`

完成后重新运行 `pickcat_status` 工具即可确认「可修改源码：是」。
