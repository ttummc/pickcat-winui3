**修复助手回复显示为「(无输出)」**

- 内核以 `text` 事件流式输出正文，`final` 只是收尾重复；原实现只读 `final.text`，
  当某一轮没有 final 时整条回复丢失
- 现在按事件累积正文，`final` 与末行日志仅作兜底
- 对话中显示该轮的 token 用量（`输入 / 输出`）
- 回答过程中实时显示已到达的文本，不再只显示「思考中」

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
