<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { api } from '@/api/client'
import type { Topic, Tag, Page } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { navigate } from '@/router'
import TopicCard from '@/components/TopicCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'
import { sessionState } from '@/stores/session'
import { greeting } from '@/lib/format'

type FeedKind = 'recommended' | 'latest'

const kind = ref<FeedKind>('recommended')
const tags = ref<Tag[]>([])
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const feed = usePagedList<Topic>((cursor, signal) => {
  if (kind.value === 'recommended')
    return api.get<Page<Topic>>('/topic-recommendations', { limit: 20, cursor }, signal)
  return api.get<Page<Topic>>('/topics', { sort: 'latest', limit: 20, cursor }, signal)
})

watch(kind, () => void feed.reload())

onMounted(async () => {
  await feed.reload()
  try {
    const result = await api.get<{ items: Tag[] }>('/tags')
    tags.value = result.items ?? []
  } catch {
    tags.value = []
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void feed.loadMore()
    },
    { rootMargin: '400px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())

const tabs = computed(() => [
  { key: 'recommended', label: '推荐' },
  { key: 'latest', label: '最新' },
])
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">{{ greeting() }}{{ sessionState.user ? `，${sessionState.user.username}` : '' }}</h1>
          <p class="pc-page-subtitle">在 PickCat 看看大家今天在折腾什么。</p>
        </div>
        <Button Style="AccentButtonStyle" @Click="navigate('/forum/editor')">
          <span class="pc-btn-content"><span class="pc-btn-icon">&#xE70F;</span><span>分享你的想法</span></span>
        </Button>
      </header>

      <div class="pc-split">
        <section>
          <PcSelector v-model="kind" :tabs="tabs" />

          <div v-if="feed.loading.value" class="pc-spin">
            <ProgressRing IsActive="True" :Width="32" :Height="32" />
          </div>

          <EmptyState
            v-else-if="feed.error.value"
            glyph="&#xEA39;"
            title="加载失败"
            :description="feed.error.value"
            action-label="重试"
            @action="feed.reload()"
          />

          <EmptyState
            v-else-if="feed.isEmpty.value"
            glyph="&#xE7BA;"
            title="这里还没有内容"
            description="换个标签，或者自己发第一帖。"
            action-label="去发帖"
            @action="navigate('/forum/editor')"
          />

          <div v-else class="pc-feed">
            <TopicCard v-for="topic in feed.items.value" :key="topic.id" :topic="topic" />
            <div ref="sentinel" class="pc-sentinel">
              <ProgressRing v-if="feed.loadingMore.value" IsActive="True" :Width="24" :Height="24" />
              <span v-else-if="!feed.hasNext.value" class="pc-muted">已经到底了</span>
            </div>
          </div>
        </section>

        <aside class="pc-rail">
          <div class="pc-rail-card">
            <h3 class="pc-rail-title">话题分类</h3>
            <div class="pc-tag-cloud">
              <button
                v-for="tag in tags"
                :key="tag.id"
                class="pc-tag"
                :title="tag.description || tag.name"
                @click="navigate(`/forum/category/${encodeURIComponent(tag.slug)}`)"
              >
                #{{ tag.name }}
              </button>
            </div>
          </div>

          <div class="pc-rail-card">
            <h3 class="pc-rail-title">创作工具</h3>
            <div class="pc-tool-list">
              <a class="pc-tool" href="https://boxplay.dao3.fun" target="_blank" rel="noreferrer">
                <span class="pc-tool-icon">&#xE7FC;</span>
                <span>KittenN / BoxPlay</span>
              </a>
              <button class="pc-tool" @click="navigate('/works')">
                <span class="pc-tool-icon">&#xE8F1;</span>
                <span>浏览全部作品</span>
              </button>
              <button class="pc-tool" @click="navigate('/library')">
                <span class="pc-tool-icon">&#xE7B8;</span>
                <span>我的作品库</span>
              </button>
            </div>
          </div>

          <div v-if="!sessionState.user && sessionState.ready" class="pc-rail-card">
            <h3 class="pc-rail-title">还没登录</h3>
            <p class="pc-muted" style="margin: 0 0 10px">登录后可以发帖、点赞和查看通知。</p>
            <Button Style="AccentButtonStyle" @Click="navigate('/login')">登录 PickCat</Button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style>
/* One child node keeps the glyph and the label on a single line — the library
   splits a Button's children into icon + content, which stacks them. */
.pc-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  line-height: 1;
  font-size: 14px;
}

.pc-btn-icon {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 16px;
  line-height: 1;
  margin: 0;
}

/* Header actions should read as WinUI primary buttons (32–34px tall).
   Do NOT add horizontal padding here: the Button keeps its fill on an inner
   content presenter, so padding on the root leaves a bare 1px outline floating
   around the label. */
.pc-page-header .win-btn {
  min-height: 34px;
}

.pc-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 40px;
}

.pc-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pc-tool-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pc-tool {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
}

.pc-tool:hover {
  background: color-mix(in srgb, var(--text-primary) 7%, transparent);
}

.pc-tool-icon {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  color: var(--text-secondary);
  font-size: 15px;
}
</style>
