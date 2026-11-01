import { reactive, computed } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'
export type InfoSeverity = 'Informational' | 'Success' | 'Warning' | 'Error'

export interface InfoMessage {
  id: number
  title: string
  message: string
  severity: InfoSeverity
}

interface UiState {
  theme: ThemePreference
  accent: string
  messages: InfoMessage[]
  windowClosed: boolean
  paneOpen: boolean
}

const THEME_KEY = 'pickcat-winui-theme'
const ACCENT_KEY = 'pickcat-winui-accent'

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export const uiState = reactive<UiState>({
  theme: readStored(THEME_KEY, 'system') as ThemePreference,
  accent: readStored(ACCENT_KEY, 'coral'),
  messages: [],
  windowClosed: false,
  paneOpen: true,
})

export const ACCENTS: Record<string, { light: string; dark: string; label: string }> = {
  coral: { light: '#e8483d', dark: '#ff6b60', label: 'PickCat 珊瑚红' },
  blue: { light: '#0067c0', dark: '#4cc2ff', label: 'Windows 蓝' },
  violet: { light: '#7b4dff', dark: '#b49cff', label: '紫罗兰' },
  green: { light: '#0f7b3e', dark: '#4bd07a', label: '森林绿' },
}

const systemDark = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export const resolvedTheme = computed<'light' | 'dark'>(() =>
  uiState.theme === 'system' ? (systemDark() ? 'dark' : 'light') : uiState.theme,
)

export function applyTheme(): void {
  const root = document.documentElement
  const resolved = resolvedTheme.value
  // Strip the original site's theme classes so only ours drive the surface.
  root.classList.remove('theme-light', 'theme-dark', 'light', 'dark')
  root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light')
  root.style.colorScheme = resolved

  const accent = ACCENTS[uiState.accent] ?? ACCENTS.coral
  const accentColor = resolved === 'dark' ? accent.dark : accent.light
  root.style.setProperty('--accent-base', accentColor)
  root.style.setProperty('--pc-accent', accentColor)
  root.style.setProperty('--SystemAccentColor', accentColor)

  // The dark theme ships a light-blue system accent, so its accent foreground is
  // black. Our coral is much darker — flip the foreground to white or the label
  // becomes unreadable.
  const darkAccent = accent.dark.toLowerCase()
  const luminance = (hex: string): number => {
    const value = hex.replace('#', '')
    const r = parseInt(value.slice(0, 2), 16) / 255
    const g = parseInt(value.slice(2, 4), 16) / 255
    const b = parseInt(value.slice(4, 6), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const foreground =
    resolved === 'dark' && luminance(darkAccent) < 0.6 ? '#ffffff' : resolved === 'dark' ? '#000000' : '#ffffff'
  root.style.setProperty('--AccentButtonForeground', foreground)
  root.style.setProperty('--accent-text', foreground)
}

export function setTheme(theme: ThemePreference): void {
  uiState.theme = theme
  writeStored(THEME_KEY, theme)
  applyTheme()
}

export function setAccent(name: string): void {
  uiState.accent = name
  writeStored(ACCENT_KEY, name)
  applyTheme()
}

let messageId = 0
const MAX_MESSAGES = 3

export function notify(title: string, message = '', severity: InfoSeverity = 'Informational'): void {
  // Repeat clicks (e.g. the caption buttons) must not stack identical toasts.
  const existing = uiState.messages.find((item) => item.title === title && item.message === message)
  if (existing) {
    window.clearTimeout(timers.get(existing.id))
    timers.set(
      existing.id,
      window.setTimeout(() => dismiss(existing.id), 6000),
    )
    return
  }

  const id = ++messageId
  uiState.messages.push({ id, title, message, severity })

  while (uiState.messages.length > MAX_MESSAGES) {
    const dropped = uiState.messages.shift()
    if (dropped) {
      window.clearTimeout(timers.get(dropped.id))
      timers.delete(dropped.id)
    }
  }

  timers.set(
    id,
    window.setTimeout(() => dismiss(id), 6000),
  )
}

const timers = new Map<number, number>()

export function dismiss(id: number): void {
  window.clearTimeout(timers.get(id))
  timers.delete(id)
  const index = uiState.messages.findIndex((item) => item.id === id)
  if (index >= 0) uiState.messages.splice(index, 1)
}

export function notifyError(error: unknown, fallback = '操作失败'): void {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  notify('出错了', message, 'Error')
}

if (typeof matchMedia === 'function') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (uiState.theme === 'system') applyTheme()
  })
}
