/**
 * Tiny Markdown → HTML renderer for the composer preview.
 *
 * The API cooks Markdown server-side on submit, so this only has to be good
 * enough to show the author roughly what they are about to publish.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text: string): string {
  let out = escapeHtml(text)

  // inline code first so its contents are not touched by the other rules
  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code)
    return `\u0000${codes.length - 1}\u0000`
  })

  // images before links
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt: string, src: string) => `<img src="${src}" alt="${alt}" />`,
  )
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string, href: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  out = out.replace(/\u0000(\d+)\u0000/g, (_, index: string) => `<code>${codes[Number(index)]}</code>`)
  return out
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const body: string[] = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index])
        index += 1
      }
      index += 1
      const lang = fence[1] ? ` class="language-${fence[1]}"` : ''
      html.push(`<pre><code${lang}>${escapeHtml(body.join('\n'))}</code></pre>`)
      continue
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      html.push('<hr />')
      index += 1
      continue
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const body: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      html.push(`<blockquote>${renderMarkdown(body.join('\n'))}</blockquote>`)
      continue
    }

    // lists
    const bullet = line.match(/^\s*([-*+])\s+/)
    const ordered = line.match(/^\s*\d+\.\s+/)
    if (bullet || ordered) {
      const tag = ordered ? 'ol' : 'ul'
      const items: string[] = []
      while (index < lines.length && lines[index].match(/^\s*(?:[-*+]|\d+\.)\s+/)) {
        items.push(lines[index].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''))
        index += 1
      }
      html.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`)
      continue
    }

    // paragraph
    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|>|```|\s*(?:[-*+]|\d+\.)\s)/.test(lines[index])) {
      paragraph.push(lines[index])
      index += 1
    }
    html.push(`<p>${inline(paragraph.join('\n')).replace(/\n/g, '<br />')}</p>`)
  }

  return html.join('\n')
}
