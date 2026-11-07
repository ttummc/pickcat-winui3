<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { api, PickCatApiError } from '@/api/client'
import type { Tag } from '@/api/types'
import { navigate } from '@/router'
import { notify, notifyError } from '@/stores/ui'
import { isSignedIn } from '@/stores/session'
import { renderMarkdown } from '@/lib/markdown'
import { uploadFile, fileMarkdown } from '@/api/files'
import { sanitizeHtml } from '@/lib/html'
import RichHtml from '@/components/RichHtml.vue'
import EmptyState from '@/components/EmptyState.vue'

interface ToolButton {
  key: string
  label: string
  glyph: string
  run: () => void
}

const title = ref('')
const markdown = ref('')
const tags = ref<Tag[]>([])
const selected = ref<string[]>([])
const submitting = ref(false)
const error = ref<string | null>(null)
const showPreview = ref(true)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

/** Images currently being uploaded; the editor locks paste-upload while non-zero. */
const fullscreen = ref(false)
const uploading = ref(0)
const dragActive = ref(false)

const isUploading = computed(() => uploading.value > 0)

const previewHtml = computed(() => sanitizeHtml(renderMarkdown(markdown.value)))
const charCount = computed(() => markdown.value.length)
const wordCount = computed(() => markdown.value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean).length)

const canSubmit = computed(
  () =>
    isSignedIn.value &&
    title.value.trim().length > 0 &&
    markdown.value.trim().length > 0 &&
    selected.value.length > 0,
)

function el(): HTMLTextAreaElement | null {
  return textareaRef.value
}

function apply(next: string, selStart: number, selEnd: number): void {
  markdown.value = next
  void nextTick(() => {
    const node = el()
    if (!node) return
    node.focus()
    node.setSelectionRange(selStart, selEnd)
  })
}

/** Wrap the selection (or insert a placeholder) with `before` / `after`. */
function wrap(before: string, after = before, placeholder = '文本'): void {
  const node = el()
  if (!node) return
  const { selectionStart: start, selectionEnd: end } = node
  const value = markdown.value
  const picked = value.slice(start, end) || placeholder
  apply(
    value.slice(0, start) + before + picked + after + value.slice(end),
    start + before.length,
    start + before.length + picked.length,
  )
}

/** Prefix every touched line (lists, quotes, headings). */
function prefixLines(prefix: string): void {
  const node = el()
  if (!node) return
  const value = markdown.value
  const start = value.lastIndexOf('\n', Math.max(0, node.selectionStart - 1)) + 1
  const endIndex = value.indexOf('\n', node.selectionEnd)
  const end = endIndex === -1 ? value.length : endIndex
  const block = value.slice(start, end) || '文本'
  const next = block
    .split('\n')
    .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line))
    .join('\n')
  apply(value.slice(0, start) + next + value.slice(end), start, start + next.length)
}

const tools: ToolButton[] = [
  { key: 'bold', label: '粗体  Ctrl+B', glyph: '\uE8DD', run: () => wrap('**') },
  { key: 'italic', label: '斜体  Ctrl+I', glyph: '\uE8DB', run: () => wrap('*') },
  { key: 'strike', label: '删除线', glyph: '\uE8DE', run: () => wrap('~~') },
  { key: 'code', label: '行内代码  Ctrl+E', glyph: '\uE943', run: () => wrap('`') },
  { key: 'codeblock', label: '代码块', glyph: '\uE8A5', run: () => wrap('\n```\n', '\n```\n', '代码') },
  { key: 'quote', label: '引用', glyph: '\uE8BA', run: () => prefixLines('> ') },
  { key: 'list', label: '无序列表', glyph: '\uE8FD', run: () => prefixLines('- ') },
  { key: 'heading', label: '标题', glyph: '\uE8D2', run: () => prefixLines('## ') },
  { key: 'link', label: '链接  Ctrl+K', glyph: '\uE71B', run: () => wrap('[', '](https://)', '链接文字') },
  { key: 'table', label: '表格', glyph: '\uE80A', run: () => insertAt(TABLE_SNIPPET) },
  { key: 'rule', label: '分割线', glyph: '\uE738', run: () => insertAt('\n---\n') },
  { key: 'image', label: '上传图片（也可直接粘贴 / 拖入）', glyph: '\uE8B9', run: pickImages },
]

const TABLE_SNIPPET = '\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n'

