export interface ApiError extends Error {
  status: number
  code: string | null
  payload: unknown
}

const BASE = '/api/v1'

export type Query = Record<string, string | number | boolean | undefined | null>

function buildQuery(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * The API rejects writes without a usable key:
 * "Idempotency-Key must contain 1 to 128 visible ASCII characters".
 */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Nothing should hang forever: a stalled request would freeze the caller's state. */
const DEFAULT_TIMEOUT_MS = 15_000

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export class PickCatApiError extends Error implements ApiError {
  status: number
  code: string | null
  payload: unknown

  constructor(status: number, payload: unknown) {
    const record = (payload ?? {}) as Record<string, unknown>
    const message = typeof record.message === 'string' ? record.message : `请求失败（${status}）`
    super(message)
    this.name = 'PickCatApiError'
    this.status = status
    this.code = typeof record.code === 'string' ? record.code : null
    this.payload = payload
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, headers, signal } = options
  const url = BASE + path + buildQuery(query)

  // Combine the caller's signal with our timeout so either can abort.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), DEFAULT_TIMEOUT_MS)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }

  const init: RequestInit = {
    method,
    credentials: 'include',
    signal: controller.signal,
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      // Writes are idempotent by key, so one is required on POST/PUT/PATCH/DELETE.
      ...(method === 'GET' ? {} : { 'Idempotency-Key': newIdempotencyKey() }),
      ...headers,
    },
  }
  if (body !== undefined) init.body = JSON.stringify(body)

  let response: Response
  let text: string
  try {
    response = await fetch(url, init)
    text = await response.text()
  } finally {
    clearTimeout(timer)
  }
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) throw new PickCatApiError(response.status, payload)
  return payload as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
}
