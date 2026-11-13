<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Expander } from 'winuionweb'
import { api } from '@/api/client'
import type { Work, WorkComment, Page } from '@/api/types'
import { route, navigate } from '@/router'
import { relativeTime, compactNumber } from '@/lib/format'
import { notify, notifyError } from '@/stores/ui'
import { sessionState } from '@/stores/session'
import {
  setWorkLike,
  setWorkFavorite,
  setWorkCommentLike,
  deleteWorkComment,
} from '@/api/interactions'
import AuthorChip from '@/components/AuthorChip.vue'
import RichHtml from '@/components/RichHtml.vue'
import EmptyState from '@/components/EmptyState.vue'
import { buildThread, flattenThread } from '@/lib/thread'
import { htmlToText } from '@/lib/html'

const workId = computed(() => route.params.id ?? '')
const work = ref<Work | null>(null)
/**
 * Codemao's players are keyed by the source work id, and the host differs per
 * engine. Types without an external player (NEKO / WOOD / BOX) return null and the
 * page keeps showing the cover instead.
 */
const PLAYER_HOSTS: Record<string, (id: string) => string> = {
  KITTEN4: (id) => `https://player.codemao.cn/new/${id}`,
  KITTEN3: (id) => `https://player.codemao.cn/old/${id}?origin=kitten_qrcode`,
  KITTENN: (id) => `https://kn.codemao.cn/player?type=2&workId=${id}`,
  COCO: (id) => `https://coco.codemao.cn/editor/player/${id}?channel=h5`,
  NEMO: (id) => `https://nemo.codemao.cn/w/${id}`,
}

const playerSrc = computed(() => {
  const current = work.value
  if (!current?.sourceWorkId) return null
  const build = PLAYER_HOSTS[String(current.type ?? '').toUpperCase()]
  return build ? build(current.sourceWorkId) : null
})
const playerFrame = ref<HTMLIFrameElement | null>(null)
const comments = ref<WorkComment[]>([])

function openPlayerWindow(): void {
  if (playerSrc.value) window.open(playerSrc.value, '_blank', 'noopener')
}

async function togglePlayerFullscreen(): Promise<void> {
  const frame = playerFrame.value
  if (!frame) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await frame.requestFullscreen()
  } catch {
    // cross-origin frame refused; the 新窗口 button still works
    openPlayerWindow()
  }
}
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
    for (const comment of comments.value) seedComment(comment)
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
    await api.post(`/works/${workId.value}/comments`, {
      markdown,
      replyToCommentNumber: replyToComment.value?.commentNumber ?? null,
    })
    commentText.value = ''
    replyToComment.value = null
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

// ---------------------------------------------------------------- comments

const commentLikes = ref<Record<number, boolean>>({})
const commentLikeCounts = ref<Record<string, number>>({})
const replyToComment = ref<WorkComment | null>(null)

/** 评论区层级：接口返回扁平列表，靠 replyToCommentNumber 拼树。 */
const expandedComments = ref<Set<string>>(new Set())
const commentThread = computed(() =>
  buildThread(
    comments.value,
    c => String(c.commentNumber),
    c => (c.replyToCommentNumber == null ? null : String(c.replyToCommentNumber)),
    3,
  ),
)
const commentRows = computed(() =>
  flattenThread(commentThread.value, c => String(c.commentNumber), expandedComments.value, 3, 2),
)

/** 被回复内容的摘要，用于引用行。 */
function quotedComment(comment: WorkComment): WorkComment | null {
  const target = comment.replyToCommentNumber
  if (target == null) return null
  return comments.value.find(item => item.commentNumber === target) ?? null
}

function stripToText(html: string): string {
  return htmlToText(html).replace(/\\s+/g, ' ').trim().slice(0, 120)
}

function expandComment(key: string): void {
  expandedComments.value = new Set([...expandedComments.value, key])
}
const deletingComment = ref<number | null>(null)

function seedComment(comment: WorkComment): void {
  commentLikes.value[comment.commentNumber] = Boolean(comment.viewerState?.liked)
  commentLikeCounts.value[comment.commentNumber] = comment.likeCount ?? 0
}

async function toggleCommentLike(comment: WorkComment): Promise<void> {
  if (!sessionState.user) {
    navigate('/login')
    return
  }
  const n = comment.commentNumber
  const next = !commentLikes.value[n]
  commentLikes.value[n] = next
  commentLikeCounts.value[n] = Math.max(0, (commentLikeCounts.value[n] ?? 0) + (next ? 1 : -1))
  try {
    await setWorkCommentLike(workId.value, n, next)
  } catch (err) {
    commentLikes.value[n] = !next
    commentLikeCounts.value[n] = Math.max(0, (commentLikeCounts.value[n] ?? 0) + (next ? -1 : 1))
    notifyError(err, '操作失败')
  }
}

