/**
 * Mirrors every released extension zip into releases/<version>/.
 *
 * Downloads straight from the release assets (no API calls, so no rate limit) and
 * writes releases/README.md with sizes and checksums.
 *
 * Usage: node tools/collect-releases.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const REPO = 'ttummc/pickcat-winui3'
const OUT = 'releases'
const ASSET = 'PickCat-WinUI3-extension.zip'

/** Versions come from git tags — that is what was actually published. */
function versions() {
  const tags = []
  const packed = path.join('.git', 'packed-refs')
  if (fs.existsSync(packed)) {
    for (const line of fs.readFileSync(packed, 'utf8').split('\n')) {
      if (line.includes('refs/tags/v')) tags.push(line.split('refs/tags/')[1].trim())
    }
  }

  // plus loose refs, in case packed-refs is stale
  const looseDir = path.join('.git', 'refs', 'tags')
  if (fs.existsSync(looseDir)) {
    for (const name of fs.readdirSync(looseDir)) tags.push(name)
  }

  const unique = [...new Set(tags)].filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
  return unique.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

async function download(version) {
  const url = `https://github.com/${REPO}/releases/download/${version}/${ASSET}`
  const dest = path.join(OUT, version, ASSET)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return { skipped: true, dest }

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return { error: `${res.status}`, url }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
  return { dest, size: buffer.length }
}

const list = versions()
console.log(`versions: ${list.join(', ')}`)

const rows = []
for (const version of list) {
  const result = await download(version)
  if (result.error) {
    console.log(`  ${version}: ${result.error} (${result.url})`)
    rows.push({ version, size: null, sha: null, error: result.error })
    continue
  }
  const buffer = fs.readFileSync(result.dest)
  const sha = crypto.createHash('sha256').update(buffer).digest('hex')
  console.log(`  ${version}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB${result.skipped ? ' (cached)' : ''}`)
  rows.push({ version, size: buffer.length, sha })
}

const lines = [
  '# 历史版本',
  '',
  '每个目录里是那次发布时的扩展压缩包，内容不会再变；用途是回到旧版本对比或临时降级。',
  '',
  '> 桌面版安装包（MSI）体积较大，没有放在仓库里，请到对应的 Release 页面下载。',
  '',
  '| 版本 | 大小 | SHA-256 |',
  '| --- | --- | --- |',
]
for (const row of rows) {
  if (row.error) {
    lines.push(`| ${row.version} | — | 未能在 Release 中找到 |`)
    continue
  }
  lines.push(
    `| ${row.version} | ${(row.size / 1024 / 1024).toFixed(2)} MB | \`${row.sha}\` |`,
  )
}
lines.push('')
lines.push('下载地址规律：`https://github.com/ttummc/pickcat-winui3/releases/download/<版本>/PickCat-WinUI3-extension.zip`')
lines.push('')

fs.writeFileSync(path.join(OUT, 'README.md'), lines.join('\n'))
console.log(`\nwrote ${OUT}/README.md`)
