**全屏编辑真正铺满**

- 之前全屏层被页面切换动画的 `transform` 困住：`position: fixed` 在那里退化成
  相对定位，只从内容区开始，盖不住侧栏，背景也透出下面的页面
- 现在全屏时把编辑器 teleport 到根节点，跳出那一层；顶边按标题栏的实际高度
  （运行时测量）偏移，侧栏和内容区都被覆盖
- 顺带修正：全屏时左侧导航的数字残留（那是编辑区文字透出来的，已随布局修复）

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
