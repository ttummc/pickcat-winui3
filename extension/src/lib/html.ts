const ALLOWED_TAGS = new Set([
  'P', 'BR', 'A', 'STRONG', 'B', 'EM', 'I', 'DEL', 'S', 'CODE', 'PRE', 'BLOCKQUOTE',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'IMG', 'SPAN', 'DIV',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'SUP', 'SUB', 'FIGURE', 'FIGCAPTION',
  'VIDEO', 'AUDIO', 'SOURCE',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  IMG: new Set(['src', 'alt', 'width', 'height', 'class']),
  VIDEO: new Set(['src', 'controls', 'poster', 'width', 'height']),
  AUDIO: new Set(['src', 'controls']),
  SOURCE: new Set(['src', 'type']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan']),
  CODE: new Set(['class']),
  SPAN: new Set(['class']),
}

const URL_ATTRS = new Set(['href', 'src', 'poster'])

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
  try {
    const url = new URL(trimmed, location.href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

/**
 * The API ships pre-rendered HTML (`cookedHtml`). We never trust it blindly:
 * rebuild a clean subtree from an allow-list so nothing executable or
 * surprising can reach our WinUI surface.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  const walk = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName
      if (!ALLOWED_TAGS.has(tag)) {
        const text = document.createTextNode(child.textContent ?? '')
        child.replaceWith(text)
        continue
      }

      const allowed = ALLOWED_ATTRS[tag]
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        if (!allowed?.has(name)) {
          child.removeAttribute(attr.name)
          continue
        }
        if (URL_ATTRS.has(name) && !isSafeUrl(attr.value)) child.removeAttribute(attr.name)
      }

      if (tag === 'A') {
        const href = child.getAttribute('href') ?? ''
        if (href.startsWith('http')) {
          child.setAttribute('target', '_blank')
          child.setAttribute('rel', 'noopener noreferrer')
        }
      }

      walk(child)
    }
  }

  walk(doc.body)
  return doc.body.innerHTML
}

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
