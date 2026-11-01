<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, PickCatApiError } from '@/api/client'
import type { TopicDetail, Post, Page } from '@/api/types'
import { route, navigate } from '@/router'
import { relativeTime, compactNumber } from '@/lib/format'
import { notify, notifyError } from '@/stores/ui'
import { sessionState } from '@/stores/session'
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
    if (err instanceof PickCatApiError && err.status === 422) {
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
            <span class="pc-meta-item">{{ relativeTime(topic.createdAt) }}</span>
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
</style>
