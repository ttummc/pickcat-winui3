<div align="center">

# PickCat · WinUI 3 Edition

**把 PickCat 社区重新做成一个 Windows 应用**

不是给网页套一层皮 —— 原站界面整个丢掉，窗口、导航、右键菜单、编辑器、
消息提示全部按系统应用的逻辑重写。

[![Version](https://img.shields.io/github/v/release/ttummc/pickcat-winui3?style=flat-square&color=ff6b60&label=version)](https://github.com/ttummc/pickcat-winui3/releases)
[![Build](https://github.com/ttummc/pickcat-winui3/actions/workflows/build.yml/badge.svg)](https://github.com/ttummc/pickcat-winui3/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)](LICENSE)
[![Unofficial](https://img.shields.io/badge/unofficial-fan%20project-8a8a8a?style=flat-square)](#声明)

</div>

---

## ⬇ 下载

**网盘**（同一份文件，挑一个打得开的）：

<div align="center">

[![OneDrive](https://img.shields.io/badge/OneDrive-0078D4?style=for-the-badge&logo=microsoftonedrive&logoColor=white)](https://1drv.ms/f/c/b2c0d7744e9876a7/IgC9Q1_GvXwIQp5IBeGCS_BuAXY-1ZHx1t6pYLS1RNN1ZUc?e=EtPhdu)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/drive/folders/1j9yLswHUpb92_MnlfrdbN2fuZFybJrnx?usp=sharing)
[![Dropbox](https://img.shields.io/badge/Dropbox-0061FF?style=for-the-badge&logo=dropbox&logoColor=white)](https://www.dropbox.com/scl/fo/y9qakmyil0rafk2bmup9m/AFHY-os6APdT555OFZ3UNW8?rlkey=grg3e4v2rteys0j729sy43bry&st=cmwm5bp5&dl=0)

[![Proton Drive](https://img.shields.io/badge/Proton%20Drive-6D4AFF?style=for-the-badge&logo=proton&logoColor=white)](https://drive.proton.me/urls/EY88C0MZ7G#96gfYMtKmdnk)
[![pCloud](https://img.shields.io/badge/pCloud-0FADED?style=for-the-badge&logo=pcloud&logoColor=white)](https://u.pcloud.link/publink/show?code=kZigGjJZpkS0XqHtLIXUanaC5dOzm81zMLq7)
[![MEGA](https://img.shields.io/badge/MEGA-D9272E?style=for-the-badge&logo=mega&logoColor=white)](https://mega.nz/folder/tZVQWL5I#5f9r7yX_TFi5jr3VV7x5mQ)

</div>

**GitHub 发布**（每次发版由 CI 构建，带校验值）：

| 你想要 | 下载 |
| --- | --- |
| 浏览器扩展（Chrome / Edge） | **[PickCat-WinUI3-extension.zip](https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip)** |
| Windows 桌面版 | **[Releases](https://github.com/ttummc/pickcat-winui3/releases/latest)** 里的 `PickCatWinUI3-Setup-*.msi` |
| 历史版本 | [`releases/`](releases) 目录，或 [全部 Release](https://github.com/ttummc/pickcat-winui3/releases) |

> 网盘里放的是同样的文件；核对来源时以 Release 页面的 SHA-256 为准。

<div align="center">

<img src="docs/promo/pickcat-promo.png" alt="PickCat WinUI 3" width="880">

</div>

## 两种用法

| | 是什么 | 怎么装 |
| --- | --- | --- |
| **浏览器扩展** | 在 Chrome / Edge 里替换掉 `pickcat.dao3.fun` 的界面 | 解压 → 加载已解压的扩展程序 |
| **Windows 桌面版** | 真正的桌面窗口（WinUI 3 + WebView2），不用开浏览器 | 双击 `PickCatWinUI3-Setup-*.msi` |

桌面版约 68 MB，不需要管理员权限，开始菜单有条目，可在「设置 → 应用」里卸载。
系统要求 Windows 10/11 x64。

## 它和原站有什么不同

<table>
<tr>
<td width="50%" valign="top">

**🪟 真的控件，不是仿制**

标题栏、导航栏、右键菜单、对话框、消息提示、进度条都是控件实现的，
焦点、悬停、按压状态齐全。

**🎞 页面切换有方向**

进入下一层从右滑入，返回反向退出，同级切换淡入；列表逐条上浮，
卡片按压会轻微缩回。

</td>
<td width="50%" valign="top">

**🖱 右键菜单全接管**

卡片操作、复制选中文字、打开选中文字里的链接、复制链接地址、
回到顶部、刷新 —— 空白处也有菜单。

**🔐 登录走官方页面**

登录表单完整保留原站，滑块验证在官方页面完成，我们不碰密码。

</td>
</tr>
<tr>
<td valign="top">

**🎨 浅色 / 深色 / 跟随系统**

四套强调色，标题栏与界面同步切换。

</td>
<td valign="top">

**🛡 不收集任何数据**

所有请求都发往 `pickcat.dao3.fun`，本地只保存主题和强调色两项偏好。

</td>
</tr>
</table>

## 安装

### 浏览器扩展（五分钟）

1. 下载 `PickCat-WinUI3-extension.zip`，解压到一个**长期保留**的目录，
   例如 `C:\Users\<你的用户名>\PickCatWinUI3`
2. 打开 `chrome://extensions`（Edge 用 `edge://extensions`），打开右上角**开发者模式**
3. 点 **加载已解压的扩展程序**，选择第 1 步那个文件夹（里面能看到 `manifest.json`）
4. 打开 <https://pickcat.dao3.fun/>

> **不要放在 `C:\Program Files`** —— 受保护目录，Chrome 会报
> `rules.json: Internal error while parsing rules`。也不要放 `Downloads` 或同步盘。

### Windows 桌面版

从 [Releases](https://github.com/ttummc/pickcat-winui3/releases/latest) 下载
`PickCatWinUI3-Setup-*.msi` 双击安装。安装包未签名，SmartScreen 提示时选
「更多信息 → 仍要运行」。

## 已经重写的页面

首页 · 论坛 · 分类 · 帖子详情 · 发帖编辑器 · 作品列表 · 作品详情（内嵌播放器）·
个人主页 · 通知 · 搜索 · 个人图盘 · 个人作品库 · 设置

未重建的页面（注册、找回密码、圈子、创作、入站考试、审核）会给一个
「在原站打开」的按钮，不会假装它们存在。

## 从源码构建

```bash
npm install

# 扩展
npx vite build            # 产物在 extension/dist，可直接当扩展加载

# 桌面版（需要 .NET 10 SDK）
dotnet publish desktop/PickCat.WinUI3/PickCat.WinUI3.csproj \
  -c Release -r win-x64 --self-contained -o desktop/publish
```

发版（构建 + 同步安装目录 + 打包 + MSI + 归档 + 打 tag）：

```powershell
powershell -File tools\release.ps1 -Version 1.2.0
```

## 技术细节

<details>
<summary><b>用到的 WinUI 控件</b></summary>

`TitleBar` `NavigationView` `SelectorBar` `Button` `TextBox` `InfoBar`
`ContentDialog` `ProgressBar` `ProgressRing` `InfoBadge` `PersonPicture`
`SettingsCard` `Expander` `ToolTip` `MenuFlyout` `PipsPager` `FontIcon`

</details>

<details>
<summary><b>目录结构</b></summary>

```
extension/         Chrome 扩展（Vue 3 + WinUIonWeb）
  src/pages/       各页面
  src/components/  共用组件
  public/          manifest / background
site/              官网（早期版本，现用 docs/index.html 单文件）
docs/              GitHub Pages 站点 + 截图 + 文档
releases/          每个版本的扩展压缩包
desktop/           WinUI 3 桌面版
installer/         WiX 安装包定义
tools/             构建、验证、录屏脚本
```

</details>

<details>
<summary><b>踩过的坑</b></summary>

- **WebView2 里没有 `chrome.runtime`**：content script 直接崩，窗口全白。现在所有
  `chrome.*` 调用都有存在性判断
- **`AddScriptToExecuteOnDocumentCreatedAsync` 在所有 frame 执行**：播放器 iframe 里
  也会挂一份我们的 UI。用 `window.top !== window.self` 挡住
- **全屏元素不能在 DOM 里移动**：移动会让浏览器立刻退出全屏，表现是「闪一下」
- **页面的 `transform` 会让 `position: fixed` 失效**：它相对那个祖先定位，而不是视口
- **上传要 `Idempotency-Key` + `ownership=PERSONAL`**：否则 400
- **`/topics` 只接受 `sort=latest|relevance`**：「活跃」只能前端算

</details>

## 相关链接

- 官网：<https://ttummc.github.io/pickcat-winui3/>
- 更新日志：[CHANGELOG.md](CHANGELOG.md)
- 历史版本：[releases/](releases)
- 隐私说明：[PRIVACY.md](PRIVACY.md)

## 声明

非官方作品，与 PickCat 官方无关。只在 `pickcat.dao3.fun` 生效，停用扩展后原站界面
立刻恢复。代码以 GPL-3.0 发布；使用的 UI 库
[WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb) 同样是 GPL-3.0。

<sub>English: an unofficial WinUI 3 restyle of the PickCat community, shipped as a Chrome
extension and a Windows desktop app. Downloads are listed at the top.</sub>
