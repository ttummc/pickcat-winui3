<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { api, PickCatApiError } from '@/api/client'
import type { Tag } from '@/api/types'
import { navigate } from '@/router'
import { notify, notifyError } from '@/stores/ui'
import { isSignedIn } from '@/stores/session'
import { renderMarkdown } from '@/lib/markdown'
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
  { key: 'image', label: '图片', glyph: '\uE8B9', run: () => wrap('![', '](https://)', '图片说明') },
]

function onKeydown(event: KeyboardEvent): void {
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

onMounted(async () => {
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

        <div class="pc-editor">
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
            </div>
          </div>

          <div class="pc-editor-split" :class="{ 'pc-editor-split--preview': showPreview }">
            <textarea
              ref="textareaRef"
              v-model="markdown"
              class="pc-editor-input"
              spellcheck="false"
              placeholder="支持 Markdown：**粗体**、`代码`、> 引用、- 列表、## 标题、![图片](链接)…"
              @keydown="onKeydown"
              @keydown.tab.prevent="onTab"
            />

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
              {{ charCount }} 字 · {{ wordCount }} 词 · 已选 {{ selected.length }} 个分类
            </span>
            <Button Style="AccentButtonStyle" :IsEnabled="canSubmit && !submitting" @Click="submit">
              <span class="pc-btn-content">{{ submitting ? '发布中…' : '发布主题' }}</span>
            </Button>
          </div>
        </div>

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

.pc-editor-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 380px;
  max-height: 520px;
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
  min-height: 380px;
  max-height: 520px;
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
  padding-right: 4px;
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
