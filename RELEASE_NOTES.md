**个人图盘的体积显示修正**

- 图盘列表接口不返回文件体积，此前的界面把缺失值显示为 `0 B`，与事实不符
- 现在体积未知时不显示体积，改为显示图片的像素尺寸（由已加载的缩略图读取）与时间
- 存储额度支持"不限量"（接口以 `limitBytes = 2^53-1` 表示）：此时只显示已用量，
  不绘制百分比进度条

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
