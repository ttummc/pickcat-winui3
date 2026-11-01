import { reactive, computed, ref } from 'vue'

export type RouteName =
  | 'home'
  | 'forum'
  | 'category'
  | 'topic'
  | 'compose'
  | 'works'
  | 'work'
  | 'profile'
  | 'notifications'
  | 'likes'
  | 'search'
  | 'settings'
  | 'library'
  | 'media'
  | 'login'
  | 'notFound'

export interface Route {
  name: RouteName
  params: Record<string, string>
  query: Record<string, string>
}

const DEFAULT_ROUTE: Route = { name: 'home', params: {}, query: {} }

const PATTERNS: { name: RouteName; segments: string[] }[] = [
  { name: 'home', segments: [] },
  { name: 'forum', segments: ['forum'] },
  { name: 'category', segments: ['forum', 'category', ':id'] },
  { name: 'topic', segments: ['forum', 'post', ':id'] },
  { name: 'compose', segments: ['forum', 'editor'] },
  { name: 'works', segments: ['works'] },
  { name: 'work', segments: ['works', ':id'] },
  { name: 'profile', segments: ['profile', ':id'] },
  { name: 'notifications', segments: ['notifications'] },
  { name: 'likes', segments: ['notifications', 'likes', ':id'] },
  { name: 'search', segments: ['search'] },
  { name: 'settings', segments: ['settings'] },
  { name: 'library', segments: ['library'] },
  // The site's /personal-library is the file board, not the works library.
  { name: 'media', segments: ['personal-library'] },
  { name: 'login', segments: ['login'] },
]

/** Original routes we have not rebuilt yet — surface them instead of silently going home. */
const KNOWN_UNBUILT = new Set([
  'register',
  'forgot-password',
  'reset-password',
  'circles',
  'create',
  'entrance-exam',
  'review',
  'manage',
  'oidc',
])

function matchPath(path: string): { name: RouteName; params: Record<string, string> } {
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  for (const pattern of PATTERNS) {
    if (pattern.segments.length !== parts.length) continue
    const params: Record<string, string> = {}
    let ok = true
    for (let i = 0; i < parts.length; i += 1) {
      const expected = pattern.segments[i]
      if (expected.startsWith(':')) params[expected.slice(1)] = parts[i]
      else if (expected !== parts[i]) {
        ok = false
        break
      }
    }
    if (ok) return { name: pattern.name, params }
  }
  return { name: 'notFound', params: { path: parts.join('/') } }
}

function parseHash(): Route {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  const [pathPart, queryPart] = raw.split('?')
  const path = pathPart || '/'
  const query: Record<string, string> = {}
  if (queryPart) {
    for (const [key, value] of new URLSearchParams(queryPart)) query[key] = value
  }
  return { ...matchPath(path), query }
}

export const route = reactive<Route>({ ...DEFAULT_ROUTE })

export const canGoBack = computed(() => route.name !== 'home')

/**
 * WinUI picks a different transition depending on how you got here: drilling in
 * from a list slides in from the right, going back slides the other way, and
 * switching between sibling sections just fades.
 */
export type NavigationKind = 'drill' | 'back' | 'fade'

const DEPTH: Record<RouteName, number> = {
  home: 0,
  forum: 1,
  category: 2,
  topic: 3,
  compose: 2,
  works: 1,
  work: 2,
  profile: 2,
  notifications: 1,
  likes: 2,
  search: 1,
  settings: 1,
  library: 1,
  media: 1,
  login: 1,
  notFound: 1,
}

export const navigationKind = ref<NavigationKind>('fade')
let lastDepth = 0

export function syncRoute(): void {
  const next = parseHash()
  const changed = next.name !== route.name || (next.params.id ?? '') !== (route.params.id ?? '')
  const depth = DEPTH[next.name] ?? 0

  if (changed) {
    navigationKind.value = depth > lastDepth ? 'drill' : depth < lastDepth ? 'back' : 'fade'
  }
  lastDepth = depth

  route.name = next.name
  route.params = next.params
  route.query = next.query
}

/**
 * Navigates by writing to `location.hash`, which fires `hashchange` and keeps
 * the browser's own Back/Forward working. Never touch a local variable called
 * `history` here — it shadows `window.history`.
 */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const hash = path.startsWith('#') ? path : `#${path}`
  if (location.hash === hash) return

  if (options.replace) {
    window.history.replaceState(null, '', hash)
    syncRoute()
    return
  }
  location.hash = hash
}

export function goBack(): void {
  window.history.back()
}

export function initRouter(): void {
  // Normalise deep links ("/forum/post/x") into the hash router so the address
  // bar stays clean and Back behaves the way a desktop app expects.
  const deep = location.pathname + location.search
  const initial = deep && deep !== '/' ? deep : null
  const hash = location.hash || (initial ? `#${initial}` : '#/')
  try {
    window.history.replaceState(null, '', hash)
  } catch {
    /* ignore */
  }
  syncRoute()
  window.addEventListener('hashchange', syncRoute)
}
