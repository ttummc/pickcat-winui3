# @pickcat/dsh-plugin

把本机的 **PickCat WinUI 3** 接入 **DeepSeek Harness（DSH）** 的插件。

它做三件事：

1. 检测本机的 PickCat 桌面版与源码仓库（路径、版本、是否带旧版内置内核）；
2. 在 PickCat 仓库工作区自动补齐 `AGENTS.md`、`components.json`、`pages.md`；
3. 把 PickCat 的状态与硬规则注入系统提示，并提供 `pickcat_status` / `pickcat_sync` 两个工具。

插件**不提供任何自定义 UI**：所有交互都复用 DSH 自带的设置页、会话和工具界面。

## 安装

插件是一个 DSH bundle（`package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`）。

方式一：在 DSH 的插件管理里安装本地目录（推荐用于开发调试）：

```
plugin_manager install_bundle  target = <本目录绝对路径>
```

方式二：命令行：

```powershell
dsh plugin --profile desktop add C:\path\to\dsh-plugin
```

安装后 DSH 设置页会出现本插件的配置项。

## 配置项

设置页里的字段来自插件的 `Config` schema，修改后即时生效：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `installPath` | 空 | PickCat 桌面版安装目录。留空自动检测 `%LOCALAPPDATA%\Programs\PickCat WinUI 3`。 |
| `repoPath` | 空 | PickCat 源码仓库根目录。留空自动探测（当前工作目录、桌面、`source\repos`、`Documents` 等）。 |
| `autoWrite` | `true` | 在 PickCat 仓库工作区自动补齐三个上下文文件。关掉后只保留状态注入与工具。 |

也可以直接改 `$DSH_HOME/profiles/<name>/cordis.patch.yml`：

```yaml
- id: pickcat
  name: '@pickcat/dsh-plugin'
  config:
    installPath: 'D:\Apps\PickCat WinUI 3'
    repoPath: 'D:\src\PickCatButWinUI3OnWeb'
    autoWrite: true
```

## 检测规则

安装目录按以下顺序取第一个有效的：

1. 用户在 `installPath` 里显式指定的路径；
2. `%LOCALAPPDATA%\Programs\PickCat WinUI 3`；
3. `%LOCALAPPDATA%\PickCat WinUI 3`、`%ProgramFiles%\PickCat WinUI 3`、`%ProgramFiles(x86)%\PickCat WinUI 3`。

版本从安装目录的 `PickCatWinUI3.deps.json` 里读（形如 `"PickCatWinUI3/1.6.0"`）。是否带旧版内核看 `dsh\resources\runtime\cli\bin\dsh.cmd` 是否存在。

源码仓库按以下顺序取第一个有效的：

1. 用户在 `repoPath` 里显式指定的路径；
2. 当前会话工作目录向上找到的仓库；
3. 常见位置：`%USERPROFILE%`、`Desktop`、`source\repos`、`Documents` 下的 `PickCatButWinUI3OnWeb` 等目录；
4. `Desktop` / `source\repos` / `Documents` 里名字包含 `PickCat` 的目录。

“有效仓库”的判定：存在 `extension/src`，且根目录或 `extension/package.json` 依赖 `winuionweb`。

优先级：**有源码仓库时以仓库为工作目标**；只有安装版时只能解释现有行为，不能改代码。两条路径都会出现在状态里。

### “哪个目录才是 PickCat 仓库工作区？”

就是包含下面结构的目录，不是安装目录：

```text
<仓库根目录>\
  extension\src\
  desktop\PickCat.WinUI3\
  package.json        # dependencies 里有 winuionweb
```

在本机可以用 `pickcat_status` 看“源码仓库”那一行；系统提示里也会写出绝对路径。如果当前会话的工作目录不在该仓库内，`pickcat_status` 会明确提示：

> 要直接读写源码，请把 DSH 工作区新建/切换为：`<仓库路径>`

在 DSH 左侧工作区栏新建/添加工作区时选择这个目录即可。插件本身会自动探测常见位置，但**要改源码，会话的工作目录必须是该仓库或其子目录**。

## 生成的文件

在 PickCat 仓库根目录（或会话所在仓库根目录）写入：

