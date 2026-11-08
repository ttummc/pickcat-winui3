**退出登录不再依赖网络**

- 退出登录原本要等 `DELETE /session` 返回才继续，请求没有超时限制；一旦该请求
  挂起，设置页会一直停在退出状态
- 现在先清空本地会话并立即返回，服务器调用限时 8 秒；失败时提示"本地已退出"
- 所有 API 请求增加 15 秒默认超时，任何调用不会无限等待

**桌面版诊断能力**

- 新增渲染进程看门狗：页面若连续 2 秒无响应，日志记录 `renderer unresponsive`，
  恢复时记录 `renderer responsive again`，用于区分"界面线程卡死"与"网页卡死"
- 记录每次导航的地址与窗口关闭事件

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
