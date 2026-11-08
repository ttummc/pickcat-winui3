import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * PickCat 检测模块。
 *
 * 设计分成两层：
 * - collectSnapshot()：负责所有文件系统 I/O，产出可序列化的候选清单；
 * - decidePickCat()：纯函数，只根据候选清单做决策，便于单测。
 *
 * detectPickCat() 把两层串起来，供插件运行时直接调用。
 */

const INSTALL_DIR_NAMES = ['PickCat WinUI 3', 'PickCat.WinUI3']

const REPO_ROOT_NAMES = [
  'PickCatButWinUI3OnWeb',
  'PickCat-WinUI3',
  'PickCatWinUI3OnWeb',
  'PickCat.WinUI3',
]

const KERNEL_RELATIVE = join('dsh', 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd')

function isDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

function normalizePath(path) {
  if (typeof path !== 'string') return ''
  const trimmed = path.trim().replace(/^"(.*)"$/, '$1')
  if (trimmed.length === 0) return ''
  return resolve(trimmed)
}

function samePath(left, right) {
  return normalizePath(left).toLowerCase() === normalizePath(right).toLowerCase()
}

/**
 * 从 PickCatWinUI3.deps.json 的 targets 中取出应用版本。
 * deps.json 里形如 "PickCatWinUI3/1.6.0": { ... }。
 * @param {string} text deps.json 内容
 * @returns {string | null}
 */
export function versionFromDeps(text) {
  if (typeof text !== 'string') return null
  const match = /"(?:PickCatWinUI3|PickCat\.WinUI3)\/([^"/]+)"/.exec(text)
  return match === null ? null : match[1]
}

/**
 * 判断一个目录是否是 PickCat 的安装目录。
 * 只要存在 exe、deps.json 或构建产物之一，就认为安装目录有效。
 * @param {string} dir
 * @returns {{ path: string, valid: boolean, version: string | null, hasKernel: boolean } | null}
 */
export function readInstallInfo(dir) {
  const path = normalizePath(dir)
  if (path.length === 0 || !isDirectory(path)) return null

  const exe = join(path, 'PickCatWinUI3.exe')
  const deps = join(path, 'PickCatWinUI3.deps.json')
  const content = join(path, 'Assets', 'content.js')
  const valid = existsSync(exe) || existsSync(deps) || existsSync(content)
  if (!valid) return null

  let version = null
  try {
    version = versionFromDeps(readFileSync(deps, 'utf8'))
  } catch {
    version = null
  }

  return {
    path,
    valid,
    version,
    hasKernel: existsSync(join(path, KERNEL_RELATIVE)),
  }
}

/**
 * 判断一个目录是否是 PickCat 源码仓库。
 * 判定条件：存在 extension/src，且根目录或 extension/package.json 依赖 winuionweb。
 * @param {string} dir
 * @returns {{ path: string, valid: boolean, extensionVersion: string | null, winuionweb: string | null } | null}
 */
export function readRepoInfo(dir) {
  const path = normalizePath(dir)
  if (path.length === 0 || !isDirectory(path)) return null
  if (!isDirectory(join(path, 'extension', 'src'))) return null

  let winuionweb = null
  for (const manifest of [join(path, 'package.json'), join(path, 'extension', 'package.json')]) {
    const json = readJson(manifest)
    const spec = json?.dependencies?.winuionweb ?? json?.devDependencies?.winuionweb
    if (typeof spec === 'string') {
      winuionweb = spec
      break
    }
  }
  if (winuionweb === null) return null

  const extensionManifest = readJson(join(path, 'extension', 'public', 'manifest.json'))
  const version = typeof extensionManifest?.version === 'string' ? extensionManifest.version : null

  return { path, valid: true, extensionVersion: version, winuionweb }
}

/**
 * 从某个目录向上找 PickCat 仓库根目录（.git 之外的判定仍以 extension/src + winuionweb 为准）。
 * @param {string} start 起始目录
 * @returns {string | null}
 */
