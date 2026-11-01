# 安装说明

[English](INSTALL.md) · **简体中文**

这份说明按 Chrome 对「加载已解压的扩展程序」的要求来写：扩展会**一直读取磁盘上的这个文件夹**，
所以文件夹放哪、选哪一层，是最容易出错的两件事，请从上往下照着做。

---

## 1. 系统要求

| | |
| --- | --- |
| 浏览器 | Chrome 111+ 或 Edge 111+（任何仍支持「加载已解压」的 Chromium 浏览器） |
| 系统 | Windows 10/11、macOS 11+、Linux |
| 磁盘 | 约 6 MB |
| 账号 | 浏览不需要。登录只用于发帖、看通知、进个人图盘 |

浏览器版本在 `chrome://version` 查看。**低于 111 请先升级** —— 扩展用到了 `MAIN` world 的
内容脚本，旧版本不支持。

---

## 2. 文件夹放哪里

**放在你自己的用户文件夹里。** 扩展每次打开页面都会从这个位置读文件，所以它必须
**位置固定**、**有读权限**。

✅ **推荐（Windows）**

```
C:\Users\<你的用户名>\PickCatWinUI3
```

在文件资源管理器地址栏粘贴下面这行可以直达：

```
%USERPROFILE%
```

然后在里面新建一个 `PickCatWinUI3` 文件夹。

✅ **也可以用**

- `D:\Apps\PickCatWinUI3`（任何你有权限的盘符路径）
- `~/Applications/PickCatWinUI3`（macOS）
- `~/PickCatWinUI3`（Linux）

❌ **不要放在这些地方**

| 位置 | 为什么不行 |
| --- | --- |
| `C:\Program Files\…` | 受保护目录。Chrome 读取规则文件会失败，并报一句误导性的 `rules.json: Internal error while parsing rules` |
| 「下载」文件夹 | 浏览器和清理软件会清空它，文件一消失扩展就静默失效 |
| 桌面 | 容易误删，且经常被同步 |
| OneDrive / 坚果云 / iCloud 同步目录 | 同步会锁文件、生成 `xxx (1).js` 副本，Chrome 拒绝加载「一直在变」的文件夹 |
| `%TEMP%` / `C:\Windows\…` | 会被自动清理，或浏览器根本读不到 |

> **已经解压到 `C:\Program Files` 了？** 剪切整个文件夹，粘贴到 `C:\Users\<你的用户名>\` 下，
> 再从新路径加载。**要剪切，不要复制** —— 否则旧的还在那里，很容易又选错。

---

## 3. 下载

下载最新版本：

**<https://github.com/ttummc/pickcat-winui3/releases/latest>**

点 `PickCat-WinUI3-extension.zip`（约 1.6 MB）。

---

## 4. 解压

右键 zip → **全部解压缩**（macOS 双击即可）。

会得到一个名为 `PickCat-WinUI3-extension` 的文件夹，内容如下：

```
PickCat-WinUI3-extension\
├── manifest.json      ← 必须在这一层
├── content.js
├── content.css
├── bridge.js
├── rules.json
└── icons\
    └── pickcat.png
```

把它移到第 2 步选好的位置，想改名成 `PickCatWinUI3` 也可以。**名字无所谓，
`manifest.json` 在它里面直接可见才是关键。**

### 加载前先自检

打开这个文件夹，你应该**直接看见** `manifest.json`，旁边就是 `content.js`。
如果打开后只看到一个文件夹（要点进去才有 `manifest.json`），说明解压多套了一层 ——
点进去，用里面那一层。

---

## 5. 加载到 Chrome

1. 地址栏输入 `chrome://extensions`（Edge 用 `edge://extensions`）
2. 打开 **开发者模式** —— Chrome 在右上角开关，Edge 在左侧栏
3. 点 **加载已解压的扩展程序**（Chrome 在左上角）
4. 选中 `PickCatWinUI3` 文件夹 —— 也就是**含 `manifest.json` 的那一层** —— 确定

列表里会出现 **PickCat WinUI 3（非官方重制）**，开关是打开的。

> macOS 上按钮同样叫 **Load unpacked**，选文件夹本身，不要选里面某个文件。

### 如果 Chrome 报错

| 提示 | 原因 | 解决 |
| --- | --- | --- |
| `rules.json: Internal error while parsing rules` | 文件夹在受保护位置（`C:\Program Files`、`C:\Windows`），或 Chrome 读不到 | 按第 2 步把文件夹移到用户目录，重新加载 |
| `Manifest file is missing or unreadable` | 选中的是 zip，或选错了一层目录 | 选中**直接包含** `manifest.json` 的文件夹 |
| `Could not load background script` / 文件读取失败 | 文件被删除、改名，或在同步中 | 重新解压，放到稳定目录再加载 |
| 能加载但卡片上有「错误」 | 通常是旧构建 | 重新下载最新 release，然后在卡片上点 ↻ |

---

## 6. 验证是否生效

1. 打开 <https://pickcat.dao3.fun/> —— 应该看到带标题栏、左侧导航、信息流的
   Windows 11 风格界面
2. 如果还是原站，按 <kbd>Ctrl</kbd>+<kbd>R</kbd> 刷新
3. 仍是原站？确认扩展卡片是**已启用**状态，并确认当前标签页确实是 `pickcat.dao3.fun`
   （不是镜像站或其他域名）

扩展只在 `pickcat.dao3.fun` 生效，其他任何网站都不会有任何影响。

---

## 7. 可选：校验下载文件

每个版本都会在 zip 旁边发布 `SHA256SUMS.txt`。

Windows：

```powershell
certutil -hashfile PickCat-WinUI3-extension.zip SHA256
```

macOS / Linux：

```bash
shasum -a 256 PickCat-WinUI3-extension.zip
```

和 release 页面上 `SHA256SUMS.txt` 里的值对比。

---

## 8. 更新

1. 下载新版 zip 并解压
2. **删掉旧的** `PickCatWinUI3` 文件夹，把新的放到同一位置（或直接覆盖里面的文件）
3. 打开 `chrome://extensions`，在扩展卡片上点 ↻
4. 刷新页面

只替换文件而不点 ↻，Chrome 仍然跑旧构建 —— 这就是「明明更新了却还是老样子」的原因。

---

## 9. 关闭 / 卸载

- **临时关闭：** 在扩展卡片上关闭开关
- **彻底卸载：** `chrome://extensions` → PickCat WinUI 3 → **移除**
- **恢复原站：** 关闭或移除扩展后刷新 `pickcat.dao3.fun`，原站界面立刻回来 ——
  我们没有修改站点上的任何内容
- **完全清理：** 先卸载扩展，再删除文件夹

---

## 10. 首次使用说明

- 需要账号的页面（发帖、通知、个人图盘）会先要求登录，登录时会弹出阿里云滑块验证
- 尚未重建的页面（注册、找回密码、圈子、创建、入学考试、审核）会给出提示，
  并提供「在原站打开」按钮
- 扩展只在本地保存两项界面偏好，不读取 Cookie、不上传任何数据 —— 见 [PRIVACY.md](../PRIVACY.md)

---

## 还是装不上？

提 issue 时请附上：

1. 你的 Chrome 版本（`chrome://version` 第一行）
2. `chrome://extensions` 上的**完整报错原文**
3. 你加载文件夹的**完整路径**
