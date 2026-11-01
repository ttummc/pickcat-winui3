# 发布到 GitHub

仓库已经在本地初始化好：`main` 分支有一次提交，打了标签 `v1.0.0`，且**没有**包含构建产物
（`extension/dist/`、`PickCat-WinUI3-extension.zip` 都在 `.gitignore` 里，由 CI 生成）。

---

## 1. 在 GitHub 建一个空仓库

打开 <https://github.com/new>：

- 名字建议 `pickcat-winui3`
- **不要**勾选 "Add a README file" / "Add .gitignore" / 选 license（否则会和本地冲突）

---

## 2. 把 `ttummc/pickcat-winui3` 替换成你的真实地址

README 里的徽章和 Releases 链接目前是占位符。在仓库根目录执行（把两个变量改成你的）：

```powershell
$owner = "你的GitHub用户名"
$repo  = "pickcat-winui3"

foreach ($f in @("README.md", "STORE.md", "RELEASE_NOTES.md")) {
  (Get-Content $f -Raw).Replace("ttummc/pickcat-winui3", "$owner/$repo") |
    Set-Content $f -Encoding utf8
}
git add -A
git commit -m "chore: 填入仓库地址"
```

> 如果建仓库时用了别的名字，记得同步改 `$repo`。

---

## 3. 推送

```powershell
git remote add origin https://github.com/你的用户名/pickcat-winui3.git
git push -u origin main
git push origin v1.0.0
```

推送 `v1.0.0` 标签会触发 GitHub Actions：

1. `npm ci` → `npm run ext:build`
2. 把 `extension/dist` 打包成 `PickCat-WinUI3-extension.zip`
3. 自动创建一个 **Release**，附上 zip，正文取 `RELEASE_NOTES.md`

去 <https://github.com/你的用户名/pickcat-winui3/actions> 看进度，绿了之后
<https://github.com/你的用户名/pickcat-winui3/releases> 就有下载链接了。

> 第一次跑 CI 可能失败在 `npm ci`（本地文件依赖 `vendor/winuionweb-0.2.0.tgz`）。
> 这个 tgz 已经提交进仓库了，正常不会出问题；如果报错把日志贴我。

---

## 4. 仓库设置建议

| 项 | 建议值 |
| --- | --- |
| Description | 用 WinUI 3 控件重写的 PickCat 客户端（非官方） |
| Topics | `winui3` `vue3` `chrome-extension` `pickcat` `fluent-design` |
| Website | 留空，或指向你的 Releases |
| License | GitHub 会自动识别 `LICENSE` 为 GPL-3.0 |

在 **Settings → General → Social preview** 上传 `docs/store/marquee-1400x560.png` 当仓库封面。

---

## 5. 发布后检查

- [ ] Release 页面能下到 zip，解压后有 `manifest.json` / `content.js` / `content.css` / `bridge.js` / `rules.json` / `icons/`
- [ ] README 的徽章能亮（绿）
- [ ] 从 Release 下载 → 加载已解压 → 打开 <https://pickcat.dao3.fun/> 正常出界面

---

## 关于商店

先不上。真要提交时看 [STORE.md](STORE.md)，里面列了三处会被审核卡住的地方
（运行时加载第三方脚本、替换他站界面、名称含商标）以及对应的改法。
