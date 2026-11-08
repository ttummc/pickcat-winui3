**内置开发规范与上下文**

- 每个对话的工作区自动铺入三份上下文，内核启动即以它们为工作依据：
  - `AGENTS.md`：项目定位、目录结构、WinUIonWeb 使用规则、路由与接口约定、禁止事项
  - `components.json`：78 个 WinUIonWeb 组件及其 props（由类型声明生成）
  - `pages.md`：现有 17 个页面与路由对照
- 新增 `tools/gen-dsh-context.mjs`，从 `winuionweb` 的类型声明重新生成组件清单
- 上下文随安装包分发（`Assets\dsh-context`），不会覆盖工作区中已被修改的同名文件

**安装流程修复**

- 程序运行中升级会因内核进程占用安装目录而失败（错误 2318，报 `dsh\v8_context_snapshot.bin`）
- 安装序列现在同时结束程序与本安装目录内的内核进程，不影响用户自行安装的 DeepSeek Harness
- 实测：程序与内核均在运行时执行升级，退出码为 0

## 安装

### 浏览器扩展

1. 下载 `PickCat-WinUI3-extension.zip` 并解压到固定目录
   （**不要**放在 `C:\Program Files`，会报 `rules.json: Internal error while parsing rules`）
2. 打开 `chrome://extensions`，开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择解压出来的文件夹
4. 打开 <https://pickcat.dao3.fun/>

### Windows 桌面版

下载 `PickCatWinUI3-Setup-*.msi` 直接安装，不需要管理员权限，开始菜单会有条目，
可在「设置 → 应用」中卸载。

完整历史见 [CHANGELOG.md](https://github.com/ttummc/pickcat-winui3/blob/main/CHANGELOG.md)。

> 只在 `pickcat.dao3.fun` 生效。停用扩展后原站界面立刻恢复。
