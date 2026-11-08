import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import { detectPickCat, readRepoInfo, repoRootForCwd } from './lib/detect.js'
import {
  ensureWorkspaceFiles,
  inspectContextFiles,
  renderPromptSection,
  renderStatusSummary,
} from './lib/context.js'

/**
 * @pickcat/dsh-plugin 入口。
 *
 * 插件只提供能力与上下文，不提供自定义 UI：
 * - 通过 Config 在 DSH 设置里暴露安装目录 / 源码仓库两个路径；
 * - 通过 systemPrompt 注入一段 PickCat 状态与硬规则；
 * - 在 PickCat 仓库工作区自动补齐 AGENTS.md、components.json、pages.md；
 * - 注册 pickcat_status / pickcat_sync 两个工具，供模型查询与重新铺文件。
 */

const PLUGIN_DIR = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url))

const STATUS_OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      summary: {
        type: 'string',
        description: '面向模型的中文状态摘要。',
      },
    },
    required: ['summary'],
  },
  render(_args, value) {
    return [{ type: 'text', text: String(value.summary ?? '') }]
  },
}

export const name = 'pickcat'

export const inject = ['tools', 'systemPrompt', 'workingDirectory', 'agents']

export const Config = z.object({
  installPath: z
    .string()
    .description('PickCat 桌面版安装目录。留空则自动检测默认安装位置。')
    .default('')
    .volatile(),
  repoPath: z
    .string()
    .description('PickCat 源码仓库根目录（包含 extension/src 与 winuionweb 依赖）。留空则自动探测。')
    .default('')
    .volatile(),
  autoWrite: z
    .boolean()
    .description('在 PickCat 仓库工作区自动补齐 AGENTS.md、components.json、pages.md。')
    .default(true)
    .volatile(),
})

