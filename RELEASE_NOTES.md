**新增「DSH 定制」**

- 侧栏新增「DSH 定制」，用于描述需求并由 DSH 内核生成功能
- 桌面宿主内置本机桥接服务，仅监听 127.0.0.1，使用每次启动随机生成的令牌鉴权
- 通过 `dsh --profile headless --json` 执行任务，逐条解析内核输出的事件流
- 内核使用独立的 `DSH_HOME`（`%APPDATA%\PickCat\dsh-home`），与用户自己的 DSH 互不影响
- 模型密钥由用户自行提供，存储在 DSH 的凭据文件中
- 浏览器扩展模式下该页面提示需要桌面版

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
