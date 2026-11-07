**全屏编辑改用系统级全屏**

- 上一版只是把编辑器做成固定定位浮层，结果被侧栏和页面内容压在下面（侧栏的
  堆叠顺序更高），文字还会透出来
- 现在优先调用浏览器 Fullscreen API：元素进入浏览器的顶层（top layer），
  不受任何堆叠上下文影响；拿不到权限时（例如 WebView2）才退回固定定位浮层，
  并且浮层挂到 `body`、z-index 拉满
- 用原生全屏时按 Esc 退出会同步状态

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