export function apply(ctx, config) {
  let cache = { key: '', at: 0, value: null }

  function log(level, ...args) {
    try {
      const logger = ctx.logger
      if (typeof logger?.[level] === 'function') logger[level]('pickcat:', ...args)
    } catch {
      /* 日志失败不影响插件 */
    }
  }

  function unwrap(value, fallback) {
    if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
      try {
        const current = value.get()
        return current === undefined || current === null ? fallback : current
      } catch {
        return fallback
      }
    }
    return value === undefined || value === null ? fallback : value
  }

  function readConfig() {
    return {
      installPath: String(unwrap(config?.installPath, '') ?? '').trim(),
      repoPath: String(unwrap(config?.repoPath, '') ?? '').trim(),
      autoWrite: unwrap(config?.autoWrite, true) !== false,
    }
  }

  function detect(fresh, cwd) {
    const settings = readConfig()
    const directory = typeof cwd === 'string' && cwd.length > 0 ? cwd : process.cwd()
    const key = JSON.stringify({ installPath: settings.installPath, repoPath: settings.repoPath, cwd: directory })
    const now = Date.now()
    if (fresh !== true && cache.value !== null && cache.key === key && now - cache.at < 5000) {
      return cache.value
    }
    let value
    try {
      value = detectPickCat({
        env: process.env,
        config: { installPath: settings.installPath, repoPath: settings.repoPath },
        cwd: directory,
        platform: process.platform,
      })
    } catch (error) {
      log('warn', '检测失败', error)
      value = {
        platform: process.platform,
        supported: process.platform === 'win32',
        detected: false,
        installed: { found: false },
        repo: { found: false },
        activeTarget: null,
        canEditSource: false,
        notes: ['检测模块异常，已静默降级。'],
        searched: { install: [], repo: [] },
      }
    }
    cache = { key, at: now, value }
    return value
  }

  function sessionCwd(agent) {
    try {
      const session = agent?.session
      if (session !== undefined && session !== null) return ctx.workingDirectory.get(session)
    } catch {
      /* 回退到会话头 */
    }
    return agent?.session?.header?.cwd ?? process.cwd()
  }

  function statusForAgent(agent, fresh) {
    const cwd = sessionCwd(agent)
    return { cwd, status: detect(fresh, cwd) }
  }

  /** 把检测结果里的仓库替换成指定仓库，用于“当前工作区就是仓库”的场景。 */
  function withRepo(status, repoPath) {
    const info = readRepoInfo(repoPath)
    if (info === null) return status
    return {
      ...status,
      detected: true,
      repo: {
        found: true,
        path: repoPath,
        extensionVersion: info.extensionVersion,
        winuionweb: info.winuionweb,
        source: 'cwd',
      },
      activeTarget: 'repo',
      canEditSource: true,
    }
  }

  /** 决定要铺上下文的仓库：优先当前工作区所在的仓库，其次检测到的仓库。 */
  function syncTarget(status, cwd) {
    const cwdRepo = repoRootForCwd(cwd)
    const target = cwdRepo ?? (status?.repo?.found ? status.repo.path : null)
    if (target === null) return { target: null, status }
    return { target, status: withRepo(status, target) }
  }

  async function syncRepo(repoPath, status, force) {
    try {
      return await ensureWorkspaceFiles({
        dir: repoPath,
        status,
        presetDir: PLUGIN_DIR,
        force: force === true,
      })
    } catch (error) {
      log('warn', '写入工作区上下文失败', error)
      return [{ path: repoPath, action: 'error', error: error instanceof Error ? error.message : String(error) }]
    }
  }

  // 1. 系统提示：仅在检测到 PickCat 时输出内容，未安装则保持空串。
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'pickcat-context',
        order: 950,
        text: () => {
          // 提示组装发生在当前 Agent 的驱动链里，优先用它的工作目录判断仓库。
          let cwd = process.cwd()
          try {
            const agent = ctx.agents.currentInitiator()
            if (agent !== undefined) cwd = sessionCwd(agent)
          } catch {
            /* 没有 Agent 上下文时回退到进程目录 */
          }
          const status = detect(false, cwd)
          return renderPromptSection(status, { inRepo: repoRootForCwd(cwd) !== null })
        },
      }),
    'pickcat.prompt',
  )

  // 2. 工具：查询状态 / 手动重铺上下文。
  ctx.effect(
    () =>
      ctx.tools.register({
        name: 'pickcat_status',
        description:
          '查询本机 PickCat WinUI 3 的检测结果：桌面版版本与安装路径、是否带旧版内置内核、源码仓库路径、扩展版本，以及当前工作区三个上下文文件是否存在。',
        parameters: {
          fresh: {
            type: 'boolean',
            description: '忽略 5 秒缓存，重新扫描本机路径。默认 false。',
          },
        },
        output: STATUS_OUTPUT,
        async execute(args, exec) {
          const { status, cwd } = statusForAgent(exec.agent, args?.fresh === true)
          const target = syncTarget(status, cwd)
          const contextFiles = inspectContextFiles(target.target ?? cwd)
          const inRepo = repoRootForCwd(cwd) !== null
          const summary = renderStatusSummary(target.status, contextFiles, { cwd, inRepo })
          return { summary, status: target.status, cwd, inRepo, contextFiles }
        },
      }),
    'pickcat.tool.status',
  )

  ctx.effect(
    () =>
      ctx.tools.register({
        name: 'pickcat_sync',
        description:
          '在 PickCat 源码仓库根目录补齐 AGENTS.md、components.json、pages.md。默认只补缺失文件，不覆盖已有内容；force=true 时才覆盖。',
        parameters: {
          force: {
            type: 'boolean',
            description: '覆盖已存在的三个上下文文件。默认 false，只补缺失。',
          },
        },
        output: STATUS_OUTPUT,
        async execute(args, exec) {
          const { status, cwd } = statusForAgent(exec.agent, true)
          const target = syncTarget(status, cwd)
          if (target.target === null) {
            return {
              summary: [
                '未找到 PickCat 源码仓库，无法生成上下文文件。',
                '当前只能解释安装版的现有行为，不能修改代码。可在 DSH 设置里填写「PickCat 源码仓库」后重试。',
                `当前工作目录：${cwd}`,
              ].join('\n'),
              status,
              files: [],
            }
          }
          const files = await syncRepo(target.target, target.status, args?.force === true)
          const lines = files.map((file) => {
            const action = file.action === 'written' ? '已写入' : file.action === 'exists' ? '已存在，跳过' : `失败：${file.error ?? '未知错误'}`
            return `- ${file.path}：${action}`
          })
          return {
            summary: [`PickCat 仓库：${target.target}`, ...lines].join('\n'),
            status: target.status,
            files,
          }
        },
      }),
    'pickcat.tool.sync',
  )

  // 3. 会话创建时，若工作目录落在 PickCat 仓库里，补齐上下文文件。
  ctx.effect(
    () =>
      ctx.on('agent/created', async ({ agent, signal }) => {
        try {
          if (signal?.aborted === true) return
          const settings = readConfig()
          if (!settings.autoWrite) return
          const cwd = sessionCwd(agent)
          const target = syncTarget(detect(false, cwd), cwd)
          if (target.target === null) return

          const files = await syncRepo(target.target, target.status, false)
          const written = files.filter((file) => file.action === 'written')
          if (written.length > 0) log('info', '已补齐上下文文件', written.map((file) => file.path).join(', '))
        } catch (error) {
          log('warn', 'agent/created 时处理 PickCat 上下文失败', error)
        }
      }),
    'pickcat.agentCreated',
  )

  // 4. 插件激活时先铺一次，确保尚未开会话也能看到文件。
  ctx.effect(() => {
    const settings = readConfig()
    if (!settings.autoWrite) return () => {}
    let cancelled = false
    void (async () => {
      try {
        const status = detect(true, process.cwd())
        if (cancelled || !status.repo.found) return
        const files = await syncRepo(status.repo.path, status, false)
        const written = files.filter((file) => file.action === 'written')
        if (written.length > 0) log('info', '启动时已补齐上下文文件', written.map((file) => file.path).join(', '))
      } catch (error) {
        log('warn', '启动时初始化 PickCat 上下文失败', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, 'pickcat.startup')
}
