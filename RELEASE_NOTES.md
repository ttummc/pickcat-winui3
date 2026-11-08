**回复按 Markdown 渲染**

- 助手消息改为渲染 Markdown：标题、表格、代码块、列表、引用、分割线、链接
- 渲染器复用编辑器预览所用的实现，并补充表格支持
- 输出为 HTML 转义后生成，标签全部由渲染器产生

**流式显示**

- 回答过程中逐段渲染并显示光标，不再整段一次性出现

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
