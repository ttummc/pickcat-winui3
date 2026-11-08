import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { buildComponentsCatalog, buildPagesDoc, findWinuionwebPackage } from '../lib/context.js'

/**
 * 从 PickCat 源码仓库重新生成 components.json 与 pages.md。
 *
 * 用法：
 *   node scripts/build-context.mjs [仓库根目录] [--out 输出目录]
 *
 * 省略仓库根目录时默认取插件上一级（即 PickCat 仓库根目录）。
 * 生成结果写进 assets/，插件分发时作为预置内容使用。
 */

function parseArgs(argv) {
  const args = { repo: null, out: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--out' || arg === '-o') {
      args.out = argv[index + 1] ?? null
      index += 1
    } else if (!arg.startsWith('-') && args.repo === null) {
      args.repo = arg
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const repo = resolve(args.repo ?? join(import.meta.dirname, '..', '..'))
const outDir = resolve(args.out ?? join(import.meta.dirname, '..', 'assets'))

const packageDir = findWinuionwebPackage(repo)
if (packageDir === null) {
  console.error(`没有在 ${repo} 找到 node_modules/winuionweb，请先在仓库里 npm install。`)
  process.exit(1)
}

const catalog = buildComponentsCatalog(packageDir)
const pages = buildPagesDoc(repo)

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'components.json'), `${JSON.stringify(catalog, null, 1)}\n`, 'utf8')
writeFileSync(join(outDir, 'pages.md'), pages, 'utf8')

console.log(`components.json：${catalog.count} 个组件（winuionweb ${catalog.version ?? '未知版本'}）`)
console.log(`pages.md：${pages.split('\n').filter((line) => line.startsWith('| `')).length} 条路由`)
console.log(`输出目录：${outDir}`)
