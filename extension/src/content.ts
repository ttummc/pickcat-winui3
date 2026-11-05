import { mountPickCat } from './main'

const ROOT_ID = 'pickcat-root'
const MOUNTED_FLAG = '__pickcatWinUIMounted'
const STYLE_ID = 'pickcat-style'

/**
 * Pages that must stay exactly as the site ships them.
 *
 * Sign-in is the important one: the official form carries the Aliyun CAPTCHA, and
 * any restyling or resource blocking breaks it. Those pages get no injected CSS,
 * no mounted UI and no /_nuxt/ block.
 */
function isStockPath(pathname: string): boolean {
  return /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(pathname)
}

function askBackground(type: 'pc:block-original' | 'pc:allow-original'): void {
  try {
    globalThis.chrome?.runtime?.sendMessage?.({ type }, () => void globalThis.chrome.runtime.lastError)
  } catch {
    /* extension context gone: nothing to do */
  }
}

function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) return

  // WebView2 exposes window.chrome but no runtime, and the desktop host injects the
  // stylesheet itself. Reading chrome.runtime.getURL there threw and aborted boot(),
  // which left the window blank.
  const url = globalThis.chrome?.runtime?.getURL?.('content.css')
  if (!url) return

  const link = document.createElement('link')
  link.id = STYLE_ID
  link.rel = 'stylesheet'
  link.href = url
  ;(document.head ?? document.documentElement).appendChild(link)
}

/**
 * Resolves once <body> exists.
 *
 * Hosts differ in how early they inject: Chrome's `document_start` guarantees a
 * document element, but WebView2's `AddScriptToExecuteOnDocumentCreatedAsync`
 * can run before `document.documentElement` exists at all. Observing a missing
 * node throws, so wait for the root element first and poll as a fallback.
 */
function whenBody(): Promise<HTMLElement> {
  if (document.body) return Promise.resolve(document.body)

  return new Promise((resolve) => {
    const settle = (): boolean => {
      if (!document.body) return false
      observer.disconnect()
      window.clearInterval(timer)
      resolve(document.body)
      return true
    }

    const observer = new MutationObserver(() => {
      settle()
    })

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true })
    }

    // Last resort: covers the case where even the document element is missing
    // when this script starts.
    const timer = window.setInterval(() => {
      if (document.documentElement) {
        try {
          observer.observe(document.documentElement, { childList: true, subtree: true })
        } catch {
          /* already observing */
        }
      }
      settle()
    }, 10)
  })
}

/**
 * Removes the site's server-rendered tree once our UI is up.
 *
 * Hiding it with CSS still costs layout/style work on ~950 nodes and 1.7 MB of
 * markup on every scroll; deleting it is the single biggest win.
 */
function stripOriginalDocument(): void {
  const selectors = ['#__nuxt', '#teleports', '#__NUXT_DATA__', 'body > script']
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => node.remove())
  }
}

async function boot(): Promise<void> {
  const scope = window as unknown as Record<string, unknown>
  if (scope[MOUNTED_FLAG]) return

  if (isStockPath(location.pathname)) {
    // Official page: leave the document alone.
    askBackground('pc:allow-original')
    return
  }

  scope[MOUNTED_FLAG] = true

  // Block the site's own bundle for this tab only, so the original app never boots
  // underneath us. Other tabs (including the stock login page) are unaffected.
  askBackground('pc:block-original')

  const body = await whenBody()

  injectStylesheet()
  document.documentElement.classList.add('pc-mounted')

  const existing = document.getElementById(ROOT_ID)
  if (existing) existing.remove()

  const root = document.createElement('div')
  root.id = ROOT_ID
  body.appendChild(root)

  // The page background must not flash white before the WinUI surface paints.
  document.documentElement.style.background = 'var(--app-bg, #202020)'
  document.documentElement.style.colorScheme = 'light dark'

  mountPickCat(root)

  // Next frame: let the first paint happen before tearing the old tree down.
  requestAnimationFrame(() => stripOriginalDocument())
}

void boot()

export {}
