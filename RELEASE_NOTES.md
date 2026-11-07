**设置页的版本号不再写死**

- 「关于」里一直显示 `v0.1.0`，是当初写死的占位符。现在版本号在构建时从
  `manifest.json` 注入，设置页显示的永远是实际发布的版本

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
