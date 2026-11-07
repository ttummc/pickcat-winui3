**修全屏「闪一下」**

- 上一版进全屏后启用了 Teleport，Vue 把编辑器节点搬到 `body`。全屏元素一旦在
  DOM 里被移动，浏览器就会立刻退出全屏，于是「进全屏 → 被搬走 → 退出 → 搬回」，
  看起来就是闪一下
- 现在不再移动节点，直接依赖 Fullscreen API 的 top layer；拿不到全屏权限时才用
  固定定位浮层兜底

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
