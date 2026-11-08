**内置 DSH 内核**

- 安装包内置完整内核（1043 MB，压缩为 414 MB 的单文件载荷），首次启动解压到
  `<安装目录>\dsh`，无需用户另行安装 DeepSeek Harness
- 内核路径优先使用内置副本，未找到时回退到本机已安装的 DSH
- 解压后自动重新探测内核，页面状态随之更新

**修复**

- 「DSH 定制」页面因缺少组件导入导致整页空白
- 移除模板中一段重复的 `v-else` 块，该块使根节点无法渲染

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
