**「DSH 定制」界面修复**

- 会话列表标题为空、条目排版错乱：宿主输出的 JSON 使用了 PascalCase 字段名，
  与页面读取的 `id`/`title` 不匹配，导致 `:key` 全部为 undefined；已统一为 camelCase
- 窗口较窄时对话框被挤出可视区域：网格列宽为固定值且未设置 `min-width: 0`，
  工作区路径等长文本会撑开列；已改为可收缩列并补充 900px / 720px 两档布局
- 标题过长时补全省略号，删除按钮在激活会话上常显
- 已存在会话时不再强制停留在密钥配置页，改为顶部提示条

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
