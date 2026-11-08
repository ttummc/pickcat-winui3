**中文回复乱码修复**

- 宿主读取内核 stdout 时未指定编码，.NET 默认使用控制台代码页，导致所有非 ASCII
  字符（中文、破折号等）变成乱码；已显式指定 UTF-8

**工具调用可视化**

- 内核的 `tool_call` / `tool_result` / `thinking` 事件此前完全不显示，只把最终
  文本拼成一段
- 现在按步骤渲染：思考摘要、工具名与命令、可展开的输出
- 整轮只有工具调用而没有正文时，不再显示"(无输出)"

**密钥入口**

- 「DSH 定制」右上角新增常驻「密钥」按钮，任何时候都能修改或清除密钥
- 清除后恢复为未配置状态

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
