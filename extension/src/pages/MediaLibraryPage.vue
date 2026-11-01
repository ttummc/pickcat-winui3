<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { Page } from '@/api/types'
import { navigate } from '@/router'
import { relativeTime } from '@/lib/format'
import { isSignedIn } from '@/stores/session'
import EmptyState from '@/components/EmptyState.vue'

/**
 * 个人图盘 — the site's own file board (not the works library).
 * Backed by /files (+ quotas); shapes are read defensively because the file
 * payloads are only reachable with a session.
 */
interface PcFile {
  id?: string
  url?: string
  name?: string
  filename?: string
  size?: number
  byteSize?: number
  contentType?: string
  mimeType?: string
  createdAt?: string
}

const files = ref<PcFile[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const quota = ref<{ used: number; limit: number } | null>(null)

const isImage = (file: PcFile): boolean => {
  const type = file.contentType ?? file.mimeType ?? ''
  if (type.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(file.url ?? file.name ?? file.filename ?? '')
}

const label = (file: PcFile): string => file.name ?? file.filename ?? file.id ?? '未命名文件'

function formatSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const percent = computed(() => {
  if (!quota.value || !quota.value.limit) return 0
  return Math.min(100, Math.round((quota.value.used / quota.value.limit) * 100))
})

onMounted(async () => {
  if (!isSignedIn.value) {
    loading.value = false
    return
  }
  try {
    const page = await api.get<Page<PcFile>>('/files', { limit: 40 })
    files.value = page.items ?? []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }

  try {
    const raw = await api.get<Record<string, unknown>>('/file-storage-quotas')
    const used = Number(raw.used ?? raw.usedBytes ?? raw.usage ?? NaN)
    const limit = Number(raw.limit ?? raw.quota ?? raw.total ?? NaN)
    if (Number.isFinite(used) && Number.isFinite(limit) && limit > 0) quota.value = { used, limit }
  } catch {
    quota.value = null
  }
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">个人图盘</h1>
          <p class="pc-page-subtitle">你在 PickCat 上传过的图片与文件。</p>
        </div>
        <div v-if="quota" class="pc-quota">
          <span class="pc-muted">{{ formatSize(quota.used) }} / {{ formatSize(quota.limit) }}</span>
          <span class="pc-quota-bar"><span :style="{ width: `${percent}%` }" /></span>
        </div>
      </header>

      <EmptyState
        v-if="!isSignedIn"
        glyph="&#xE8B7;"
        title="登录后才能查看个人图盘"
        action-label="去登录"
        @action="navigate('/login')"
      />

      <div v-else-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>

      <EmptyState
        v-else-if="error"
        glyph="&#xEA39;"
        title="加载失败"
        :description="error"
      />

      <EmptyState
        v-else-if="!files.length"
        glyph="&#xE8B7;"
        title="图盘还是空的"
        description="上传图片后会自动出现在这里。"
      />

      <div v-else class="pc-media-grid">
        <a
          v-for="file in files"
          :key="file.id ?? file.url"
          class="pc-media-item"
          :href="file.url || '#'"
          target="_blank"
          rel="noopener noreferrer"
          @click="!file.url && $event.preventDefault()"
        >
          <img v-if="isImage(file)" :src="file.url" :alt="label(file)" loading="lazy" />
          <span v-else class="pc-media-file-icon">&#xE8A5;</span>
          <span class="pc-media-meta">
            <span class="pc-media-name">{{ label(file) }}</span>
            <span class="pc-muted">
              {{ formatSize(file.size ?? file.byteSize) }}
              <template v-if="file.createdAt"> · {{ relativeTime(file.createdAt) }}</template>
            </span>
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<style>
.pc-quota {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-quota-bar {
  display: block;
  width: 140px;
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

.pc-media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.pc-media-item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  background: var(--card-bg);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--fast-duration, 0.167s) ease, transform var(--faster-duration, 0.083s) ease;
}

.pc-media-item:hover {
  border-color: color-mix(in srgb, var(--text-primary) 22%, transparent);
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
</style>
