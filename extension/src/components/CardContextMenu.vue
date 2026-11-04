<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { menuContext, closeContextMenu } from '@/stores/contextMenu'
import { navigate } from '@/router'
import { notify } from '@/stores/ui'

interface MenuItem {
  key: string
  label: string
  glyph: string
  run: () => void
  danger?: boolean
  separator?: false
  disabled?: boolean
}
interface Separator {
  key: string
  separator: true
}

/**
 * Hand-rolled WinUI context menu for the whole document.
 *
 * The library's MenuFlyout measures 0×0 inside our fixed root, and the browser's
 * native menu is suppressed because this is a desktop-app surface — so we own
 * every right click and provide the text actions ourselves.
 */
const menu = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })

const ctx = computed(() => menuContext.value)

async function place(): Promise<void> {
  const context = menuContext.value
  if (!context) return
  await nextTick()

  const node = menu.value
  const width = node?.offsetWidth ?? 210
  const height = node?.offsetHeight ?? 260
  let { X, Y } = context.position

  if (X + width + 8 > window.innerWidth) X = Math.max(8, window.innerWidth - width - 8)
  if (Y + height + 8 > window.innerHeight) Y = Math.max(8, window.innerHeight - height - 8)
  position.value = { x: Math.max(8, X), y: Math.max(8, Y) }
}

watch(menuContext, (context) => {
  if (context) void place()
})

// ------------------------------------------------------------------ actions

const selection = () => window.getSelection()?.toString() ?? ''

async function copyText(text: string, label = '已复制'): Promise<void> {
  closeContextMenu()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    notify(label, text.length > 60 ? `${text.slice(0, 60)}…` : text, 'Success')
  } catch {
    notify('复制失败', '浏览器拒绝了剪贴板访问', 'Error')
  }
}

function copySelection(): void {
  void copyText(selection(), '已复制选中文字')
}

function selectAll(): void {
  const editable = menuContext.value?.editable
  closeContextMenu()
  if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
    editable.focus()
    editable.select()
    return
  }
  const range = document.createRange()
  range.selectNodeContents(document.getElementById('pickcat-root') ?? document.body)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

async function paste(): Promise<void> {
  const editable = menuContext.value?.editable
  closeContextMenu()
  if (!editable) return
  editable.focus()
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return
    if (/insertText/.test('insertText')) document.execCommand('insertText', false, text)
  } catch {
    notify('无法粘贴', '请使用 Ctrl+V', 'Warning')
  }
}

/** First http(s) URL inside an arbitrary string, if any. */
function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"'）)】]+/i)
  if (!match) return null
  try {
    return new URL(match[0]).toString()
  } catch {
    return null
  }
}

function openInNewTab(href: string): void {
  closeContextMenu()
  window.open(href, '_blank', 'noopener')
}

function copyText2(text: string, label: string): void {
  void copyText(text, label)
}

function copyPageLink(): void {
  void copyText(location.href, '已复制页面链接')
}

