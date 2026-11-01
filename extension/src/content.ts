import { mountPickCat } from './main'

const ROOT_ID = 'pickcat-root'
const MOUNTED_FLAG = '__pickcatWinUIMounted'

function whenBody(): Promise<HTMLElement> {
  if (document.body) return Promise.resolve(document.body)
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect()
        resolve(document.body)
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  })
}

async function boot(): Promise<void> {
  const scope = window as unknown as Record<string, unknown>
  if (scope[MOUNTED_FLAG]) return
  scope[MOUNTED_FLAG] = true

  const body = await whenBody()

  const existing = document.getElementById(ROOT_ID)
  if (existing) existing.remove()

  const root = document.createElement('div')
  root.id = ROOT_ID
  body.appendChild(root)

  // The page background must not flash white before the WinUI surface paints.
  document.documentElement.style.background = 'var(--app-bg, #202020)'
  document.documentElement.style.colorScheme = 'light dark'

  mountPickCat(root)
}

void boot()

export {}
