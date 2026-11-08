import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  decidePickCat,
  normalizePath,
  readInstallInfo,
  readRepoInfo,
  repoRootForCwd,
  versionFromDeps,
} from '../lib/detect.js'
import { renderAgentsMd, renderPromptSection } from '../lib/context.js'

const INSTALL = {
  path: 'C:\\Users\\me\\AppData\\Local\\Programs\\PickCat WinUI 3',
  valid: true,
  version: '1.6.0',
  hasKernel: true,
  source: 'default',
}

const REPO = {
  path: 'C:\\Users\\me\\Desktop\\PickCatButWinUI3OnWeb',
  valid: true,
  extensionVersion: '1.6.0',
  winuionweb: 'file:./vendor/winuionweb-0.2.0.tgz',
  source: 'default',
}

test('versionFromDeps 解析 PickCatWinUI3/1.6.0', () => {
  assert.equal(versionFromDeps('"PickCatWinUI3/1.6.0": { "dependencies": {} }'), '1.6.0')
  assert.equal(versionFromDeps('"PickCat.WinUI3/2.0.0": {}'), '2.0.0')
  assert.equal(versionFromDeps('{}'), null)
})

test('decidePickCat：同时有安装版与仓库时以仓库为工作目标', () => {
  const result = decidePickCat({
    platform: 'win32',
    config: {},
    installCandidates: [INSTALL],
    repoCandidates: [REPO],
    searchedInstall: [],
    searchedRepo: [],
  })
  assert.equal(result.detected, true)
  assert.equal(result.activeTarget, 'repo')
  assert.equal(result.canEditSource, true)
  assert.equal(result.installed.version, '1.6.0')
  assert.equal(result.repo.path, REPO.path)
})

test('decidePickCat：只有安装版时不能改代码', () => {
  const result = decidePickCat({
    platform: 'win32',
    config: {},
    installCandidates: [INSTALL],
    repoCandidates: [],
  })
  assert.equal(result.detected, true)
  assert.equal(result.activeTarget, 'installed')
  assert.equal(result.canEditSource, false)
  assert.equal(result.repo.found, false)
})

test('decidePickCat：什么都没有时静默不激活', () => {
  const result = decidePickCat({
    platform: 'win32',
    config: {},
    installCandidates: [{ path: 'C:\\nope', valid: false }],
    repoCandidates: [{ path: 'C:\\nope2', valid: false }],
  })
  assert.equal(result.detected, false)
  assert.equal(result.activeTarget, null)
  assert.equal(result.canEditSource, false)
})

test('decidePickCat：用户显式路径优先于默认检测', () => {
  const explicit = {
    path: 'D:\\Games\\PickCat',
    valid: true,
    version: '9.9.9',
    hasKernel: false,
    source: 'config',
  }
  const result = decidePickCat({
    platform: 'win32',
    config: { installPath: explicit.path, repoPath: '' },
    installCandidates: [INSTALL, explicit],
    repoCandidates: [],
  })
  assert.equal(result.installed.path, explicit.path)
  assert.equal(result.installed.version, '9.9.9')
  assert.equal(result.installed.source, 'config')
})

test('decidePickCat：显式路径无效时回退并记录提示', () => {
  const result = decidePickCat({
    platform: 'win32',
    config: { installPath: 'D:\\Missing' },
    installCandidates: [
      { path: 'D:\\Missing', valid: false, version: null, hasKernel: false, source: 'config' },
      INSTALL,
    ],
    repoCandidates: [],
  })
  assert.equal(result.installed.path, INSTALL.path)
  assert.ok(result.notes.some((note) => note.includes('安装目录路径无效')))
})

test('decidePickCat：非 Windows 不做任何处理', () => {
  const result = decidePickCat({ platform: 'darwin', config: {} })
  assert.equal(result.supported, false)
  assert.equal(result.detected, false)
  assert.equal(result.activeTarget, null)
})

test('normalizePath 去掉引号并解析相对路径', () => {
  assert.equal(normalizePath('  "C:\\Users\\me"  '), 'C:\\Users\\me')
  assert.equal(normalizePath(''), '')
})

test('readInstallInfo / readRepoInfo 对不存在的目录返回 null', () => {
  assert.equal(readInstallInfo('C:\\definitely-not-here-pickcat'), null)
  assert.equal(readRepoInfo('C:\\definitely-not-here-pickcat'), null)
  assert.equal(repoRootForCwd('C:\\definitely-not-here-pickcat'), null)
})

test('未检测到 PickCat 时系统提示为空，不污染普通会话', () => {
  assert.equal(renderPromptSection({ detected: false }), '')
})

test('只有安装版时系统提示明确说不能改代码', () => {
  const text = renderPromptSection({
    detected: true,
    installed: { found: true, path: 'C:\\PickCat', version: '1.6.0', hasKernel: false },
    repo: { found: false },
    canEditSource: false,
  })
  assert.match(text, /无法修改代码/)
  assert.match(text, /未找到/)
})

test('只有安装版时 AGENTS.md 使用限制模板且不留占位符', () => {
  const assets = join(import.meta.dirname, '..', 'assets')
  const text = renderAgentsMd(
    {
      detected: true,
      installed: { found: true, path: 'C:\\PickCat', version: '1.6.0', hasKernel: false },
      repo: { found: false },
      canEditSource: false,
    },
    assets,
  )
  assert.match(text, /无法直接修改代码/)
  assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/)
})
