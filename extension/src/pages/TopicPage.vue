<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, PickCatApiError } from '@/api/client'
import type { TopicDetail, Post, Page } from '@/api/types'
import { route, navigate } from '@/router'
import { relativeTime, compactNumber } from '@/lib/format'
import { notify, notifyError } from '@/stores/ui'
import { sessionState } from '@/stores/session'
import {
  createBookmark,
  deleteBookmark,
  reportPost,
  REPORT_REASONS,
} from '@/api/interactions'
import AuthorChip from '@/components/AuthorChip.vue'
import RichHtml from '@/components/RichHtml.vue'
import EmptyState from '@/components/EmptyState.vue'

const topicId = computed(() => route.params.id ?? '')
const topic = ref<TopicDetail | null>(null)
const posts = ref<Post[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const replyText = ref('')
const replying = ref(false)
const replyTo = ref<Post | null>(null)
const likedPosts = ref<Record<string, boolean>>({})
const likeCounts = ref<Record<string, number>>({})

async function load(): Promise<void> {
  if (!topicId.value) return
  loading.value = true
  error.value = null
  try {
    const detail = await api.get<TopicDetail>(`/topics/${topicId.value}`)
    topic.value = detail
    if (detail.firstPost) seedPost(detail.firstPost)

    const result = await api.get<Page<Post>>(`/topics/${topicId.value}/posts`, {
      limit: 50,
      sort: 'earliest',
    })
    posts.value = result.items ?? []
    for (const post of posts.value) seedPost(post)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    topic.value = null
  } finally {
    loading.value = false
  }
}

function seedPost(post: Post): void {
  likedPosts.value[post.id] = Boolean(post.viewerState?.liked)
  likeCounts.value[post.id] = post.likeCount ?? 0
}

onMounted(load)
watch(topicId, load)

async function toggleLike(post: Post): Promise<void> {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  const next = !likedPosts.value[post.id]
  likedPosts.value[post.id] = next
  likeCounts.value[post.id] = Math.max(0, (likeCounts.value[post.id] ?? 0) + (next ? 1 : -1))
  try {
    if (next) await api.put(`/posts/${post.id}/like`)
    else await api.del(`/posts/${post.id}/like`)
  } catch (err) {
    likedPosts.value[post.id] = !next
    likeCounts.value[post.id] = Math.max(0, (likeCounts.value[post.id] ?? 0) + (next ? -1 : 1))
    notifyError(err, '点赞失败')
  }
}

async function submitReply(): Promise<void> {
  const markdown = replyText.value.trim()
  if (!markdown || replying.value) return
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  replying.value = true
  try {
    await api.post('/posts', {
      topicId: topicId.value,
      markdown,
      ...(replyTo.value ? { replyToPostNumber: replyTo.value.postNumber } : {}),
    })
    replyText.value = ''
    replyTo.value = null
    notify('已发布', '回复已发送', 'Success')
    await load()
  } catch (err) {
    if (err instanceof PickCatApiError && err.code === 'PARTICIPATION_LEVEL_REQUIRED') {
      // The server rejects level-0 accounts; say so instead of failing silently.
      notify('等级不够', '社区等级达到 Lv.1 才能发帖和回复（需要通过入站考试）', 'Warning')
    } else if (err instanceof PickCatApiError && err.status === 422) {
      notify('内容未通过审核', err.message, 'Warning')
    } else {
      notifyError(err, '回复失败')
    }
  } finally {
    replying.value = false
  }
}

function startReply(post: Post): void {
  replyTo.value = post
  replyText.value = `@${post.author.username} `
  document.querySelector('.pc-reply-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ---------------------------------------------------------------- bookmark (收藏)

const bookmarkId = ref<string | null>(null)
const bookmarkCount = ref(0)
const bookmarking = ref(false)

watch(
  topic,
  (value) => {
    bookmarkId.value = value?.viewerState?.bookmarkId ?? null
    bookmarkCount.value = value?.bookmarkCount ?? 0
  },
  { immediate: true },
)

async function toggleBookmark(): Promise<void> {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  if (bookmarking.value) return
  bookmarking.value = true
  const wasBookmarked = Boolean(bookmarkId.value)
  try {
    if (wasBookmarked) {
      await deleteBookmark(bookmarkId.value as string)
      bookmarkId.value = null
      bookmarkCount.value = Math.max(0, bookmarkCount.value - 1)
      notify('已取消收藏', '', 'Informational')
    } else {
      bookmarkId.value = (await createBookmark('TOPIC', topicId.value)) || 'created'
      bookmarkCount.value += 1
      notify('已收藏', '可以在个人主页的收藏里找到', 'Success')
    }
  } catch (err) {
    notifyError(err, wasBookmarked ? '取消收藏失败' : '收藏失败')
  } finally {
    bookmarking.value = false
  }
}

// ---------------------------------------------------------------- report (举报)

const reportTarget = ref<Post | null>(null)
const reportDetail = ref('')
const reporting = ref(false)

function openReport(post: Post): void {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  reportTarget.value = post
  reportDetail.value = ''
}

function closeReport(): void {
  reportTarget.value = null
  reportDetail.value = ''
}

async function submitReport(reasonCode: string): Promise<void> {
  const post = reportTarget.value
  if (!post || reporting.value) return
  reporting.value = true
  try {
    await reportPost(post.id, reasonCode, reportDetail.value.trim() || undefined)
    notify('已提交举报', '会由管理员处理', 'Success')
    closeReport()
  } catch (err) {
    notifyError(err, '举报失败')
  } finally {
    reporting.value = false
  }
}

</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <div v-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="36" :Height="36" />
      </div>

      <EmptyState
        v-else-if="error"
        glyph="&#xEA39;"
        title="无法打开这个帖子"
        :description="error"
        action-label="返回论坛"
        @action="navigate('/forum')"
      />

      <template v-else-if="topic">
        <button class="pc-link" @click="navigate('/forum')">← 返回论坛</button>

        <header class="pc-topic-header">
          <h1 class="pc-topic-title">
            <span v-if="topic.pinned" class="pc-pin">&#xE718;</span>{{ topic.title }}
          </h1>
          <div v-if="topic.tags?.length" class="pc-tags">
            <button
              v-for="tag in topic.tags"
              :key="tag.id"
              class="pc-tag pc-tag--accent"
              @click="navigate(`/forum/category/${encodeURIComponent(tag.slug)}`)"
            >
              #{{ tag.name }}
            </button>
          </div>
          <div class="pc-feed-meta" style="margin-top: 4px">
            <span class="pc-meta-item">浏览 {{ compactNumber(topic.viewCount) }}</span>
            <span class="pc-meta-item">回复 {{ compactNumber(topic.replyCount) }}</span>
            <span class="pc-meta-item">点赞 {{ compactNumber(topic.likeCount) }}</span>
            <span class="pc-meta-item">收藏 {{ compactNumber(bookmarkCount) }}</span>
            <span class="pc-meta-item">{{ relativeTime(topic.createdAt) }}</span>
          </div>
          <div class="pc-topic-actions">
            <button
              class="pc-action pc-action--pill"
              :class="{ 'pc-action--on': Boolean(bookmarkId) }"
              :disabled="bookmarking"
              @click="toggleBookmark"
            >
              <span class="pc-meta-glyph">&#xE734;</span>
              {{ bookmarkId ? '已收藏' : '收藏' }}
            </button>
          </div>
        </header>

        <article v-if="topic.firstPost" class="pc-card pc-post">
          <div class="pc-post-head">
            <AuthorChip :user="topic.firstPost.author" :size="36" />
            <span class="pc-grow" />
            <span class="pc-muted">{{ relativeTime(topic.firstPost.createdAt) }}</span>
          </div>
          <RichHtml :html="topic.firstPost.cookedHtml" />
          <div class="pc-post-actions">
            <button
              class="pc-action"
              :class="{ 'pc-action--on': likedPosts[topic.firstPost.id] }"
              @click="toggleLike(topic.firstPost)"
            >
              <span class="pc-meta-glyph">&#xEB51;</span>
              {{ compactNumber(likeCounts[topic.firstPost.id]) }}
            </button>
            <button class="pc-action" @click="startReply(topic.firstPost)">
              <span class="pc-meta-glyph">&#xE90A;</span> 回复
            </button>
          </div>
        </article>

        <h2 class="pc-section-title" style="margin-top: 28px">
          全部回复
          <span class="pc-muted" style="font-weight: 400">{{ posts.length }}</span>
        </h2>

        <EmptyState
          v-if="!posts.length"
          glyph="&#xE90A;"
          title="还没有回复"
          description="来抢第一个沙发。"
        />

        <div v-else class="pc-replies">
          <article v-for="post in posts" :key="post.id" class="pc-card pc-post">
            <div class="pc-post-head">
              <AuthorChip :user="post.author" :size="32" />
              <span class="pc-grow" />
              <span class="pc-muted">#{{ post.postNumber }} · {{ relativeTime(post.createdAt) }}</span>
            </div>
            <RichHtml :html="post.cookedHtml" />
            <div class="pc-post-actions">
              <button
                class="pc-action"
                :class="{ 'pc-action--on': likedPosts[post.id] }"
                @click="toggleLike(post)"
              >
                <span class="pc-meta-glyph">&#xEB51;</span>
                {{ compactNumber(likeCounts[post.id]) }}
              </button>
              <button class="pc-action" @click="startReply(post)">
                <span class="pc-meta-glyph">&#xE97A;</span> 回复
              </button>
              <button class="pc-action" @click="openReport(post)">
                <span class="pc-meta-glyph">&#xE7BA;</span> 举报
              </button>
            </div>
          </article>
        </div>

        <section class="pc-reply-box pc-card">
          <div class="pc-row pc-row--between" style="margin-bottom: 10px">
            <strong style="font-size: 14px">写下你的回复</strong>
            <button v-if="replyTo" class="pc-link pc-muted" @click="replyTo = null">
              取消回复 @{{ replyTo.author.username }}
            </button>
          </div>
          <TextBox v-model:Text="replyText" PlaceholderText="支持 Markdown…" AcceptsReturn="True" />
          <div class="pc-row pc-row--between" style="margin-top: 12px">
            <span class="pc-muted">Shift + Enter 换行</span>
            <Button
              Style="AccentButtonStyle"
              :IsEnabled="!replying && replyText.trim().length > 0"
              @Click="submitReply"
            >
              {{ replying ? '发送中…' : '发布回复' }}
            </Button>
          </div>
        </section>
      </template>
    </div>

    <!-- 举报：原站是模态选择理由，这里用轻量浮层 -->
    <div v-if="reportTarget" class="pc-modal-scrim" @click.self="closeReport">
      <div class="pc-modal" role="dialog" aria-modal="true">
        <h3 class="pc-modal-title">举报这条回复</h3>
        <p class="pc-muted pc-modal-sub">
          #{{ reportTarget.postNumber }} · {{ reportTarget.author?.username }}
        </p>
        <div class="pc-modal-reasons">
          <button
            v-for="reason in REPORT_REASONS"
            :key="reason.code"
            class="pc-modal-reason"
            :disabled="reporting"
            @click="submitReport(reason.code)"
          >
            {{ reason.label }}
          </button>
        </div>
        <TextBox v-model:Text="reportDetail" PlaceholderText="补充说明（可选）" />
        <div class="pc-modal-actions">
          <button class="pc-modal-cancel" @click="closeReport">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.pc-topic-header {
  margin: 12px 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-topic-title {
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pc-post {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-post-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-post-actions {
  display: flex;
  gap: 4px;
  border-top: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  padding-top: 8px;
  margin-top: 2px;
}

.pc-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.pc-action:hover {
  background: color-mix(in srgb, var(--text-primary) 7%, transparent);
  color: var(--text-primary);
}

.pc-action--on {
  color: var(--pc-accent, #ff6b60);
}

.pc-replies {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-reply-box {
  margin-top: 24px;
}

.pc-topic-actions {
  display: flex;
  gap: 8px;
}

.pc-action--pill {
  border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
  border-radius: 999px;
  height: 32px;
  padding: 0 14px;
}

.pc-action--pill.pc-action--on {
  border-color: color-mix(in srgb, var(--pc-accent, #ff6b60) 55%, transparent);
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 12%, transparent);
}

/* report sheet */
.pc-modal-scrim {
  position: fixed;
  inset: 0;
  z-index: 2147482000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
  backdrop-filter: blur(2px);
}

.pc-modal {
  width: min(420px, calc(100vw - 40px));
  padding: 20px;
  border-radius: 8px;
  background: var(--card-bg, #2b2b2b);
  border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.pc-modal-sub {
  margin: 0;
  font-size: 12.5px;
}

.pc-modal-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pc-modal-reason {
  padding: 7px 12px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.pc-modal-reason:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-modal-actions {
  display: flex;
  justify-content: flex-end;
}

.pc-modal-cancel {
  padding: 7px 16px;
  border-radius: 4px;
  border: none;
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
</style>
