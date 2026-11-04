<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Expander } from 'winuionweb'
import { api } from '@/api/client'
import type { Work, WorkComment, Page } from '@/api/types'
import { route, navigate } from '@/router'
import { relativeTime, compactNumber } from '@/lib/format'
import { notify, notifyError } from '@/stores/ui'
import { sessionState } from '@/stores/session'
import { setWorkLike, setWorkFavorite } from '@/api/interactions'
import AuthorChip from '@/components/AuthorChip.vue'
import RichHtml from '@/components/RichHtml.vue'
import EmptyState from '@/components/EmptyState.vue'

const workId = computed(() => route.params.id ?? '')
const work = ref<Work | null>(null)
const comments = ref<WorkComment[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const commentText = ref('')
const submitting = ref(false)

async function load(): Promise<void> {
  if (!workId.value) return
  loading.value = true
  error.value = null
  try {
    work.value = await api.get<Work>(`/works/${workId.value}`)
    const page = await api.get<Page<WorkComment>>(`/works/${workId.value}/comments`, { limit: 30 })
    comments.value = page.items ?? []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    work.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(workId, load)

function commentHtml(comment: WorkComment): string {
  return comment.cookedHtml ?? comment.content ?? comment.markdown ?? ''
}

async function submitComment(): Promise<void> {
  const markdown = commentText.value.trim()
  if (!markdown || submitting.value) return
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  submitting.value = true
  try {
    await api.post(`/works/${workId.value}/comments`, { markdown, replyToCommentNumber: null })
    commentText.value = ''
    notify('已发布', '评论已发送', 'Success')
    await load()
  } catch (err) {
    notifyError(err, '评论失败')
  } finally {
    submitting.value = false
  }
}

// ---------------------------------------------------------------- like / favorite

const liked = ref(false)
const favorited = ref(false)
const likeCount = ref(0)

watch(
  work,
  (value) => {
    liked.value = Boolean(value?.viewerState?.liked)
    favorited.value = Boolean(value?.viewerState?.favorited ?? value?.viewerState?.bookmarked)
    likeCount.value = value?.likeCount ?? 0
  },
  { immediate: true },
)

async function toggleWorkLike(): Promise<void> {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  const next = !liked.value
  liked.value = next
  likeCount.value = Math.max(0, likeCount.value + (next ? 1 : -1))
  try {
    await setWorkLike(workId.value, next)
  } catch (err) {
    liked.value = !next
    likeCount.value = Math.max(0, likeCount.value + (next ? -1 : 1))
    notifyError(err, next ? '点赞失败' : '取消点赞失败')
  }
}

async function toggleWorkFavorite(): Promise<void> {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  const next = !favorited.value
  favorited.value = next
  try {
    await setWorkFavorite(workId.value, next)
    notify(next ? '已收藏' : '已取消收藏', '', 'Informational')
  } catch (err) {
    favorited.value = !next
    notifyError(err, next ? '收藏失败' : '取消收藏失败')
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
        v-else-if="error || !work"
        glyph="&#xEA39;"
        title="无法打开这个作品"
        :description="error || ''"
        action-label="返回作品列表"
        @action="navigate('/works')"
      />

      <template v-else>
        <button class="pc-link" @click="navigate('/works')">← 返回作品</button>

        <div class="pc-work-detail">
          <div class="pc-work-detail-main">
            <img
              v-if="work.screenshotCoverUrl || work.preview"
              class="pc-work-hero"
              :src="work.screenshotCoverUrl || work.preview || ''"
              :alt="work.workName"
            />
            <div v-else class="pc-work-hero pc-work-cover--empty">&#xE7C3;</div>

            <h1 class="pc-topic-title" style="margin-top: 20px">{{ work.workName }}</h1>

            <div class="pc-feed-meta" style="margin: 10px 0 18px">
              <AuthorChip :user="work.author" :time="relativeTime(work.createdAt)" />
              <span class="pc-grow" />
              <button class="pc-meta-btn" :class="{ 'pc-meta-btn--on': liked }" @click="toggleWorkLike">
                <span class="pc-meta-glyph">&#xEB51;</span>{{ compactNumber(likeCount) }}
              </button>
              <button
                class="pc-meta-btn"
                :class="{ 'pc-meta-btn--on': favorited }"
                @click="toggleWorkFavorite"
              >
                <span class="pc-meta-glyph">&#xE734;</span>{{ favorited ? '已收藏' : '收藏' }}
              </button>
              <span class="pc-meta-item">
                <span class="pc-meta-glyph">&#xE7B3;</span>{{ compactNumber(work.viewCount) }}
              </span>
              <span class="pc-meta-item">
                <span class="pc-meta-glyph">&#xE90A;</span>{{ compactNumber(work.commentCount ?? comments.length) }}
              </span>
            </div>

            <section v-if="work.description" class="pc-card" style="margin-bottom: 12px">
              <h3 class="pc-rail-title">简介</h3>
              <p style="margin: 0; white-space: pre-wrap">{{ work.description }}</p>
            </section>

            <Expander v-if="work.operation" Header="操作说明" Description="作者写的玩法 / 按键说明" :IsExpanded="true" style="margin-top: 12px">
              <p style="margin: 0; white-space: pre-wrap">{{ work.operation }}</p>
            </Expander>

            <h2 class="pc-section-title" style="margin-top: 28px">评论</h2>

            <EmptyState v-if="!comments.length" glyph="&#xE90A;" title="还没有评论" description="来说点什么吧。" />

            <div v-else class="pc-replies">
              <article v-for="comment in comments" :key="comment.commentNumber" class="pc-card pc-post">
                <div class="pc-post-head">
                  <AuthorChip :user="comment.author" :size="28" />
                  <span class="pc-grow" />
                  <span class="pc-muted">
                    #{{ comment.commentNumber }} · {{ relativeTime(comment.createdAt) }}
                  </span>
                </div>
                <RichHtml :html="commentHtml(comment)" />
              </article>
            </div>

            <section class="pc-reply-box pc-card">
              <strong style="font-size: 14px">写评论</strong>
              <TextBox
                v-model:Text="commentText"
                PlaceholderText="说点什么…"
                AcceptsReturn="True"
                style="margin-top: 10px"
              />
              <div class="pc-row pc-row--between" style="margin-top: 12px">
                <span class="pc-muted">友善发言</span>
                <Button
                  Style="AccentButtonStyle"
                  :IsEnabled="!submitting && commentText.trim().length > 0"
                  @Click="submitComment"
                >
                  {{ submitting ? '发送中…' : '发表评论' }}
                </Button>
              </div>
            </section>
          </div>

          <aside class="pc-rail">
            <div class="pc-rail-card">
              <h3 class="pc-rail-title">作品信息</h3>
              <dl class="pc-kv">
                <dt>类型</dt>
                <dd>{{ work.type }}</dd>
                <dt>开源 Fork</dt>
                <dd>{{ work.forkEnable ? '允许' : '不允许' }}</dd>
                <dt>来源 ID</dt>
                <dd>{{ work.sourceWorkId }}</dd>
              </dl>
            </div>
            <div class="pc-rail-card">
              <h3 class="pc-rail-title">作者</h3>
              <AuthorChip :user="work.author" :size="40" />
            </div>
          </aside>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.pc-work-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .pc-work-detail {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pc-work-hero {
  width: 100%;
  max-height: 440px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-kv {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  margin: 0;
  font-size: 12.5px;
}

.pc-kv dt {
  color: var(--text-tertiary);
}

.pc-kv dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
