import { reactive } from 'vue'

/**
 * Client for the desktop host's DSH bridge.
 *
 * The host injects `window.__PICKCAT_DSH__` before the page runs, so the port and
 * token never live in the bundle. In a plain browser there is no host and the page
 * reports that the desktop build is required.
 */
export interface DshEndpoint {
  port: number
  token: string
}

export interface DshChat {
  id: string
  title: string
  kernelSession: string
  workspace: string
  createdAt: string
  updatedAt: string
}

export interface DshStep {
  kind: 'tool' | 'thinking'
  tool?: string
  detail?: string
  result?: string
  status?: string
}

export interface DshMessage {
  role: 'user' | 'assistant'
  text: string
  steps?: DshStep[]
  failed?: boolean
  usage?: string
}

interface DshEvent {
  type?: string
  [key: string]: unknown
}

const MESSAGES_PREFIX = 'pickcat-dsh-messages-'

function endpoint(): DshEndpoint | null {
  const host = (window as unknown as Record<string, unknown>).__PICKCAT_DSH__ as
    | DshEndpoint
    | undefined
  if (!host || !host.port || !host.token) return null
  return host
}

export const dshState = reactive({
  available: false,
  ready: false,
  checking: true,
  hasKey: false,
  workspaces: '' as string,
  kernelPath: '' as string,
  webUrl: '' as string,
  failure: '' as string,

  chats: [] as DshChat[],
  activeId: '' as string,
  messages: [] as DshMessage[],

  running: false,
  events: [] as DshEvent[],
  taskId: '' as string,
  liveText: '' as string,
  thinking: '' as string,
})

/** Token usage reported on the final step of a turn. */
function lastUsage(events: DshEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const usage = events[i].usage as { inputTokens?: number; outputTokens?: number } | undefined
    if (usage && typeof usage.inputTokens === 'number') {
      return `${usage.inputTokens} in / ${usage.outputTokens ?? 0} out`
    }
  }
  return ''
}

function url(path: string, params: Record<string, string | number> = {}): string | null {
  const host = endpoint()
  if (!host) return null
  const query = new URLSearchParams({ token: host.token })
  for (const [k, v] of Object.entries(params)) query.set(k, String(v))
  return `http://127.0.0.1:${host.port}${path}?${query.toString()}`
}

async function getJson<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const target = url(path, params)
  if (!target) throw new Error('no host')
  const response = await fetch(target)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const target = url(path)
  if (!target) throw new Error('no host')
  // text/plain keeps this a "simple" request, so no CORS preflight is needed.
  const response = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

function loadMessages(chatId: string): DshMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_PREFIX + chatId)
    return raw ? (JSON.parse(raw) as DshMessage[]) : []
  } catch {
    return []
  }
}

function saveMessages(chatId: string, messages: DshMessage[]): void {
  try {
    localStorage.setItem(MESSAGES_PREFIX + chatId, JSON.stringify(messages.slice(-100)))
  } catch {
    /* storage is best effort */
  }
}

export function selectChat(chatId: string): void {
  dshState.activeId = chatId
  dshState.messages = loadMessages(chatId)
  dshState.events = []
  dshState.liveText = ''
}

export async function checkDsh(): Promise<void> {
  dshState.checking = true
  if (!endpoint()) {
    dshState.available = false
    dshState.ready = false
    dshState.checking = false
    return
  }

  try {
    const state = await getJson<{
      ready: boolean
      hasKey: boolean
      workspaces: string
      kernel: { found: boolean; path: string | null }
    }>('/state')

    dshState.available = true
    dshState.ready = state.ready
    dshState.hasKey = state.hasKey
    dshState.workspaces = state.workspaces ?? ''
    dshState.kernelPath = state.kernel?.path ?? ''
    dshState.failure = state.ready ? '' : '未找到 DSH 内核'

    if (state.ready) await loadChats()
  } catch (err) {
    dshState.available = false
    dshState.ready = false
    dshState.failure = err instanceof Error ? err.message : '无法连接宿主'
  } finally {
    dshState.checking = false
  }
}

export async function loadChats(): Promise<void> {
  const { chats } = await getJson<{ chats: DshChat[] }>('/chats')
  dshState.chats = chats ?? []
  if (!dshState.activeId && dshState.chats.length) selectChat(dshState.chats[0].id)
}

export async function createChat(): Promise<void> {
  const chat = await postJson<DshChat>('/chats', { title: '新对话' })
  dshState.chats = [chat, ...dshState.chats]
  selectChat(chat.id)
}