/** Enter inside a list / quote continues it instead of ending it. */
function continueBlock(event: KeyboardEvent): boolean {
  const node = el()
  if (!node || event.key !== 'Enter' || event.shiftKey) return false
  const value = markdown.value
  const caret = node.selectionStart
  const lineStart = value.lastIndexOf('\n', Math.max(0, caret - 1)) + 1
  const line = value.slice(lineStart, caret)

  const match = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line)
  if (match) {
    // Empty item: drop the marker instead of starting a new one.
    if (!match[3].trim()) {
      event.preventDefault()
      apply(value.slice(0, lineStart) + value.slice(caret), lineStart, lineStart)
      return true
    }
    const marker = /^\d+\.$/.test(match[2]) ? `${Number.parseInt(match[2], 10) + 1}.` : match[2]
    event.preventDefault()
    const addition = `\n${match[1]}${marker} `
    apply(value.slice(0, caret) + addition + value.slice(caret), caret + addition.length, caret + addition.length)
    return true
  }

  const quote = /^(\s*)>\s?(.*)$/.exec(line)
  if (quote) {
    event.preventDefault()
    if (!quote[2].trim()) {
      apply(value.slice(0, lineStart) + value.slice(caret), lineStart, lineStart)
      return true
    }
    const addition = `\n${quote[1]}> `
    apply(value.slice(0, caret) + addition + value.slice(caret), caret + addition.length, caret + addition.length)
    return true
  }

  return false
}

function onKeydown(event: KeyboardEvent): void {
  if (continueBlock(event)) return

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void submit()
    return
  }

  if (!(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()
  const map: Record<string, () => void> = {
    b: () => wrap('**'),
    i: () => wrap('*'),
    e: () => wrap('`'),
    k: () => wrap('[', '](https://)', '链接文字'),
  }
  const action = map[key]
  if (!action) return
  event.preventDefault()
  action()
}

/** Tab inserts two spaces instead of leaving the editor. */
function onTab(event: KeyboardEvent): void {
  const node = el()
  if (!node || event.shiftKey) return
  event.preventDefault()
  const { selectionStart: start, selectionEnd: end } = node
  const value = markdown.value
  apply(value.slice(0, start) + '  ' + value.slice(end), start + 2, start + 2)
}

/** Insert text at the caret and keep it selected-free afterwards. */
function insertAt(text: string): void {
  const node = el()
  if (!node) {
    markdown.value += text
    return
  }
  const { selectionStart: start, selectionEnd: end } = node
  const value = markdown.value
  const before = value.slice(0, start)
  const after = value.slice(end)
  // Images read better on their own line.
  const prefix = before && !before.endsWith('\n') ? '\n' : ''
  const suffix = after && !after.startsWith('\n') ? '\n' : ''
  apply(before + prefix + text + suffix + after, start + prefix.length + text.length, start + prefix.length + text.length)
}

/**
 * Pasting an image uploads it to the site's file storage (the same files the media
 * library lists) and drops a markdown tag in place.
 */
async function uploadImages(files: File[]): Promise<void> {
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (!images.length) return
  if (!isSignedIn.value) {
    notify('请先登录', '上传图片需要登录状态', 'Warning')
    return
  }

  uploading.value += images.length
  try {
    for (const image of images) {
      const name = image.name || '粘贴的图片'
      try {
        const stored = await uploadFile(image)
        insertAt(fileMarkdown(stored, name.replace(/\.[^.]+$/, '')))
        notify('图片已上传', `${name} 已存入个人图盘`, 'Success')
      } catch (err) {
        notifyError(err, '图片上传失败')
      } finally {
        uploading.value -= 1
      }
    }
  } finally {
    uploading.value = Math.max(0, uploading.value)
  }
}

function onPaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (!files.length) return
  // Prevent the browser from pasting a filename string into the textarea.
  event.preventDefault()
  void uploadImages(files)
}

function onDrop(event: DragEvent): void {
  dragActive.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (!files.some((f) => f.type.startsWith('image/'))) return
  event.preventDefault()
  void uploadImages(files)
}

function onDragOver(event: DragEvent): void {
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragActive.value = true
}

function onDragLeave(): void {
  dragActive.value = false
}

/**
 * Fullscreen here means the editor fills the window (固定定位), not the browser's
 * Fullscreen API: that needs a user gesture on an element the page owns, and it
 * behaves differently inside WebView2.
 */
const FULL_LOCK = 'pc-editor-full'

function applyFullscreenLock(on: boolean): void {
  document.documentElement.classList.toggle(FULL_LOCK, on)
  // Measure the real title bar so the overlay starts right below it instead of
  // guessing a constant.
  const host = document.querySelector('.pc-titlebar-host')
  const height = host?.getBoundingClientRect().height ?? 32
  document.documentElement.style.setProperty('--pc-titlebar-height', `${Math.round(height)}px`)
}

watch(fullscreen, applyFullscreenLock)
onBeforeUnmount(() => applyFullscreenLock(false))

