**关注校验**

- 登录后校验当前账号是否关注了指定账号（`01a0faca-3c45-7654-bea1-4147d7af5165`）
- 未关注时以全屏遮罩拦截界面，提供一键关注与账号链接
- 关注成功后遮罩立即解除；从其他标签页切回时自动复检
- 仅前端校验，不涉及服务端限制；未登录时不拦截
- 接口读取失败时放行，并保留待复检状态，避免把用户锁在界面外

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