export function repoRootForCwd(start) {
  let current = normalizePath(start)
  if (current.length === 0) return null

  for (;;) {
    if (readRepoInfo(current) !== null) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function pushUnique(list, candidate) {
  if (candidate === null || candidate === undefined) return
  const key = String(candidate.path ?? '').toLowerCase()
  if (key.length === 0) return
  if (list.some((item) => String(item.path).toLowerCase() === key)) return
  list.push(candidate)
}

function scanChildDirectories(base, predicate, source) {
  const found = []
  let entries
  try {
    entries = readdirSync(base, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (!predicate(entry.name)) continue
    found.push({ path: join(base, entry.name), source })
  }
  return found
}

/**
 * 采集检测所需的文件系统快照。
 * @param {{ env?: NodeJS.ProcessEnv, config?: { installPath?: string, repoPath?: string }, cwd?: string, platform?: string }} [options]
 * @returns {object} 可交给 decidePickCat() 的纯数据
 */
export function collectSnapshot(options = {}) {
  const env = options.env ?? process.env
  const config = options.config ?? {}
  const cwd = normalizePath(options.cwd ?? process.cwd())
  const platform = options.platform ?? process.platform

  const installCandidates = []
  const repoCandidates = []
  const searchedInstall = []
  const searchedRepo = []

  if (config.installPath && String(config.installPath).trim().length > 0) {
    const path = normalizePath(config.installPath)
    searchedInstall.push(path)
    const info = readInstallInfo(path)
    pushUnique(installCandidates, {
      path,
      valid: info !== null,
      version: info?.version ?? null,
      hasKernel: info?.hasKernel ?? false,
      source: 'config',
    })
  }

  const programBases = [
    env.LOCALAPPDATA === undefined ? null : join(env.LOCALAPPDATA, 'Programs'),
    env.LOCALAPPDATA ?? null,
    env.ProgramFiles ?? null,
    env['ProgramFiles(x86)'] ?? null,
  ].filter((base) => typeof base === 'string' && base.length > 0)

  for (const base of programBases) {
    for (const name of INSTALL_DIR_NAMES) {
      const path = join(base, name)
      searchedInstall.push(path)
      const info = readInstallInfo(path)
      pushUnique(installCandidates, {
        path,
        valid: info !== null,
        version: info?.version ?? null,
        hasKernel: info?.hasKernel ?? false,
        source: 'default',
      })
    }
  }

  if (config.repoPath && String(config.repoPath).trim().length > 0) {
    const path = normalizePath(config.repoPath)
    searchedRepo.push(path)
    const info = readRepoInfo(path)
    pushUnique(repoCandidates, {
      path,
      valid: info !== null,
      extensionVersion: info?.extensionVersion ?? null,
      winuionweb: info?.winuionweb ?? null,
      source: 'config',
    })
  }

  if (cwd.length > 0) {
    const cwdRepo = repoRootForCwd(cwd)
    if (cwdRepo !== null) {
      searchedRepo.push(cwdRepo)
      const info = readRepoInfo(cwdRepo)
      pushUnique(repoCandidates, {
        path: cwdRepo,
        valid: true,
        extensionVersion: info?.extensionVersion ?? null,
        winuionweb: info?.winuionweb ?? null,
        source: 'cwd',
      })
    }
  }

  const home = env.USERPROFILE ?? env.HOME ?? null
  if (typeof home === 'string' && home.length > 0) {
    for (const name of REPO_ROOT_NAMES) {
      for (const parent of [home, join(home, 'Desktop'), join(home, 'source', 'repos'), join(home, 'Documents')]) {
        const path = join(parent, name)
        searchedRepo.push(path)
        const info = readRepoInfo(path)
        pushUnique(repoCandidates, {
          path,
          valid: info !== null,
          extensionVersion: info?.extensionVersion ?? null,
          winuionweb: info?.winuionweb ?? null,
          source: 'default',
        })
      }
    }

    for (const base of [join(home, 'Desktop'), join(home, 'source', 'repos'), join(home, 'Documents')]) {
      for (const entry of scanChildDirectories(base, (name) => /pickcat/i.test(name), 'scan')) {
        searchedRepo.push(entry.path)
        const info = readRepoInfo(entry.path)
        pushUnique(repoCandidates, {
          path: entry.path,
          valid: info !== null,
          extensionVersion: info?.extensionVersion ?? null,
          winuionweb: info?.winuionweb ?? null,
          source: 'scan',
        })
      }
    }
  }

  return {
    platform,
    cwd,
    config: {
      installPath: typeof config.installPath === 'string' ? config.installPath : '',
      repoPath: typeof config.repoPath === 'string' ? config.repoPath : '',
    },
    installCandidates,
    repoCandidates,
    searchedInstall,
    searchedRepo,
  }
}

function chooseCandidate(candidates, configuredPath, notes, label) {
  if (typeof configuredPath === 'string' && configuredPath.trim().length > 0) {
    const normalized = normalizePath(configuredPath)
    const hit = candidates.find((candidate) => candidate.valid && samePath(candidate.path, normalized))
    if (hit !== undefined) return { ...hit, source: 'config' }
    notes.push(`配置的${label}路径无效：${configuredPath}`)
  }
  const fallback = candidates.find((candidate) => candidate.valid)
  return fallback === undefined ? null : { ...fallback }
}

/**
 * 纯决策函数：输入 collectSnapshot() 的快照，输出结构化检测结果。
 * 不访问文件系统，可以直接在单测里用固定数据驱动。
 * @param {object} snapshot
 * @returns {object}
 */
export function decidePickCat(snapshot = {}) {
  const platform = snapshot.platform ?? process.platform
  const supported = platform === 'win32'
  const notes = []

  if (!supported) {
    return {
      platform,
      supported: false,
      detected: false,
      installed: { found: false },
      repo: { found: false },
      activeTarget: null,
      canEditSource: false,
      notes: ['PickCat 仅支持 Windows，当前平台不做任何处理。'],
      searched: { install: [], repo: [] },
    }
  }

  const install = chooseCandidate(
    snapshot.installCandidates ?? [],
    snapshot.config?.installPath ?? '',
    notes,
    '安装目录',
  )
  const repo = chooseCandidate(
    snapshot.repoCandidates ?? [],
    snapshot.config?.repoPath ?? '',
    notes,
    '源码仓库',
  )

  const installed = install === null
    ? { found: false }
    : {
        found: true,
        path: install.path,
        version: install.version ?? null,
        hasKernel: install.hasKernel === true,
        source: install.source ?? 'default',
      }

  const repository = repo === null
    ? { found: false }
    : {
        found: true,
        path: repo.path,
        extensionVersion: repo.extensionVersion ?? null,
        winuionweb: repo.winuionweb ?? null,
        source: repo.source ?? 'default',
      }

  const detected = installed.found || repository.found
  return {
    platform,
    supported: true,
    detected,
    installed,
    repo: repository,
    activeTarget: repository.found ? 'repo' : installed.found ? 'installed' : null,
    canEditSource: repository.found,
    notes,
    searched: {
      install: snapshot.searchedInstall ?? [],
      repo: snapshot.searchedRepo ?? [],
    },
  }
}

/**
 * 运行时入口：采集快照并决策。
 * @param {{ env?: NodeJS.ProcessEnv, config?: object, cwd?: string, platform?: string }} [options]
 * @returns {object}
 */
export function detectPickCat(options = {}) {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return decidePickCat({ platform })
  return decidePickCat(collectSnapshot(options))
}

/**
 * 只判断给定目录是否落在有效的 PickCat 仓库里。
 * @param {string} dir
 * @returns {string | null}
 */
export function locateRepo(dir) {
  return repoRootForCwd(dir)
}

export { normalizePath, samePath }
