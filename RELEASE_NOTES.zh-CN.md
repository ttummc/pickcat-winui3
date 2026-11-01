# v1.0.0

[English](RELEASE_NOTES.md) · **简体中文**

第一个可用版本：把 [PickCat](https://pickcat.dao3.fun/) 的网页界面整个换掉，重写成 Windows 11 风格的应用。

## 安装

1. 下载 [PickCat-WinUI3-extension.zip](https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip) 并解压到固定目录（**不要**放在会被清理的临时目录）
2. Chrome 打开 `chrome://extensions`
3. 右上角开启「开发者模式」
4. 点「加载已解压的扩展程序」，选择解压出来的目录（含 `manifest.json` 那一层）
5. 打开 <https://pickcat.dao3.fun/> —— 已经是新界面

> 只在 `pickcat.dao3.fun` 生效。关掉扩展即恢复原站。

## 这个版本有什么

- **原生 WinUI 控件**：`TitleBar`、`NavigationView`、`SelectorBar`、`SettingsCard`、`ContentDialog`、`MenuFlyout`、`PipsPager`、`Expander`、`PersonPicture`、`InfoBar`、`ProgressRing`…
- **页面过渡**：进入下一层从右滑入、返回反向退出、同级淡入；列表逐条上浮
- **右键菜单全接管**：卡片操作 / 复制选中文字 / 页面操作（含空白处）
- **Markdown 编辑器**：工具栏 + 快捷键（Ctrl+B/I/E/K）+ 实时预览 + 字数统计
- **主题**：浅色 / 深色 / 跟随系统，四套强调色
- **13 个页面**：首页、论坛、分类、帖子详情、发帖、作品、作品详情、个人主页、通知、搜索、个人图盘、个人作品库、设置

## 已知限制

- 需要登录的页面（发帖、通知、图盘）必须先登录；登录会弹出阿里云滑块
- 未重做的页面（注册、找回密码、圈子、创作、入站考试、管理后台）会显示「这个页面还没重做」，并提供「在原站打开」
- 登录态、数据全部来自官方接口，本扩展不存储任何用户数据

## 许可

GPL-3.0。界面控件来自 [WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb)（GPL-3.0）。

本项目是非官方粉丝实现，与 PickCat 官方无关。