function backToTop(): void {
  closeContextMenu()
  document.querySelector('#pickcat-root .pc-page-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function reload(): void {
  closeContextMenu()
  location.reload()
}

function openOriginal(): void {
  closeContextMenu()
  window.open(`https://pickcat.dao3.fun${location.hash.slice(1) || '/'}`, '_blank', 'noopener')
}

function openCard(): void {
  const card = menuContext.value?.card
  closeContextMenu()
  if (!card) return
  navigate(card.kind === 'topic' ? `/forum/post/${card.topic.id}` : `/works/${card.work.id}`)
}

function openCardInTab(): void {
  const card = menuContext.value?.card
  closeContextMenu()
  if (!card) return
  const href =
    card.kind === 'topic'
      ? `${location.origin}/#/forum/post/${card.topic.id}`
      : `${location.origin}/#/works/${card.work.id}`
  window.open(href, '_blank', 'noopener')
}

function copyCardLink(): void {
  const card = menuContext.value?.card
  if (!card) return
  const href =
    card.kind === 'topic'
      ? `${location.origin}/#/forum/post/${card.topic.id}`
      : `${location.origin}/#/works/${card.work.id}`
  void copyText(href, '已复制链接')
}

function openAuthor(): void {
  const card = menuContext.value?.card
  closeContextMenu()
  if (!card) return
  const author = card.kind === 'topic' ? card.topic.author : card.work.author
  if (author?.id) navigate(`/profile/${author.id}`)
}

function openTag(): void {
  const card = menuContext.value?.card
  const tag = card?.kind === 'topic' ? card.topic.tags?.[0] : null
  closeContextMenu()
  if (tag) navigate(`/forum/category/${encodeURIComponent(tag.slug)}`)
}

function report(): void {
  closeContextMenu()
  notify('已记录', '举报入口在详情页', 'Informational')
}

// ------------------------------------------------------------------ items

const items = computed<(MenuItem | Separator)[]>(() => {
  const context = menuContext.value
  if (!context) return []
  const list: (MenuItem | Separator)[] = []

  if (context.hasSelection) {
    list.push({ key: 'copy-sel', label: '复制选中文字', glyph: '\uE8C8', run: copySelection })
    const selectedUrl = extractUrl(context.selectedText)
    if (selectedUrl) {
      list.push({ key: 'open-sel-url', label: '打开选中的链接', glyph: '\uE8A7', run: () => openInNewTab(selectedUrl) })
      list.push({ key: 'copy-sel-url', label: '复制这个链接', glyph: '\uE71B', run: () => copyText2(selectedUrl, '已复制链接') })
    }
    list.push({ key: 'sel-sep', separator: true })
  }

  const link = context.link
  if (link) {
    list.push({ key: 'open-link', label: '打开链接', glyph: '\uE8E5', run: () => openInNewTab(link.href) })
    list.push({ key: 'tab-link', label: '在新标签页打开链接', glyph: '\uE8A7', run: () => openInNewTab(link.href) })
    list.push({ key: 'copy-link-addr', label: '复制链接地址', glyph: '\uE71B', run: () => copyText2(link.href, '已复制链接地址') })
    list.push({ key: 'link-sep', separator: true })
  }

  if (context.editable) {
    list.push({ key: 'paste', label: '粘贴', glyph: '\uE77F', run: paste })
    list.push({ key: 'select-all', label: '全选', glyph: '\uE8B3', run: selectAll })
    list.push({ key: 'edit-sep', separator: true })
  }

  const card = context.card
  if (card) {
    list.push({ key: 'open', label: '打开', glyph: '\uE8E5', run: openCard })
    list.push({ key: 'tab', label: '在新标签页打开', glyph: '\uE8A7', run: openCardInTab })
    list.push({ key: 'copy-link', label: '复制链接', glyph: '\uE71B', run: copyCardLink })
    list.push({ key: 'sep-a', separator: true })
    list.push({ key: 'author', label: '查看作者', glyph: '\uE77B', run: openAuthor })
    if (card.kind === 'topic')
      list.push({ key: 'tag', label: '查看所属分类', glyph: '\uE8EC', run: openTag })
    list.push({ key: 'sep-b', separator: true })
    list.push({ key: 'report', label: '举报', glyph: '\uE7BA', run: report, danger: true })
    return list
  }

  list.push({ key: 'top', label: '回到顶部', glyph: '\uE74A', run: backToTop })
  list.push({ key: 'reload', label: '刷新页面', glyph: '\uE72C', run: reload })
  list.push({ key: 'copy-page', label: '复制页面链接', glyph: '\uE71B', run: copyPageLink })
  list.push({ key: 'sep-p', separator: true })
  list.push({ key: 'original', label: '在原站打开', glyph: '\uE8A7', run: openOriginal })
  return list
})

function onPointerDown(event: PointerEvent): void {
  if (!menuContext.value) return
  const node = menu.value
  if (node && event.target instanceof Node && node.contains(event.target)) return
  closeContextMenu()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeContextMenu()
}

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<template>
  <div
    v-if="ctx"
    ref="menu"
    class="pc-ctx"
    role="menu"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @contextmenu.prevent
  >
    <template v-for="item in items" :key="item.key">
      <div v-if="item.separator" class="pc-ctx-sep" role="separator" />
      <button
        v-else
        class="pc-ctx-item"
        :class="{ 'pc-ctx-item--danger': item.danger }"
        type="button"
        role="menuitem"
        @click="item.run()"
      >
        <span class="pc-ctx-glyph">{{ item.glyph }}</span>
        <span class="pc-ctx-label">{{ item.label }}</span>
      </button>
    </template>
  </div>
</template>

<style>
.pc-ctx {
  position: fixed;
  z-index: 2147483000;
  min-width: 210px;
  padding: 4px;
  border-radius: 8px;
  background: var(--flyout-bg, #2c2c2cdb);
  border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
  box-shadow: 0 12px 32px rgb(0 0 0 / 45%), 0 2px 8px rgb(0 0 0 / 30%);
  backdrop-filter: blur(30px) saturate(1.2);
  animation: pc-ctx-in 0.12s var(--fast-out-slow-in, cubic-bezier(0, 0, 0, 1)) both;
  color: var(--text-primary);
  font-size: 13px;
}

@keyframes pc-ctx-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.pc-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.pc-ctx-item:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-ctx-item:active {
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-secondary);
}

.pc-ctx-item--danger:hover {
  background: color-mix(in srgb, #e81123 22%, transparent);
  color: #ff8a86;
}

.pc-ctx-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 14px;
  width: 16px;
  text-align: center;
  color: var(--text-secondary);
  flex: 0 0 auto;
}

.pc-ctx-item--danger .pc-ctx-glyph {
  color: inherit;
}

.pc-ctx-label {
  flex: 1 1 auto;
  white-space: nowrap;
}

.pc-ctx-sep {
  height: 1px;
  margin: 4px 6px;
  background: color-mix(in srgb, var(--text-primary) 12%, transparent);
}
</style>
