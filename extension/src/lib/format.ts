export function relativeTime(input?: string | null): string {
  if (!input) return ''
  const then = new Date(input).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  const date = new Date(then)
  const now = new Date()
  if (date.getFullYear() === now.getFullYear())
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatDate(input?: string | null): string {
  if (!input) return ''
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function compactNumber(value?: number | null): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}w`
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function avatarUrl(user?: { avatar?: { url?: string } | null } | null): string {
  const url = user?.avatar?.url
  return url ? url : ''
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return [...trimmed].slice(0, 2).join('')
}
