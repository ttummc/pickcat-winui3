// Aliyun CAPTCHA integration.
//
// The actual captcha runs in the page's main world (see extension/public/bridge.js,
// declared with "world": "MAIN" in the manifest). Content scripts cannot reach
// window.initAliyunCaptcha, so we drive the bridge with DOM events whose detail
// is a JSON string.

export interface CaptchaConfig {
  prefix: string
  region: string
  sceneId: string
}

const FALLBACK = {
  prefix: '1rbvwn',
  region: 'cn',
  loginCaptchaSceneId: '1icer78a',
}

interface NuxtPublicConfig {
  registrationCaptchaPrefix?: string
  registrationCaptchaRegion?: string
  loginCaptchaSceneId?: string
}

function nuxtPublic(): NuxtPublicConfig {
  const w = window as unknown as { __NUXT__?: { config?: { public?: NuxtPublicConfig } } }
  return w.__NUXT__?.config?.public ?? {}
}

export function loginCaptchaConfig(): CaptchaConfig {
  const config = nuxtPublic()
  return {
    prefix: config.registrationCaptchaPrefix ?? FALLBACK.prefix,
    region: config.registrationCaptchaRegion ?? FALLBACK.region,
    sceneId: config.loginCaptchaSceneId ?? FALLBACK.loginCaptchaSceneId,
  }
}

const COMMAND_EVENT = 'pickcat:captcha-command'
const REPLY_EVENT = 'pickcat:captcha-reply'
const INIT_TIMEOUT = 15000

interface BridgeReply {
  type: string
  nonce?: number
  ok?: boolean
  param?: string
  message?: string
}

export interface CaptchaHandle {
  verify: () => Promise<string>
  destroy: () => void
}

function parseReply(event: Event): BridgeReply | null {
  try {
    return JSON.parse((event as CustomEvent<string>).detail ?? '{}') as BridgeReply
  } catch {
    return null
  }
}

export async function createLoginCaptcha(
  anchor: HTMLElement,
  host: HTMLElement,
  onError: (message: string) => void,
): Promise<CaptchaHandle> {
  const config = loginCaptchaConfig()
  anchor.id = anchor.id || `pickcat-captcha-anchor-${Math.random().toString(36).slice(2)}`
  host.id = host.id || `pickcat-captcha-host-${Math.random().toString(36).slice(2)}`

  let nonce = 0
  const pendingVerify = new Map<number, { resolve: (value: string) => void; reject: (error: Error) => void }>()

  const listener = (event: Event): void => {
    const reply = parseReply(event)
    if (!reply || reply.type !== 'verify-result' || typeof reply.nonce !== 'number') return
    const waiter = pendingVerify.get(reply.nonce)
    if (!waiter) return
    pendingVerify.delete(reply.nonce)
    if (reply.ok && reply.param) waiter.resolve(reply.param)
    else waiter.reject(new Error(reply.message || '人机验证失败'))
  }

  window.addEventListener(REPLY_EVENT, listener)

  const send = (payload: Record<string, unknown>): void => {
    window.dispatchEvent(new CustomEvent(COMMAND_EVENT, { detail: JSON.stringify(payload) }))
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener(REPLY_EVENT, once)
        reject(new Error('人机验证没有响应，请刷新页面重试'))
      }, INIT_TIMEOUT)

      const once = (event: Event): void => {
        const reply = parseReply(event)
        if (!reply) return
        if (reply.type === 'ready') {
          window.clearTimeout(timer)
          window.removeEventListener(REPLY_EVENT, once)
          resolve()
        } else if (reply.type === 'fatal') {
          window.clearTimeout(timer)
          window.removeEventListener(REPLY_EVENT, once)
          reject(new Error(reply.message || '人机验证脚本加载失败'))
        }
      }

      window.addEventListener(REPLY_EVENT, once)
      send({
        command: 'init',
        prefix: config.prefix,
        region: config.region,
        sceneId: config.sceneId,
        anchorId: anchor.id,
        hostId: host.id,
      })
    })
  } catch (error) {
    window.removeEventListener(REPLY_EVENT, listener)
    onError(error instanceof Error ? error.message : '人机验证加载失败')
    throw error
  }

  return {
    verify() {
      const id = (nonce += 1)
      return new Promise<string>((resolve, reject) => {
        pendingVerify.set(id, { resolve, reject })
        send({ command: 'verify', nonce: id, anchorId: anchor.id })
      })
    },
    destroy() {
      window.removeEventListener(REPLY_EVENT, listener)
      pendingVerify.clear()
    },
  }
}