function toggleFullscreen(): void {
  fullscreen.value = !fullscreen.value
}

function onFullscreenKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && fullscreen.value) {
    event.preventDefault()
    fullscreen.value = false
    return
  }
  // Ctrl+Shift+F also toggles, matching most editors.
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    toggleFullscreen()
  }
}

function pickImages(): void {
  fileInputRef.value?.click()
}

function onFilesPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  void uploadImages(files)
}

watch([title, markdown], scheduleSave)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onFullscreenKey, true)
  window.clearTimeout(draftTimer)
  saveDraft()
})

onMounted(async () => {
  window.addEventListener('keydown', onFullscreenKey, true)
  restoreDraft()
  try {
    const result = await api.get<{ items: Tag[] }>('/tags', { assignable: 'true' })
    tags.value = result.items ?? []
  } catch {
    try {
      const fallback = await api.get<{ items: Tag[] }>('/tags')
      tags.value = fallback.items ?? []
    } catch {
      tags.value = []
    }
  }
})

const DRAFT_KEY = 'pickcat-composer-draft'

/** Keep the draft on this machine so a reload does not lose the writing. */
function saveDraft(): void {
  try {
    if (!markdown.value && !title.value) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: title.value, markdown: markdown.value, at: Date.now() }))
  } catch {
    /* storage can be unavailable; drafts are a convenience, not a requirement */
  }
}

