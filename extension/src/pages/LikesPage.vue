<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api/client'
import type { Page } from '@/api/types'
import { navigate } from '@/router'
import { relativeTime } from '@/lib/format'
import { isSignedIn } from '@/stores/session'
import AuthorChip from '@/components/AuthorChip.vue'
import EmptyState from '@/components/EmptyState.vue'

interface LikeGroup {
  groupKey: string
  topicTitle?: string
  workName?: string
  count?: number
  likers?: { id: string; username: string; avatar?: { url: string } | null }[]
  createdAt?: string
}

const groups = ref<LikeGroup[]>([])
const loading = ref(true)

onMounted(async () => {
  if (!isSignedIn.value) {
    loading.value = false
    return
  }
  try {
    const page = await api.get<Page<LikeGroup>>('/like-notification-groups', { limit: 20 })
    groups.value = page.items ?? []
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <button class="pc-link" @click="navigate('/notifications')">← 返回通知</button>
          <h1 class="pc-page-title" style="margin-top: 8px">收到的赞</h1>
          <p class="pc-page-subtitle">按帖子／作品聚合的点赞记录。</p>
        </div>
      </header>

      <div v-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>

      <EmptyState v-else-if="!groups.length" glyph="&#xEB51;" title="还没有收到点赞" />

      <div v-else class="pc-feed">
        <article
          v-for="group in groups"
          :key="group.groupKey"
          class="pc-card pc-card--interactive"
          @click="navigate(`/notifications/likes/${group.groupKey}`)"
        >
          <div class="pc-feed-meta">
            <span class="pc-meta-glyph">&#xEB51;</span>
            <span class="pc-username">{{ group.topicTitle || group.workName || group.groupKey }}</span>
            <span class="pc-grow" />
            <span class="pc-muted">{{ relativeTime(group.createdAt) }}</span>
          </div>
          <div v-if="group.likers?.length" class="pc-row" style="margin-top: 8px; gap: 6px">
            <AuthorChip
              v-for="liker in group.likers.slice(0, 6)"
              :key="liker.id"
              :user="liker as never"
              :size="22"
              hide-name
            />
            <span class="pc-muted">{{ group.likers.length }} 人点赞</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
