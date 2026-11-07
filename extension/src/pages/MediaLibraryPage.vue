<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigate } from '@/router'
import { relativeTime } from '@/lib/format'
import { isSignedIn } from '@/stores/session'
import { notify, notifyError } from '@/stores/ui'
import {
  listFiles,
  fetchStorage,
  uploadFile,
  trashFile,
  restoreFile,
  purgeFile,
  type StoredFile,
  type FileState,
  type FileStorage,
} from '@/api/files'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'

/**
 * 个人图盘 — the site's own file board.
 *
 * Endpoints (verified against the site's client):
 *   GET /files?scope=OWN&state=READY|DELETED  — gallery and recycle bin
 *   GET /file-storage                          — limitBytes / remainingBytes
 *   PUT /files/{id}/deletion                   — move to the bin
 *   PATCH /files/{id}/deletion {state: RESTORED} — restore
 *   PATCH /files/{id}/deletion {}              — delete for good
 */
const state = ref<FileState>('READY')
const files = ref<StoredFile[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const storage = ref<FileStorage | null>(null)
const storageError = ref(false)

const selected = ref<string[]>([])

const uploading = ref(0)
const busy = ref(false)
const dragActive = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const tabs = computed(() => [
  { key: 'READY', label: '图库' },
  { key: 'DELETED', label: '回收站' },
])

const inTrash = computed(() => state.value === 'DELETED')
const allSelected = computed(() => files.value.length > 0 && selected.value.length === files.value.length)

function fileUrl(file: StoredFile): string {
  return `https://pickcat.dao3.fun/api/v1/files/${file.id}`
}

const failed = ref<Record<string, boolean>>({})

/** Dimensions come free with the <img> that already renders the thumbnail. */
const dimensions = ref<Record<string, string>>({})

function onImageLoad(file: StoredFile, event: Event): void {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    dimensions.value[file.id] = `${img.naturalWidth}×${img.naturalHeight}`
  }
}

function label(file: StoredFile): string {
  return file.name || file.id
}

/**
 * The listing response carries no size field, so "0 B" was a lie. Print nothing
 * when the number is unknown and let the card fall back to dimensions / date.
 */