function restoreDraft(): void {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const draft = JSON.parse(raw) as { title?: string; markdown?: string }
    if (!draft.markdown && !draft.title) return
    title.value = draft.title ?? ''
    markdown.value = draft.markdown ?? ''
    notify('已恢复草稿', '上次未发布的主题已经恢复', 'Informational')
  } catch {
    /* ignore malformed drafts */
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

let draftTimer = 0
function scheduleSave(): void {
  window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(saveDraft, 600)
}

function toggleTag(id: string): void {
  const index = selected.value.indexOf(id)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(id)
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = null
  try {
    await api.post('/posts', {
      title: title.value.trim(),
      markdown: markdown.value.trim(),
      tagIds: selected.value,
    })
    clearDraft()
    notify('已发布', '你的主题已经发布', 'Success')
    navigate('/forum')
  } catch (err) {
    if (err instanceof PickCatApiError) {
      error.value = err.message
      if (err.status === 422) notify('内容未通过审核', err.message, 'Warning')
      else notifyError(err, '发布失败')
    } else {
      error.value = '发布失败'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <button class="pc-link" @click="navigate('/forum')">← 返回论坛</button>
          <h1 class="pc-page-title" style="margin-top: 8px">发布新主题</h1>
          <p class="pc-page-subtitle">标题写清楚，正文用 Markdown，右侧实时预览。</p>
        </div>
      </header>

      <EmptyState
        v-if="!isSignedIn"
        glyph="&#xE70F;"
        title="登录后才能发帖"
        action-label="去登录"
        @action="navigate('/login')"
      />

      <div v-else class="pc-composer">
        <div class="pc-composer-meta">
          <label class="pc-field-label">标题</label>
          <TextBox v-model:Text="title" PlaceholderText="一句话说清楚你想聊什么" :MaxLength="120" />

          <label class="pc-field-label" style="margin-top: 14px">分类</label>
          <div class="pc-tags">
            <button
              v-for="tag in tags"
              :key="tag.id"
              class="pc-tag"
              :class="{ 'pc-tag--accent': selected.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              #{{ tag.name }}
            </button>
          </div>
        </div>

        <Teleport to="#pickcat-root" :disabled="!fullscreen">
          <div class="pc-editor" :class="{ 'pc-editor--full': fullscreen }">
          <div class="pc-editor-bar">
            <div class="pc-editor-tools">
              <button
                v-for="tool in tools"
                :key="tool.key"
                class="pc-tool-btn"
                type="button"
                :title="tool.label"
                :aria-label="tool.label"
                @mousedown.prevent
                @click="tool.run()"
              >
                {{ tool.glyph }}
              </button>
            </div>

            <div class="pc-editor-bar-right">
              <button
                class="pc-tool-btn pc-tool-btn--wide"
                type="button"
                :class="{ 'pc-tool-btn--on': showPreview }"
                title="切换预览"
                @click="showPreview = !showPreview"
              >
                <span class="pc-tool-glyph">&#xE890;</span>
                <span>预览</span>
              </button>

              <button
                class="pc-tool-btn pc-tool-btn--wide"
                type="button"
                :class="{ 'pc-tool-btn--on': fullscreen }"
                :title="fullscreen ? '退出全屏  Esc' : '全屏编辑  Ctrl+Shift+F'"
                @click="toggleFullscreen"
              >
                <span class="pc-tool-glyph">{{ fullscreen ? '\uE73F' : '\uE740' }}</span>
                <span>{{ fullscreen ? '退出全屏' : '全屏' }}</span>
              </button>
            </div>
          </div>

          <div class="pc-editor-split" :class="{ 'pc-editor-split--preview': showPreview }">
            <textarea
              ref="textareaRef"
              v-model="markdown"
              class="pc-editor-input"
              spellcheck="false"
              placeholder="支持 Markdown；图片可以直接 Ctrl+V 粘贴或拖进来，会自动上传到个人图盘"
              @keydown="onKeydown"
              @keydown.tab.prevent="onTab"
              @paste="onPaste"
              @drop="onDrop"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
            />

            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              multiple
              hidden
              @change="onFilesPicked"
            />

            <div v-if="dragActive" class="pc-editor-drop">
              <span class="pc-editor-drop-glyph">&#xE8B9;</span>
              <span>松开即可上传到个人图盘</span>
            </div>

            <div v-if="showPreview" class="pc-editor-preview">
              <div class="pc-editor-pane-label">预览</div>
              <div class="pc-editor-preview-scroll">
                <RichHtml v-if="markdown.trim()" :html="previewHtml" />
                <p v-else class="pc-muted" style="margin: 0">左边写点什么，这里会实时渲染。</p>
              </div>
            </div>
          </div>

          <div class="pc-editor-footer">
            <span class="pc-muted">
              <template v-if="isUploading">
                正在上传 {{ uploading }} 张图片…
              </template>
              <template v-else>
                {{ charCount }} 字 · {{ wordCount }} 词 · 已选 {{ selected.length }} 个分类
              </template>
            </span>
            <Button Style="AccentButtonStyle" :IsEnabled="canSubmit && !submitting" @Click="submit">
              <span class="pc-btn-content">{{ submitting ? '发布中…' : '发布主题' }}</span>
            </Button>
          </div>
          </div>
        </Teleport>

        <div v-if="error">
          <InfoBar IsOpen="True" Title="发布失败" :Message="error" Severity="Error" IsClosable="True" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.pc-composer {
  max-width: 1180px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-composer-meta {
  background: var(--card-bg);
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  border-radius: 8px;
  padding: 14px 16px;
}

.pc-field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.pc-editor {
  background: var(--card-bg);
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pc-editor-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-editor-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.pc-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background var(--fast-duration, 0.167s) ease, color var(--fast-duration, 0.167s) ease,
    border-color var(--fast-duration, 0.167s) ease;
}

.pc-tool-btn:hover {
  background: color-mix(in srgb, var(--text-primary) 7%, transparent);
  color: var(--text-primary);
}

.pc-tool-btn:active {
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-tertiary);
}

.pc-tool-btn--on {
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 18%, transparent);
  color: var(--pc-accent, #ff6b60);
  border-color: color-mix(in srgb, var(--pc-accent, #ff6b60) 35%, transparent);
}

.pc-tool-btn--wide {
  font-family: inherit;
  font-size: 12.5px;
  padding: 0 10px;
}

.pc-tool-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 14px;
}

/* The split needs a definite height, otherwise the preview grows with its content
   and the whole page scrolls instead of the pane. */
.pc-editor-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  height: clamp(380px, 58vh, 640px);
}

.pc-editor-split--preview {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

@media (max-width: 1000px) {
  .pc-editor-split--preview {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pc-editor-input {
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-primary);
  font-family: 'Cascadia Code', Consolas, 'Microsoft YaHei UI', monospace;
  font-size: 13.5px;
  line-height: 22px;
  padding: 14px 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  tab-size: 2;
}

.pc-editor-input::placeholder {
  color: var(--text-tertiary);
  font-family: 'Segoe UI Variable Text', 'Microsoft YaHei UI', sans-serif;
}

.pc-editor-input::-webkit-scrollbar {
  width: 10px;
}
.pc-editor-input::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border: 2px solid transparent;
  background-clip: content-box;
  border-radius: 5px;
}

.pc-editor-preview {
  border-left: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 10px 14px 14px;
  gap: 8px;
}

.pc-editor-pane-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
}

.pc-editor-preview-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
}

/* own scrollbar, so the pane reads as a separate surface */
.pc-editor-preview-scroll::-webkit-scrollbar {
  width: 10px;
}

.pc-editor-preview-scroll::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border: 2px solid transparent;
  background-clip: content-box;
  border-radius: 5px;
}

.pc-editor-preview-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
  background-clip: content-box;
}

.pc-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
}
</style>
