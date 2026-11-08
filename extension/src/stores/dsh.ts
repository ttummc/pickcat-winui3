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

interface DshKernelState {
  found: boolean
  path: string | null
  home: string
}

interface DshEvent {
  type?: string
  [key: string]: unknown
}

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
  failure: '' as string,
  kernel: null as DshKernelState | null,
  taskId: '' as string,
  running: false,
  events: [] as DshEvent[],
  finalText: '' as string,
  failed: false,
})

function url(path: string, params: Record<string, string | number> = {}): string | null {
  const host = endpoint()
  if (!host) return null
  const query = new URLSearchParams({ token: host.token })
  for (const [k, v] of Object.entries(params)) query.set(k, String(v))
  return `http://127.0.0.1:${host.port}${path}?${query.toString()}`
}

/** Reads the bridge state; safe to call when the desktop host is absent. */
export async function checkDsh(): Promise<void> {
  dshState.checking = true
  const target = url('/state')
  if (!target) {
    dshState.available = false
    dshState.ready = false
    dshState.checking = false
    return
  }

  try {
    const response = await fetch(target)
    if (!response.ok) throw new Error(`状态 ${response.status}`)
    const data = (await response.json()) as { ready: boolean; kernel: DshKernelState }
    dshState.available = true
    dshState.ready = Boolean(data.ready)
    dshState.kernel = data.kernel ?? null
    dshState.failure = data.kernel?.found ? '' : '未找到 DSH 内核'
  } catch (err) {
    dshState.available = false
    dshState.ready = false
    dshState.failure = err instanceof Error ? err.message : '无法连接宿主'
  } finally {
    dshState.checking = false
  }
}

/** Submits a task and streams its events until the kernel finishes. */
export async function runDshTask(prompt: string): Promise<void> {
  const submit = url('/task')
  if (!submit) return

  dshState.events = []
  dshState.finalText = ''
  dshState.failed = false
  dshState.running = true

  try {
    // text/plain keeps this a "simple" request, so no CORS preflight is needed.
    const response = await fetch(submit, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ prompt }),
    })
    if (!response.ok) throw new Error(`提交失败 ${response.status}`)
    const { taskId } = (await response.json()) as { taskId: string }
    dshState.taskId = taskId

    let since = 0
    for (;;) {
      const poll = url('/events', { task: taskId, since })
      if (!poll) break
      const eventsResponse = await fetch(poll)
      if (!eventsResponse.ok) throw new Error(`读取事件失败 ${eventsResponse.status}`)
      const payload = (await eventsResponse.json()) as {
        events: DshEvent[]
        finished: boolean
        failed: boolean
        final: string | null
        count: number
      }

      if (payload.events?.length) dshState.events.push(...payload.events)
      since = payload.count ?? since + (payload.events?.length ?? 0)

      if (payload.finished) {
        dshState.finalText = payload.final ?? ''
        dshState.failed = Boolean(payload.failed)
        break
      }
    }
  } catch (err) {
    dshState.failed = true
    dshState.failure = err instanceof Error ? err.message : '执行失败'
  } finally {
    dshState.running = false
  }
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
