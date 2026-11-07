<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { NotificationItem, NotificationSummary, Page } from '@/api/types'
import { navigate } from '@/router'
import { relativeTime } from '@/lib/format'
import { notify, notifyError } from '@/stores/ui'
import { sessionState, isSignedIn } from '@/stores/session'
import { unreadCount, unreadByType, refreshNotifications, clearUnread } from '@/stores/notifications'
import AuthorChip from '@/components/AuthorChip.vue'
import EmptyState from '@/components/EmptyState.vue'

const items = ref<NotificationItem[]>([])
const summary = ref<NotificationSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const marking = ref(false)

const TYPE_LABEL: Record<string, string> = {
  REPLY_CREATED: '回复了你的帖子',
  WORK_COMMENT_REPLY_CREATED: '回复了你的作品评论',
  USER_MENTIONED: '在帖子里提到了你',
  WORK_COMMENT_MENTIONED: '在作品评论里提到了你',
  MANAGEMENT_ACTION: '管理操作',
  POST_LIKED: '赞了你的帖子',
  TOPIC_EVENT: '帖子动态',
  USER_FOLLOWED: '关注了你',
  LEVEL_CERTIFICATION: '等级认证',
  WORK_COMMENT_CREATED: '评论了你的作品',
  WORK_LIKED: '赞了你的作品',
  WORK_COMMENT_LIKED: '赞了你的评论',
}

const TYPE_GLYPH: Record<string, string> = {
  REPLY_CREATED: '\uE90A',
  WORK_COMMENT_REPLY_CREATED: '\uE90A',
  WORK_COMMENT_CREATED: '\uE90A',
  TOPIC_EVENT: '\uE90A',
  POST_LIKED: '\uEB51',
  WORK_LIKED: '\uEB51',
  WORK_COMMENT_LIKED: '\uEB51',
  USER_MENTIONED: '\uE77B',
  WORK_COMMENT_MENTIONED: '\uE77B',
  USER_FOLLOWED: '\uE77B',
  LEVEL_CERTIFICATION: '\uE9D9',
  MANAGEMENT_ACTION: '\uE7BA',
}

const typeGlyph = (type: string): string => TYPE_GLYPH[type] ?? '\uE946'

/**
 * The payload puts the actors and targets under `details`, but the flat shape was
 * assumed here, so every row rendered "系统". Flatten it once, at the boundary.
 */
function normalize(item: NotificationItem): NotificationItem {
  const d = item.details ?? {}
  return {
    ...item,
    actor: item.actor ?? d.actor ?? null,
    topic: item.topic ?? d.topic ?? null,
    work: item.work ?? d.work ?? null,
    post: item.post ?? (d.post as NotificationItem['post']) ?? null,
  }
}

const unread = computed(() => summary.value?.unreadCount ?? 0)

async function load(): Promise<void> {
  if (!isSignedIn.value) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const [page, sum] = await Promise.all([
      api.get<Page<NotificationItem>>('/notifications', { limit: 20 }),
      api.get<NotificationSummary>('/notification-summary'),
    ])
    items.value = (page.items ?? []).map(normalize)
    summary.value = sum
    // Keep the sidebar badge in step with what this page just saw.
    unreadCount.value = Math.max(0, sum?.unreadCount ?? 0)
    unreadByType.value = sum?.unreadCountByType ?? {}
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function markAllRead(): Promise<void> {
  if (marking.value) return
  marking.value = true
  try {
    await api.patch('/notifications', { read: true })
    await load()
    // Clear the badge immediately, then let the server confirm.
    clearUnread()
    void refreshNotifications()
    notify('已全部标记为已读', '', 'Success')
  } catch (err) {
    notifyError(err, '操作失败')
  } finally {
    marking.value = false
  }
}

function target(item: NotificationItem): string {
  if (item.topic?.id) {
    const floor = item.post?.postNumber
    return floor ? `/forum/post/${item.topic.id}/${floor}` : `/forum/post/${item.topic.id}`
  }
  if (item.work?.id) return `/works/${item.work.id}`
  return ''
}

onMounted(load)
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">通知</h1>
          <p class="pc-page-subtitle">
            <template v-if="unread">你有 {{ unread }} 条未读通知。</template>
            <template v-else>暂时没有未读通知。</template>
          </p>
        </div>
        <Button v-if="isSignedIn && unread" :IsEnabled="!marking" @Click="markAllRead">
          全部已读
        </Button>
      </header>

      <EmptyState
        v-if="!isSignedIn && sessionState.ready"
        glyph="&#xE72E;"
        title="登录后才能查看通知"
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
        action-label="重试"
        @action="load"
      />

      <EmptyState v-else-if="!items.length" glyph="&#xE72E;" title="没有通知" description="有互动时会出现在这里。" />

      <div v-else class="pc-feed">
        <article
          v-for="item in items"
          :key="item.id"
          class="pc-card pc-card--interactive pc-feed-item"
          @click="target(item) && navigate(target(item))"
        >
          <div class="pc-feed-meta">
            <span class="pc-notif-icon">{{ typeGlyph(item.type) }}</span>
            <AuthorChip v-if="item.actor" :user="item.actor" />
            <span v-else class="pc-username">系统</span>
            <span class="pc-feed-notif-kind">{{ TYPE_LABEL[item.type] || item.type }}</span>
            <span class="pc-grow" />
            <span class="pc-muted">{{ relativeTime(item.createdAt) }}</span>
          </div>
          <p v-if="item.topic?.title || item.work?.workName" class="pc-feed-excerpt" style="margin: 0">
            {{ item.topic?.title || item.work?.workName }}
            <span v-if="item.post?.postNumber" class="pc-notif-post">#{{ item.post.postNumber }}</span>
          </p>
        </article>
      </div>
    </div>
  </div>
</template>

<style>
.pc-notif-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-primary) 7%, transparent);
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 16px;
  color: var(--text-secondary);
  flex: 0 0 auto;
}

.pc-feed-notif-kind {
  font-size: 12.5px;
  color: var(--text-secondary);
}
</style>