export async function deleteChat(chatId: string): Promise<void> {
  const target = url('/chats', { id: chatId })
  if (!target) return
  await fetch(target, { method: 'DELETE' })
  dshState.chats = dshState.chats.filter(c => c.id !== chatId)
  localStorage.removeItem(MESSAGES_PREFIX + chatId)
  if (dshState.activeId === chatId) {
    dshState.activeId = ''
    dshState.messages = []
    if (dshState.chats.length) selectChat(dshState.chats[0].id)
  }
}

export async function saveKey(key: string): Promise<void> {
  const result = await postJson<{ hasKey: boolean }>('/config', { key })
  dshState.hasKey = result.hasKey
  if (result.hasKey) await loadChats()
}

/** The kernel's own web UI (served on loopback) once it has booted. */
export async function loadWebUrl(): Promise<string> {
  if (dshState.webUrl) return dshState.webUrl
  try {
    const { url } = await getJson<{ url: string | null }>('/web')
    if (url) dshState.webUrl = url
  } catch {
    /* the host may still be starting it */
  }
  return dshState.webUrl
}

/** Sends a prompt to the active chat and streams the kernel's events. */
export async function sendPrompt(prompt: string): Promise<void> {
  if (!dshState.activeId) await createChat()
  const chatId = dshState.activeId
  if (!chatId) return

  const text = prompt.trim()
  if (!text) return

  dshState.messages.push({ role: 'user', text })
  saveMessages(chatId, dshState.messages)

  dshState.events = []
  dshState.liveText = ''
  dshState.running = true

  try {
    const { taskId } = await postJson<{ taskId: string }>('/task', { prompt: text, chatId })
    dshState.taskId = taskId

    let answer = ''
    let thinking = ''
    const steps: DshStep[] = []
    const byCall = new Map<string, DshStep>()
    dshState.thinking = ''
    let since = 0
    for (;;) {
      const payload = await getJson<{
        events: DshEvent[]
        finished: boolean
        failed: boolean
        final: string | null
        count: number
      }>('/events', { task: taskId, since })

      if (payload.events?.length) {
        dshState.events.push(...payload.events)
        for (const event of payload.events) {
          // The kernel streams the answer as "text" events; "final" only repeats the
          // tail, and older turns may not carry one at all.
          if (event.type === 'text' && typeof event.text === 'string') {
            answer += event.text
            dshState.liveText = answer
          }
          if (event.type === 'thinking' && typeof event.text === 'string' && event.text) {
            thinking = event.text
            dshState.thinking = thinking
            const last = steps[steps.length - 1]
            if (last?.kind === 'thinking') last.detail = thinking
            else steps.push({ kind: 'thinking', detail: thinking })
          }
          if (event.type === 'tool_call') {
            const input = event.input as Record<string, unknown> | undefined
            const detail =
              (typeof input?.command === 'string' && input.command) ||
              (typeof input?.description === 'string' && input.description) ||
              (typeof input?.path === 'string' && input.path) ||
              ''
            const step: DshStep = {
              kind: 'tool',
              tool: String(event.tool ?? 'tool'),
              detail: String(detail).slice(0, 400),
              status: 'running',
            }
            steps.push(step)
            if (typeof event.callId === 'string') byCall.set(event.callId, step)
          }
          if (event.type === 'tool_result') {
            const step = typeof event.callId === 'string' ? byCall.get(event.callId) : undefined
            if (step) {
              step.status = String(event.status ?? 'completed')
              step.result = String(event.result ?? '').slice(0, 600)
            }
          }
        }
      }
      since = payload.count ?? since

      if (payload.finished) {
        const body = answer || payload.final || excerpt(dshState.events)
        dshState.messages.push({
          role: 'assistant',
          text: body || (steps.length ? '' : '(无输出)'),
          steps: steps.length ? steps : undefined,
          failed: payload.failed,
          usage: lastUsage(dshState.events),
        })
        saveMessages(chatId, dshState.messages)
        await loadChats()
        break
      }
    }
  } catch (err) {
    dshState.messages.push({
      role: 'assistant',
      text: err instanceof Error ? err.message : '执行失败',
      failed: true,
    })
    saveMessages(chatId, dshState.messages)
  } finally {
    dshState.running = false
  }
}

/** Last meaningful line from the event stream, used when the kernel gives no text. */
function excerpt(events: DshEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'error') return String(event.text ?? event.message ?? '')
    if (event.type === 'log') return String(event.text ?? '')
    const reason = event.reason as { kind?: string; error?: { message?: string } } | undefined
    if (reason?.kind === 'error' && reason.error?.message) return reason.error.message
  }
  return ''
}

export async function cancelDshTask(): Promise<void> {
  if (!dshState.taskId) return
  const target = url('/cancel', { task: dshState.taskId })
  if (!target) return
  try {
    await fetch(target)
  } catch {
    /* cancellation is best effort */
  }
}
