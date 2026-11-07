/**
 * Prints the release notes for one version: the matching CHANGELOG section plus a
 * fixed install block. release.ps1 pipes this into RELEASE_NOTES.md so the release
 * body and the changelog can never disagree.
 *
 * Usage: node tools/release-notes-for.mjs v1.1.4 > RELEASE_NOTES.md
 */
import fs from 'node:fs'

const version = process.argv[2]
if (!version) {
  console.error('usage: node tools/release-notes-for.mjs v1.2.3')
  process.exit(1)
}

const text = fs.readFileSync('CHANGELOG.md', 'utf8')
const lines = text.split('\n')
let inside = false
const body = []

for (const line of lines) {
  const heading = /^##\s+(v\d+\.\d+\.\d+)\s*$/.exec(line)
  if (heading) {
    if (inside) break
    inside = heading[1] === version
    continue
  }
  if (inside) body.push(line)
}

if (!body.length) {
  console.error(`CHANGELOG.md has no section for ${version}`)
  process.exit(1)
}

const install = `
## 安装

### 浏览器扩展

1. 下载 \`PickCat-WinUI3-extension.zip\` 并解压到固定目录
   （**不要**放在 \`C:\\Program Files\`，会报 \`rules.json: Internal error while parsing rules\`）
2. 打开 \`chrome://extensions\`，开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择解压出来的文件夹
4. 打开 <https://pickcat.dao3.fun/>

### Windows 桌面版

下载 \`PickCatWinUI3-Setup-*.msi\` 直接安装，不需要管理员权限，开始菜单会有条目，
可在「设置 → 应用」中卸载。

完整历史见 [CHANGELOG.md](https://github.com/ttummc/pickcat-winui3/blob/main/CHANGELOG.md)。

> 只在 \`pickcat.dao3.fun\` 生效。停用扩展后原站界面立刻恢复。
`

process.stdout.write(`${body.join('\n').trim()}\n${install}`)
