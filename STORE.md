# 发布说明 / Store listing

## ⚠️ 提交应用商店前必读

本扩展**当前形态**不适合直接提交 Chrome 应用商店，有三个硬伤：

| 问题 | 说明 | 处理方式 |
| --- | --- | --- |
| **远程代码** | 登录时从 `o.alicdn.com` 动态加载 `AliyunCaptcha.js` 并执行。MV3 的「Remote code」政策明令禁止。 | 改为不加载第三方脚本：把登录交回原站（下面有方案），或直接去掉扩展内登录、只提示"请先在原站登录一次"。 |
| **替换他站界面** | 用 `declarativeNetRequest` 屏蔽 `pickcat.dao3.fun` 的 `/_nuxt/` 资源并替换 UI。审核可能判为 *Deceptive behavior* / 冒充官方。 | 命名与描述里必须明确"非官方"；准备「它是做什么的、为什么需要拦截」的说明。仍有被拒可能。 |
| **商标/授权** | 名称含 `PickCat`。 | 需确认站点方允许；否则建议改名为中性名称，描述里说明"用于 pickcat.dao3.fun"。 |

**推荐路径：先不上商店。**

- GitHub Releases 发布 `PickCat-WinUI3-extension.zip` + 加载说明（用户手动「加载已解压的扩展程序」）
- 企业/个人自建分发：Windows 组策略 `ExtensionInstallForcelist`（需自签 CRX）
- 这样没有审核周期、没有账号风险，而且 GPL-3.0 本来就要求源码公开

---

## 商店文案（若要提交，可直接复制）

**名称（≤45 字符）**

```
PickCat WinUI 3（非官方重制）
```

**简短说明（≤132 字符）**

```
用 WinUI 3 控件从零重绘 pickcat.dao3.fun 的界面：窗口、导航、右键菜单、Markdown 编辑器全部重写。非官方，与站点方无关。
```

**详细说明**

```
把 PickCat 社区客户端重做成一个 Windows 11 风格的应用。

· 真实 WinUI 3 控件：TitleBar、NavigationView、SelectorBar、SettingsCard、ContentDialog、MenuFlyout、PipsPager、Expander…
· 页面过渡：进入下一层从右滑入、返回反向滑出，列表逐条上浮
· 右键菜单全接管：卡片操作、复制选中文字、页面操作
· 浅色 / 深色 / 跟随系统，四套强调色
· 13 个页面：首页、论坛、分类、帖子详情、发帖、作品、作品详情、个人主页、通知、搜索、个人图盘、个人作品库、设置

仅作用于 pickcat.dao3.fun。不收集任何数据，不注入广告，不与第三方共享。
本项目是非官方粉丝实现，与 PickCat 官方无关。

源码（GPL-3.0）：<仓库地址>
```

**类别**：社交与通讯 / Social & Communication

**权限说明（审核会逐条问）**

- `host_permissions: https://pickcat.dao3.fun/*`
  > 仅在该站点注入替换界面并调用其公开接口；不含其他域名。
- `declarativeNetRequest`
  > 阻止该站点自带的 `/_nuxt/` 前端资源，避免原界面与重写界面同时渲染互相冲突。规则文件 `rules.json` 只包含一条、只匹配 `pickcat.dao3.fun/_nuxt/`，不上报任何数据。

**单项用途说明（Single purpose）**

> 把 pickcat.dao3.fun 的网页界面替换为 WinUI 3 风格界面。

---

## 素材清单

| 用途 | 尺寸 | 文件 |
| --- | --- | --- |
| 扩展图标 | 128×128 | `extension/public/icons/pickcat.png` |
| 商店小图 | 440×280 | `docs/store/tile-440x280.png` |
| 商店横幅 | 1400×560 | `docs/store/marquee-1400x560.png` |
| 截图 | 1280×800 ×5 | `docs/store/screenshot-1..5.png` |
| 宣传图 | 1920×1080 | `docs/promo/pickcat-promo.png` |
| 宣传片 | 1440×900 MP4 | `docs/promo/pickcat-promo.mp4` |

---

## 提交前自检

- [ ] `LICENSE`（GPL-3.0）与 `THIRD_PARTY_NOTICES.md` 随源码公开
- [ ] 去掉运行时加载第三方脚本（远程代码风险）
- [ ] `manifest.json` 的 `description` ≤132 字符、`version` 为 `1.0.0`
- [ ] 隐私政策 URL 可公开访问（`PRIVACY.md` 放到仓库 Pages）
- [ ] 开发者账号完成实名验证（$5 注册费）
- [ ] 提供测试账号给审核（站点需登录才能看通知/发帖）
