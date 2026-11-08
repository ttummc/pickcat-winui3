import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

/**
 * 上下文文件生成模块。
 *
 * 生成三类文件：
 * - AGENTS.md      开发规范总纲（模板 + 检测到的真实路径/版本）
 * - components.json WinUIonWeb 组件与 props 清单
 * - pages.md       现有页面与路由对照
 *
 * 写入策略：默认只补缺失文件，绝不覆盖用户已有内容。
 */

const COMPONENTS_NOTE =
  'Props use XAML casing exactly as declared (IsOpen, CornerRadius, Content). ' +
  'Events are Vue emits; bind with @Click / @update:IsOpen.'

const catalogCache = new Map()

function readText(path) {
  try {
    return readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  } catch {
    return null
  }
}

function readJson(path) {
  const text = readText(path)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * 解析单个 .vue.d.ts，取出 props 与事件名。
 *
 * props 位于默认导出的 ExtractPropTypes<{ ... }> 中，花括号是嵌套的，
 * 因此先做括号配平截取子串，再在子串上逐行匹配，不能用非贪婪正则。
 * @param {string} file
 * @returns {{ name: string, props: string[], events: string[] }}
 */
export function parseComponentFile(file) {
  const text = readText(file) ?? ''
  const name = file.split(/[\\/]/).pop().replace('.vue.d.ts', '')
  const props = []

  const start = text.indexOf('ExtractPropTypes<{')
  if (start >= 0) {
    let depth = 0
    let from = text.indexOf('{', start)
    let end = from
    for (let index = from; index < text.length; index += 1) {
      if (text[index] === '{') depth += 1
      else if (text[index] === '}') {
        depth -= 1
        if (depth === 0) {
          end = index
          break
        }
      }
    }
    const body = text.slice(from + 1, end)
    for (const match of body.matchAll(/^\s+([A-Za-z_$][\w$]*):\s*\{/gm)) {
      if (!props.includes(match[1])) props.push(match[1])
    }
  }

  // Vue 的 emits 在生成的 d.ts 里表现为 onClick?: / onUpdate:IsOpen?: 这样的 prop。
  const events = []
  for (const match of text.matchAll(/\bon([A-Z][A-Za-z0-9]*(?::[A-Za-z0-9]+)?)"?\s*\??\s*:/g)) {
    const raw = match[1]
    if (raw.startsWith('Vnode')) continue
    const event = raw.startsWith('Update:') ? `update:${raw.slice('Update:'.length)}` : raw
    if (!events.includes(event)) events.push(event)
  }

  return { name, props, events }
}

/**
 * 从 node_modules/winuionweb 生成组件清单。
 * @param {string} packageDir winuionweb 包目录
 * @returns {object}
 */
export function buildComponentsCatalog(packageDir) {
  const cacheKey = packageDir.toLowerCase()
  const cached = catalogCache.get(cacheKey)
  if (cached !== undefined) return cached

  const componentDir = join(packageDir, 'dist-lib', 'types', 'components')
  let names = []
  try {
    names = readdirSync(componentDir).filter((entry) => entry.endsWith('.vue.d.ts'))
  } catch {
    names = []
  }

  const components = names
    .map((entry) => parseComponentFile(join(componentDir, entry)))
    .filter((entry) => entry.props.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name))

  const pkg = readJson(join(packageDir, 'package.json'))
  const catalog = {
    package: 'winuionweb',
    version: typeof pkg?.version === 'string' ? pkg.version : null,
    generatedAt: new Date().toISOString(),
    note: COMPONENTS_NOTE,
    count: components.length,
    components,
  }
  catalogCache.set(cacheKey, catalog)
  return catalog
}

/**
 * 从仓库中找出 winuionweb 的实际安装目录。
 * @param {string} repoPath
 * @returns {string | null}
 */
export function findWinuionwebPackage(repoPath) {
  for (const candidate of [
    join(repoPath, 'node_modules', 'winuionweb'),
    join(repoPath, 'extension', 'node_modules', 'winuionweb'),
  ]) {
    if (existsSync(join(candidate, 'dist-lib', 'types', 'components'))) return candidate
  }
  return null
}

function parseRouteNames(routerText) {
  const section = /export type RouteName =([\s\S]*?)\nexport interface Route/.exec(routerText)
  if (section === null) return []
  const names = []
  for (const match of section[1].matchAll(/'([A-Za-z0-9_-]+)'/g)) {
    if (!names.includes(match[1])) names.push(match[1])
  }
  return names
}

function parsePatterns(routerText) {
  const patterns = new Map()
  for (const match of routerText.matchAll(/\{\s*name:\s*'([^']+)',\s*segments:\s*\[([^\]]*)\]\s*,?\s*\}/g)) {
    const segments = []
    for (const segment of match[2].matchAll(/'([^']*)'/g)) segments.push(segment[1])
    const list = patterns.get(match[1]) ?? []
    list.push(segments)
    patterns.set(match[1], list)
  }
  return patterns
}

function parseDepth(routerText) {
  const section = /const DEPTH: Record<RouteName, number> = \{([\s\S]*?)\n\}/.exec(routerText)
  const depths = new Map()
  if (section === null) return depths
  for (const match of section[1].matchAll(/([A-Za-z0-9_]+):\s*(\d+)/g)) {
    depths.set(match[1], Number(match[2]))
  }
  return depths
}

function parsePages(appText) {
  const section = /const PAGES = \{([\s\S]*?)\n\}/.exec(appText)
  const pages = new Map()
  const imports = new Map()

  for (const match of appText.matchAll(/import\s+(\w+)\s+from\s+['"]\.\/pages\/([^'"]+)\.vue['"]/g)) {
    imports.set(match[1], `src/pages/${match[2]}.vue`)
  }
  if (section !== null) {
    for (const match of section[1].matchAll(/([A-Za-z0-9_]+):\s*([A-Za-z0-9_]+)\s*,/g)) {
      pages.set(match[1], imports.get(match[2]) ?? null)
    }
  }
  return pages
}

function routePath(segments) {
  return segments.length === 0 ? '/' : `/${segments.join('/')}`
}

/**
 * 从仓库生成 pages.md。
 * @param {string} repoPath
 * @returns {string}
 */
export function buildPagesDoc(repoPath) {
  const routerPath = join(repoPath, 'extension', 'src', 'router.ts')
  const appPath = join(repoPath, 'extension', 'src', 'App.vue')
  const routerText = readText(routerPath) ?? ''
  const appText = readText(appPath) ?? ''

  const names = parseRouteNames(routerText)
  const patterns = parsePatterns(routerText)
  const depths = parseDepth(routerText)
  const pages = parsePages(appText)

  const rows = names.map((name) => {
    const paths = (patterns.get(name) ?? []).map(routePath)
    const path = paths.length === 0 ? '—' : paths.join('<br>')
    const depth = depths.has(name) ? String(depths.get(name)) : '—'
    const page = pages.get(name)
    const pageText = typeof page === 'string' ? `\`${page}\`` : '—'
    return `| \`${name}\` | ${path} | ${depth} | ${pageText} |`
  })

  return [
    '# 现有页面与路由',
    '',
    `> 由 @pickcat/dsh-plugin 从 \`${repoPath}\` 生成于 ${new Date().toLocaleString('zh-CN', { hour12: false })}。`,
    '> 路由是手写的，新增页面要同步 `RouteName` 联合类型、`PATTERNS`、`PAGES` 三处。',
    '',
    '| 路由名 | 路径 | 层级 | 页面文件 |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

/**
 * 渲染系统提示里的 PickCat 上下文块。
 * 未检测到 PickCat 时返回空串，避免污染普通会话。
 * @param {object} status detectPickCat() 的结果
 * @returns {string}
 */
export function renderPromptSection(status) {
  if (status?.detected !== true) return ''

  const lines = ['## PickCat WinUI 3']
  if (status.installed?.found) {
    const version = status.installed.version ?? '未知版本'
    const kernel = status.installed.hasKernel ? '（旧版内置 DSH 内核仍存在）' : ''
    lines.push(`- 已安装桌面版：${version}，路径 \`${status.installed.path}\`${kernel}`)
  } else {
    lines.push('- 已安装桌面版：未检测到')
  }

  if (status.repo?.found) {
    lines.push(`- 源码仓库：\`${status.repo.path}\``)
    lines.push('- 仓库根目录有插件生成的 `AGENTS.md`、`components.json`、`pages.md`。')
    lines.push('- 改 PickCat 前先读 `AGENTS.md`；写 WinUIonWeb 组件前先查 `components.json` 核对 props 与事件名；新增页面前查 `pages.md`。')
    lines.push('- 前端界面只能使用 `winuionweb`，属性用 XAML 大小写，事件用 PascalCase。')
  } else {
    lines.push('- 源码仓库：未找到')
    lines.push('- 只有安装版时无法修改代码。用户要求改 PickCat 功能时，明确说明只能解释现有行为，不要编造文件路径或假装改过代码。')
  }

  lines.push('- 需要本机 PickCat 的完整状态时，调用 `pickcat_status` 工具。')
  return lines.join('\n')
}

/**
 * 渲染 AGENTS.md。
 * @param {object} status
 * @param {string} presetDir assets 目录
 * @returns {string}
 */
export function renderAgentsMd(status, presetDir) {
  const templateName = status?.repo?.found ? 'AGENTS.md.tpl' : 'AGENTS.installed.md.tpl'
  const template = readText(join(presetDir, templateName))
  if (template === null) {
    return [
      '# PickCat WinUI 3 —— 开发规范',
      '',
      '插件模板缺失，请重新安装 @pickcat/dsh-plugin。',
      '',
    ].join('\n')
  }

  const values = {
    GENERATED_AT: new Date().toLocaleString('zh-CN', { hour12: false }),
    INSTALL_PATH: status?.installed?.found ? status.installed.path : '未检测到',
    INSTALL_VERSION: status?.installed?.found ? status.installed.version ?? '未知版本' : '未检测到',
    INSTALL_KERNEL: status?.installed?.found
      ? status.installed.hasKernel
        ? '存在'
        : '不存在'
      : '—',
    REPO_PATH: status?.repo?.found ? status.repo.path : '未检测到',
    EXTENSION_VERSION: status?.repo?.found ? status.repo.extensionVersion ?? '未知' : '未知',
    WINUIONWEB_SPEC: status?.repo?.found ? status.repo.winuionweb ?? 'winuionweb' : 'winuionweb',
  }

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key) => values[key] ?? '')
}

/**
 * 检查工作区里三个上下文文件的状态。
 * @param {string} dir
 * @returns {{ name: string, path: string, exists: boolean, bytes: number | null }[]}
 */
export function inspectContextFiles(dir) {
  if (typeof dir !== 'string' || dir.length === 0) return []
  return ['AGENTS.md', 'components.json', 'pages.md'].map((name) => {
    const path = join(dir, name)
    try {
      const info = statSync(path)
      return { name, path, exists: info.isFile(), bytes: info.size }
    } catch {
      return { name, path, exists: false, bytes: null }
    }
  })
}

async function writeIfMissing(path, content, force) {
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(path, content, { encoding: 'utf8', flag: force ? 'w' : 'wx' })
    return { path, action: 'written' }
  } catch (error) {
    if (error?.code === 'EEXIST') return { path, action: 'exists' }
    return { path, action: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}

function presetPath(presetDir, name) {
  return join(presetDir, 'assets', name)
}

/**
 * 确保工作区根目录存在三个上下文文件。
 * 默认不覆盖已有文件；force 只在显式调用时使用。
 * @param {{ dir: string, status: object, presetDir: string, force?: boolean }} options
 * @returns {Promise<{ path: string, action: string, error?: string }[]>}
 */
export async function ensureWorkspaceFiles(options) {
  const { dir, status, presetDir } = options
  const force = options.force === true
  const results = []

  const agents = renderAgentsMd(status, join(presetDir, 'assets'))
  results.push(await writeIfMissing(join(dir, 'AGENTS.md'), agents, force))

  let components
  const packageDir = status?.repo?.found ? findWinuionwebPackage(status.repo.path) : null
  if (packageDir !== null) {
    components = JSON.stringify(buildComponentsCatalog(packageDir), null, 1)
  } else {
    components = readText(presetPath(presetDir, 'components.json'))
    if (components === null) {
      components = JSON.stringify({
        package: 'winuionweb',
        version: null,
        note: COMPONENTS_NOTE,
        count: 0,
        components: [],
      }, null, 1)
    }
  }
  results.push(await writeIfMissing(join(dir, 'components.json'), components, force))

  let pages
  if (status?.repo?.found) {
    pages = buildPagesDoc(status.repo.path)
  } else {
    pages = readText(presetPath(presetDir, 'pages.md'))
    if (pages === null) {
      pages = '# 现有页面与路由\n\n未找到 PickCat 源码仓库，无法生成页面索引。\n'
    }
  }
  results.push(await writeIfMissing(join(dir, 'pages.md'), pages, force))

  return results
}

/**
 * 生成一段给人和模型看的状态摘要。
 * @param {object} status
 * @param {{ name: string, path: string, exists: boolean, bytes: number | null }[]} [contextFiles]
 * @returns {string}
 */
export function renderStatusSummary(status, contextFiles = []) {
  const lines = []
  if (status?.detected !== true) {
    lines.push('未检测到 PickCat WinUI 3（既没有安装版，也没有源码仓库）。')
    lines.push('可在 DSH 设置中填写安装目录或源码仓库路径。')
    return lines.join('\n')
  }

  lines.push(`PickCat 桌面版：${status.installed?.found ? status.installed.version ?? '未知版本' : '未检测到'}`)
  if (status.installed?.found) {
    lines.push(`安装目录：${status.installed.path}`)
    lines.push(`旧版内置内核：${status.installed.hasKernel ? '存在' : '不存在'}`)
  }
  lines.push(`源码仓库：${status.repo?.found ? status.repo.path : '未找到'}`)
  if (status.repo?.found) {
    lines.push(`扩展版本：${status.repo.extensionVersion ?? '未知'}`)
    lines.push(`winuionweb：${status.repo.winuionweb ?? '未知'}`)
    lines.push(`可修改源码：是`)
  } else {
    lines.push('可修改源码：否（只有安装版，只能解释现有行为）')
  }

  if (contextFiles.length > 0) {
    lines.push('工作区上下文文件：')
    for (const file of contextFiles) {
      lines.push(`- ${file.name}：${file.exists ? `已存在（${file.bytes} 字节）` : '缺失'}`)
    }
  }
  if (status.notes?.length > 0) {
    lines.push(`提示：${status.notes.join('；')}`)
  }
  return lines.join('\n')
}

export { COMPONENTS_NOTE }
