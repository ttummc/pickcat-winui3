**编辑器工具栏图标重绘**

- 原实现依赖 Segoe Fluent Icons 的字符编码，其中有若干码位并非对应图标：
  "删除线"显示为文件夹形状，"代码块"与"引用"重复，"图片"与"上传"使用了同一字形
- 改为自绘 SVG 图标集（20×20、1.6px 描边、圆角端点、跟随 currentColor）；
  粗体、斜体、删除线、标题沿用编辑器惯例的字母形式
- 工具按钮不再继承图标字体，避免混排时字符拼写错误

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
