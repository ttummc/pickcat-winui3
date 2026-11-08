**移除全部内置 DSH 功能**

内置内核的方案作废，AI 能力改为由用户自己安装的 DeepSeek Harness 提供，
PickCat 只作为被编辑的对象。

移除内容：

- 扩展侧：「DSH 定制」页面、侧栏入口、路由、桥接客户端
- 宿主侧：内核进程管理、本机 HTTP 桥接、官方 Web 界面窗口、首启解压
- 安装包：内核压缩载荷（414 MB）与解压逻辑，体积从 477 MB 回到 68 MB
- 工具链：内核打包脚本、上下文生成脚本
- 安装时清理旧版本遗留的 `dsh\` 目录（约 1.4 GB），避免升级后白占空间

保留内容：

- 界面仍是 WinUIonWeb 重写版，功能与 1.x 的其余部分一致
- 安装器的进程结束与卸载清理逻辑保留，用于处理从 1.x 升级的情况
- CI 重新具备构建安装包的能力（不再依赖本机内核）

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
