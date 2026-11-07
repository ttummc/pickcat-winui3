/**
 * Copies each CHANGELOG.md section onto the matching GitHub release body.
 *
 * The release bodies were written by hand (or back-filled by softprops) per tag, so
 * older ones are thin. This rewrites all of them from the changelog, which is the
 * single source of truth.
 *
 * Usage: GH_TOKEN=... node tools/sync-release-notes.mjs [--dry]
 */
import fs from 'node:fs'

const REPO = process.env.GITHUB_REPOSITORY || 'ttummc/pickcat-winui3'
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
const DRY = process.argv.includes('--dry')

if (!TOKEN && !DRY) {
  console.error('GH_TOKEN is required (or pass --dry)')
  process.exit(1)
}

/** "## v1.1.3\n…" blocks, newest first. */
function parseChangelog(text) {
  const out = new Map()
  const lines = text.split('\n')
  let current = null
  let buffer = []
  const flush = () => {
    if (current) out.set(current, buffer.join('\n').trim())
    buffer = []
  }
  for (const line of lines) {
    const match = /^##\s+(v\d+\.\d+\.\d+)\s*$/.exec(line)
    if (match) {
      flush()
      current = match[1]
      continue
    }
    if (current) buffer.push(line)
  }
  flush()
  return out
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      // Unauthenticated reads are enough for a dry run on a public repository.
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

const changelog = parseChangelog(fs.readFileSync('CHANGELOG.md', 'utf8'))
console.log(`changelog sections: ${[...changelog.keys()].join(', ')}`)

const releases = await api(`/repos/${REPO}/releases?per_page=100`)
console.log(`releases on GitHub: ${releases.map((r) => r.tag_name).join(', ')}`)

for (const release of releases) {
  const body = changelog.get(release.tag_name)
  if (!body) {
    console.log(`  ${release.tag_name}: no section, left alone`)
    continue
  }
  if ((release.body ?? '').trim() === body.trim()) {
    console.log(`  ${release.tag_name}: already up to date`)
    continue
  }
  if (DRY) {
    console.log(`  ${release.tag_name}: would update (${body.length} chars)`)
    continue
  }
  await api(`/repos/${REPO}/releases/${release.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  })
  console.log(`  ${release.tag_name}: updated`)
}