function startCommentReply(comment: WorkComment): void {
  replyToComment.value = comment
  document.querySelector('.pc-reply-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function canDelete(comment: WorkComment): boolean {
  const me = sessionState.user?.id
  return Boolean(me && comment.author?.id === me && !comment.deleted)
}

async function removeComment(comment: WorkComment): Promise<void> {
  if (deletingComment.value !== null) return
  deletingComment.value = comment.commentNumber
  try {
    await deleteWorkComment(workId.value, comment.commentNumber)
    notify('已删除', '', 'Success')
    await load()
  } catch (err) {
    notifyError(err, '删除失败')
  } finally {
    deletingComment.value = null
  }
}

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
            <section v-if="playerSrc" class="pc-player">
              <div class="pc-player-stage">
                <iframe
                  ref="playerFrame"
                  class="pc-player-frame"
                  :src="playerSrc"
                  :title="work.workName"
                  allow="fullscreen; autoplay; gamepad; clipboard-write"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              <div class="pc-player-bar">
                <span class="pc-player-badge">{{ work.type }}</span>
                <span class="pc-muted pc-grow">在页面内直接运行</span>
                <Button @Click="openPlayerWindow">
                  <span class="pc-btn-content">
                    <span class="pc-btn-icon">&#xE8A7;</span> 新窗口
                  </span>
                </Button>
                <Button @Click="togglePlayerFullscreen">
                  <span class="pc-btn-content">
                    <span class="pc-btn-icon">&#xE740;</span> 全屏
                  </span>
                </Button>
              </div>
            </section>

            <img
              v-else-if="work.screenshotCoverUrl || work.preview"
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
              <template v-for="row in commentRows" :key="row.kind === 'item' ? `c${row.item.commentNumber}` : `m${row.key}`">
                <button
                  v-if="row.kind === 'more'"
                  class="pc-thread-more"
                  :style="{ marginLeft: `${row.depth * 16}px` }"
                  @click="expandComment(row.key)"
                >
                  展开 {{ row.count }} 条回复
                </button>

                <article
                  v-else
                  class="pc-card pc-post pc-thread-item"
                  :style="{ marginLeft: `${row.depth * 16}px` }"
                >
                  <div class="pc-post-head">
                    <AuthorChip :user="row.item.author" :size="28" />
                    <span class="pc-grow" />
                    <span class="pc-muted">
                      #{{ row.item.commentNumber }} · {{ relativeTime(row.item.createdAt) }}
                    </span>
                  </div>

                  <div v-if="quotedComment(row.item)" class="pc-thread-quote">
                    <span class="pc-muted">回复 #{{ row.item.replyToCommentNumber }} @{{ quotedComment(row.item)?.author?.username }}</span>
                    <span class="pc-thread-quote-text">{{ stripToText(commentHtml(quotedComment(row.item)!)) }}</span>
                  </div>
                  <div v-else-if="row.item.replyToCommentNumber" class="pc-muted pc-comment-replyto">
                    回复 #{{ row.item.replyToCommentNumber }}（该评论不可见）
                  </div>

                  <RichHtml :html="commentHtml(row.item)" />
                  <div class="pc-post-actions pc-comment-actions">
                    <button
                      class="pc-action"
                      :class="{ 'pc-action--on': commentLikes[row.item.commentNumber] }"
                      @click="toggleCommentLike(row.item)"
                    >
                      <span class="pc-meta-glyph">&#xEB51;</span>
                      {{ compactNumber(commentLikeCounts[row.item.commentNumber] ?? 0) }}
                    </button>
                    <button class="pc-action" @click="startCommentReply(row.item)">
                      <span class="pc-meta-glyph">&#xE97A;</span> 回复
                    </button>
                    <button
                      v-if="canDelete(row.item)"
                      class="pc-action"
                      :disabled="deletingComment === row.item.commentNumber"
                      @click="removeComment(row.item)"
                    >
                      <span class="pc-meta-glyph">&#xE74D;</span> 删除
                    </button>
                  </div>
                </article>
              </template>
            </div>

            <section class="pc-reply-box pc-card">
              <div class="pc-row pc-row--between" style="margin-bottom: 8px">
                <strong style="font-size: 14px">写评论</strong>
                <button v-if="replyToComment" class="pc-link pc-muted" @click="replyToComment = null">
                  取消回复 #{{ replyToComment.commentNumber }}
                </button>
              </div>
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
