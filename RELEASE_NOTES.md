**卸载后不再残留登录状态**

- WebView2 的 Cookie 数据库位于 `%LOCALAPPDATA%\PickCatWinUI3\WebView2`，不在安装
  目录内。原安装包用 `util:RemoveFolderEx` 清理该目录，但其属性值
  `[LocalAppDataFolder]PickCatWinUI3` 不是合法的属性引用（WiX 报告 WIX1077），
  卸载时无法解析，清理动作返回 1603 并放弃执行，因此登录状态被保留，重装后仍为已登录
- 改为在卸载序列中直接删除：结束进程 → 删除用户数据目录 → 删除安装目录 →
  删除开始菜单与桌面快捷方式 → 删除注册表标记
- 实测：安装 → 运行产生 Cookie → 卸载，用户数据目录、安装目录、两个快捷方式与
  注册表项均被清除

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
