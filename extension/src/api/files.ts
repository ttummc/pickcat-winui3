import { PickCatApiError, newIdempotencyKey } from './client'

/**
 * Uploads go to the site's own file storage (`POST /api/v1/files`), which is what the
 * media library ("个人图盘") lists. The response shape has not been observed while
 * signed in, so the id is read from every plausible place instead of being trusted.
 */
export interface UploadedFile {
  id: string
  url?: string
  name?: string
  mimeType?: string
  size?: number
}

/** Files above this are rejected before touching the network. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

function pickRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload)) return pickRecord(payload[0])

  const record = payload as Record<string, unknown>
  // { items: [...] } | { file: {...} } | { data: {...} } | the file itself
  for (const key of ['file', 'data', 'item', 'result']) {
    const nested = record[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as Record<string, unknown>
  }
  if (Array.isArray(record.items) && record.items.length) return pickRecord(record.items)
  return record
}

function toUploaded(payload: unknown, fallbackName: string): UploadedFile {
  const record = pickRecord(payload)
  if (!record) throw new Error('上传返回了无法识别的数据')

  const id =
    (record.id as string | undefined) ??
    (record.fileId as string | undefined) ??
    (record.uuid as string | undefined)
  if (!id) throw new Error('上传成功但没拿到文件 ID')

  return {
    id,
    url: (record.url ?? record.fileUrl ?? record.contentUrl) as string | undefined,
    name: (record.name ?? record.fileName ?? fallbackName) as string | undefined,
    mimeType: (record.mimeType ?? record.contentType) as string | undefined,
    size: (record.size ?? record.byteSize) as number | undefined,
  }
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`图片太大（${Math.round(file.size / 1024 / 1024)} MB），上限 20 MB`)
  }

  const form = new FormData()
  // "file" is the field name every multipart endpoint in this app family uses.
  form.append('file', file, file.name || 'image.png')

  const response = await fetch('/api/v1/files', {
    method: 'POST',
    credentials: 'include',
    body: form,
    headers: {
      accept: 'application/json',
      // Required: the upload endpoint rejects requests without a valid key.
      'Idempotency-Key': newIdempotencyKey(),
    },
    signal,
  })

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error('登录状态已失效，请重新登录后再上传')
    throw new PickCatApiError(response.status, payload)
  }

  return toUploaded(payload, file.name)
}

/** Markdown image tag pointing at the stored file (served as raw bytes). */
export function fileMarkdown(file: UploadedFile, alt = '图片'): string {
  const src = file.url ?? `/api/v1/files/${file.id}`
  return `![${alt}](${src})`
}