| 文件 | 内容 |
| --- | --- |
| `AGENTS.md` | 开发规范总纲，填入真实安装路径、版本、仓库路径 |
| `components.json` | WinUIonWeb 组件的 props 与事件清单 |
| `pages.md` | 现有页面与路由对照（从 `router.ts` 与 `App.vue` 解析） |

写入规则：

- **只补缺失，不覆盖已有文件**。已有 `AGENTS.md` 时跳过；
- `pickcat_sync` 工具显式传 `force: true` 才会覆盖；
- 插件卸载后文件保留，DSH 正常运行。

## 工具

| 工具 | 作用 |
| --- | --- |
| `pickcat_status` | 报告安装路径、版本、内核状态、源码仓库、扩展版本，以及当前工作区三个上下文文件是否存在。`fresh: true` 可忽略 5 秒缓存重新扫描。 |
| `pickcat_sync` | 在 PickCat 仓库根目录补齐三个文件。默认只补缺失；`force: true` 覆盖。 |

## 系统提示

检测到 PickCat 后，系统提示里会出现一段简短状态与硬规则：

- 改 PickCat 前先读 `AGENTS.md`；
- 写 WinUIonWeb 组件前查 `components.json`；
- 新增页面前查 `pages.md`，并同步 `RouteName` / `PATTERNS` / `PAGES`；
- 只有安装版时明确告知无法改代码，不编造文件路径。

未检测到 PickCat 时这段内容为空，插件不写任何文件。

## 重新生成预置上下文

`assets/components.json` 与 `assets/pages.md` 是仓库随包分发的预置副本。组件库升级或页面增加后重新生成：

```powershell
cd dsh-plugin
node scripts/build-context.mjs ..            # 仓库根目录
node scripts/build-context.mjs .. --out assets
```

前提：仓库已 `npm install`，存在 `node_modules/winuionweb`。

## 开发与测试

```powershell
cd dsh-plugin
npm install
node test/detect.test.mjs     # 直接运行，沙箱里也不依赖子进程
node --check index.js
```

检测逻辑拆成两层，便于单测：

- `lib/detect.js` 的 `collectSnapshot()` 负责文件系统 I/O；
- `decidePickCat(snapshot)` 是纯函数，单测只喂固定快照。

## 限制

- 仅支持 Windows；其他平台插件保持静默。
- 不内置、不打包、不启动 DSH 内核；DSH 由用户自己安装和升级。
- 不修改 PickCat 应用本身，只读取安装目录与仓库。
- 不写自定义 UI，不注册 Client 插件、页面或 iframe。
- 插件不写日志密钥；本插件本身不接触任何 API Key。

## 验收对照

| 编号 | 场景 | 插件行为 |
| --- | --- | --- |
| A1 | 本机装了 PickCat 桌面版 | `pickcat_status` 返回版本与路径；打开仓库工作区后自动出现 `AGENTS.md` |
| A2 | 改安装目录 | 在设置页改 `installPath`，下一次检测（新会话或 `pickcat_status`）即生效 |
| A3 | 没装 PickCat | 系统提示为空、不写文件、工具返回未检测到，DSH 其余功能正常 |
| A4 | 工作区已有 `AGENTS.md` | 跳过写入，保留原文件 |
| A5 | 让 AI 用 WinUIonWeb 加按钮 | 系统提示指向 `AGENTS.md` 与 `components.json`，可查到 `Button` 的 props/事件 |
| A6 | 只有安装版 | `AGENTS.installed.md.tpl` 版本明确写出“无法修改代码”，状态里 `canEditSource: false` |
| A7 | 卸载插件 | 已生成的文件保留；删除 bundle 后 DSH 正常启动 |

## 目录结构

```
dsh-plugin/
  index.js                 插件入口（apply + Config + tools + 系统提示）
  cordis.patch.yml         Loader 条目
  lib/detect.js            检测（I/O 快照 + 纯决策）
  lib/context.js           AGENTS.md / components.json / pages.md 生成与安全写入
  assets/                  预置上下文与 AGENTS.md 模板
  scripts/build-context.mjs 从仓库重新生成预置上下文
  test/detect.test.mjs     检测单测
  locale/                  插件标题与描述
  icon.svg                 插件图标
```
