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

  const init: RequestInit = {
    method,
    credentials: 'include',
    signal,
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
  }
  if (body !== undefined) init.body = JSON.stringify(body)

  const response = await fetch(url, init)
  const text = await response.text()
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