function formatSize(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const UNLIMITED = 2 ** 53 - 1

const unlimited = computed(() => (storage.value?.limitBytes ?? 0) >= UNLIMITED)

const usedBytes = computed(() => {
  const s = storage.value
  if (!s) return 0
  if (typeof s.usedBytes === 'number') return s.usedBytes
  return Math.max(0, (s.limitBytes ?? 0) - (s.remainingBytes ?? 0))
})

const usedPercent = computed(() => {
  const limit = storage.value?.limitBytes ?? 0
  if (!limit || unlimited.value) return 0
  return Math.min(100, Math.round((usedBytes.value / limit) * 100))
})

const lowSpace = computed(() => usedPercent.value >= 90)

async function loadStorage(): Promise<void> {
  storageError.value = false
  try {
    storage.value = await fetchStorage()
  } catch {
    storage.value = null
    storageError.value = true
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  selected.value = []
  cursor.value = undefined
  try {
    const page = await listFiles(state.value)
    files.value = page.items ?? []
    cursor.value = page.pageInfo?.nextCursor ?? undefined
    hasMore.value = Boolean(page.pageInfo?.hasNextPage && cursor.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    files.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore(): Promise<void> {
  if (!hasMore.value || loadingMore.value || !cursor.value) return
  loadingMore.value = true
  try {
    const page = await listFiles(state.value, cursor.value)
    files.value = [...files.value, ...(page.items ?? [])]
    cursor.value = page.pageInfo?.nextCursor ?? undefined
    hasMore.value = Boolean(page.pageInfo?.hasNextPage && cursor.value)
  } catch (err) {
    notifyError(err, '加载更多失败')
  } finally {
    loadingMore.value = false
  }
}

function switchTab(next: string): void {
  state.value = next as FileState
  void load()
}

function toggleSelect(id: string): void {
  const index = selected.value.indexOf(id)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(id)
}

function selectAll(): void {
  selected.value = allSelected.value ? [] : files.value.map((f) => f.id)
}

function openFile(file: StoredFile): void {
  window.open(fileUrl(file), '_blank', 'noopener')
}

async function runBatch(action: 'trash' | 'restore' | 'purge'): Promise<void> {
  if (busy.value) return
  const ids = [...selected.value]
  if (!ids.length) return
  busy.value = true
  let ok = 0
  let failedCount = 0
  for (const id of ids) {
    try {
      if (action === 'trash') await trashFile(id)
      else if (action === 'restore') await restoreFile(id)
      else await purgeFile(id)
      ok += 1
    } catch (err) {
      failedCount += 1
      if (failedCount === 1) notifyError(err, '操作失败')
    }
  }
  busy.value = false
  selected.value = []
  await Promise.all([load(), loadStorage()])
  const verb = action === 'trash' ? '移入回收站' : action === 'restore' ? '恢复' : '彻底删除'
  if (ok) notify(`已${verb} ${ok} 个文件`, failedCount ? `${failedCount} 个失败` : '', 'Success')
}

function pickFiles(): void {
  fileInputRef.value?.click()
}

async function uploadFiles(list: File[]): Promise<void> {
  if (!list.length) return
  uploading.value += list.length
  let ok = 0
  for (const file of list) {
    try {
      await uploadFile(file)
      ok += 1
    } catch (err) {
      notifyError(err, `上传 ${file.name} 失败`)
    } finally {
      uploading.value -= 1
    }
  }
  if (ok) notify(`已上传 ${ok} 张图片`, '已存入个人图盘', 'Success')
  await Promise.all([load(), loadStorage()])
}

function onFilesPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const list = Array.from(input.files ?? [])
  input.value = ''
  void uploadFiles(list)
}

function onDrop(event: DragEvent): void {
  dragActive.value = false
  const list = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
  if (!list.length) return
  event.preventDefault()
  void uploadFiles(list)
}

function onDragOver(event: DragEvent): void {
  if (!isSignedIn.value || inTrash.value) return
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragActive.value = true
}

onMounted(async () => {
  if (!isSignedIn.value) {
    loading.value = false
    return
  }
  await Promise.all([load(), loadStorage()])
})
</script>

<template>
  <div class="pc-page" @dragover="onDragOver" @dragleave="dragActive = false" @drop="onDrop">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">个人图盘</h1>
          <p class="pc-page-subtitle">发帖时粘贴的图片会先存在这里。</p>
        </div>

        <div v-if="isSignedIn" class="pc-storage">
          <div class="pc-storage-line">
            <span :class="{ 'pc-storage-low': lowSpace }">
              已用 {{ formatSize(usedBytes) || '0 B' }}
              <template v-if="!unlimited && storage"> / {{ formatSize(storage.limitBytes) }}</template>
            </span>
            <span v-if="storageError" class="pc-muted">额度读取失败</span>
            <span v-else-if="unlimited" class="pc-muted">无上限</span>
            <span v-else class="pc-muted">{{ usedPercent }}%</span>
          </div>
          <span v-if="!unlimited" class="pc-quota-bar">
            <span :class="{ 'pc-quota-bar--low': lowSpace }" :style="{ width: `${usedPercent}%` }" />
          </span>
        </div>
      </header>

      <EmptyState
        v-if="!isSignedIn"
        glyph="&#xE8B7;"
        title="登录后才能使用个人图盘"
        action-label="去登录"
        @action="navigate('/login')"
      />

      <template v-else>
        <div class="pc-media-toolbar">
          <PcSelector :model-value="state" :tabs="tabs" @update:model-value="switchTab" />

          <span class="pc-grow" />

          <template v-if="files.length">
            <button class="pc-link" @click="selectAll">
              {{ allSelected ? '取消全选' : '全选' }}
            </button>
            <span v-if="selected.length" class="pc-muted">{{ selected.length }} 项已选</span>
          </template>

          <Button v-if="!inTrash" Style="AccentButtonStyle" :IsEnabled="!uploading" @Click="pickFiles">
            <span class="pc-btn-content">
              <span class="pc-btn-icon">&#xE898;</span>
              {{ uploading ? `上传中 ${uploading}…` : '上传图片' }}
            </span>
          </Button>
        </div>

        <!-- batch actions -->
        <div v-if="selected.length" class="pc-media-actions">
          <Button v-if="!inTrash" :IsEnabled="!busy" @Click="runBatch('trash')">
            <span class="pc-btn-content">移入回收站</span>
          </Button>
          <template v-else>
            <Button :IsEnabled="!busy" @Click="runBatch('restore')">
              <span class="pc-btn-content">恢复</span>
            </Button>
            <Button :IsEnabled="!busy" @Click="runBatch('purge')">
              <span class="pc-btn-content">彻底删除</span>
            </Button>
          </template>
          <Button :IsEnabled="!busy" @Click="selected = []">
            <span class="pc-btn-content">取消选择</span>
          </Button>
        </div>

        <input ref="fileInputRef" type="file" accept="image/*" multiple hidden @change="onFilesPicked" />

        <div v-if="loading" class="pc-spin">
          <ProgressRing IsActive="True" :Width="32" :Height="32" />
        </div>

        <EmptyState v-else-if="error" glyph="&#xEA39;" title="加载失败" :description="error" />

        <EmptyState
          v-else-if="!files.length"
          :glyph="inTrash ? '&#xE74D;' : '&#xE8B7;'"
          :title="inTrash ? '回收站是空的' : '图盘还是空的'"
          :description="inTrash ? '删除的图片会先放在这里。' : '发帖时粘贴图片，或点右上角上传。'"
        />

        <div v-else class="pc-media-grid">
          <div
            v-for="file in files"
            :key="file.id"
            class="pc-media-item"
            :class="{ 'pc-media-item--on': selected.includes(file.id) }"
            @click="toggleSelect(file.id)"
          >
            <img
              v-if="!failed[file.id]"
              :src="fileUrl(file)"
              :alt="label(file)"
              loading="lazy"
              decoding="async"
              @load="onImageLoad(file, $event)"
              @error="failed[file.id] = true"
            />
            <span v-else class="pc-media-file-icon">&#xE8A5;</span>

            <span class="pc-media-check" :class="{ 'pc-media-check--on': selected.includes(file.id) }">
              <span v-if="selected.includes(file.id)">&#xE73E;</span>
            </span>

            <span v-if="!inTrash" class="pc-media-open" title="查看原图" @click.stop="openFile(file)">
              &#xE8A7;
            </span>

            <span class="pc-media-meta">
              <span class="pc-media-name">{{ label(file) }}</span>
              <span class="pc-muted">
                <template v-if="formatSize(file.size)">{{ formatSize(file.size) }} · </template>
                <template v-else-if="dimensions[file.id]">{{ dimensions[file.id] }} · </template>
                <template v-if="inTrash && file.deletedAt">{{ relativeTime(file.deletedAt) }}删除</template>
                <template v-else-if="file.createdAt">{{ relativeTime(file.createdAt) }}</template>
              </span>
            </span>
          </div>
        </div>

        <div v-if="hasMore && !loading" class="pc-media-more">
          <Button :IsEnabled="!loadingMore" @Click="loadMore">
            <span class="pc-btn-content">{{ loadingMore ? '加载中…' : '加载更多' }}</span>
          </Button>
        </div>

        <div v-if="dragActive" class="pc-media-drop">
          <span class="pc-editor-drop-glyph">&#xE898;</span>
          <span>松开即可上传到个人图盘</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.pc-storage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.pc-storage-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pc-storage-low {
  color: var(--pc-accent, #ff6b60);
  font-weight: 600;
}

.pc-quota-bar {
  display: block;
  width: 180px;
  height: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--text-primary) 12%, transparent);
  overflow: hidden;
}

.pc-quota-bar > span {
  display: block;
  height: 100%;
  background: var(--pc-accent, #ff6b60);
  border-radius: 3px;
  transition: width var(--normal-duration, 0.2s) ease;
}

.pc-quota-bar > .pc-quota-bar--low {
  background: #ff4d4f;
}

.pc-media-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pc-media-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--pc-accent, #ff6b60) 35%, transparent);
}

.pc-media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.pc-media-item {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  background: var(--card-bg);
  cursor: pointer;
  transition: border-color var(--fast-duration, 0.167s) ease;
}

.pc-media-item:hover {
  border-color: color-mix(in srgb, var(--text-primary) 24%, transparent);
}

.pc-media-item--on {
  border-color: var(--pc-accent, #ff6b60);
  box-shadow: 0 0 0 1px var(--pc-accent, #ff6b60);
}

.pc-media-item img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
}

.pc-media-file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 28px;
  color: var(--text-tertiary);
}

.pc-media-check {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #000000a6;
  border: 1px solid #ffffff66;
  color: #fff;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 12px;
  opacity: 0;
  transition: opacity var(--fast-duration, 0.167s) ease;
}

.pc-media-item:hover .pc-media-check,
.pc-media-check--on {
  opacity: 1;
}

.pc-media-check--on {
  background: var(--pc-accent, #ff6b60);
  border-color: transparent;
}

.pc-media-open {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #000000a6;
  color: #fff;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 13px;
  opacity: 0;
  transition: opacity var(--fast-duration, 0.167s) ease;
}

.pc-media-item:hover .pc-media-open {
  opacity: 1;
}

.pc-media-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  min-width: 0;
}

.pc-media-name {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-media-more {
  display: flex;
  justify-content: center;
  padding: 18px 0 4px;
}

.pc-media-drop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: color-mix(in srgb, var(--app-bg, #202020) 82%, transparent);
  border: 2px dashed var(--pc-accent, #ff6b60);
  color: var(--text-primary);
  font-size: 14px;
  pointer-events: none;
}
</style>
