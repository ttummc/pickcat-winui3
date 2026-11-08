**接入 DeepSeek Harness 官方界面**

- 桌面宿主在启动时拉起 `dsh web`，并在「DSH 定制 → DSH 界面」中一键打开
- 官方界面提供模型选择、权限模式、计划与文件改动、附件、斜杠命令、@ 引用、
  插件与自动化任务，功能与 DSH 本体一致
- 界面以独立窗口承载：主页面位于 pickcat.dao3.fun，把本机界面嵌成子框架会落入
  第三方上下文，浏览器会拦掉其 Cookie 与登录状态，因此不使用 iframe
- 官方界面与内置对话共用同一个内核与 `DSH_HOME`，工作区列表互通

**保留原有能力**

- 「对话」标签仍保留内置实现：会话列表、Markdown、流式输出、工具调用、token 用量

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
