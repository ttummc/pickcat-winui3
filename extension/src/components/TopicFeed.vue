<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/api/client'
import type { Topic, Page } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import TopicCard from './TopicCard.vue'
import EmptyState from './EmptyState.vue'
import PcSelector from './PcSelector.vue'

const props = withDefaults(defineProps<{ tag?: string; sort?: string }>(), { tag: '', sort: 'latest' })

const sort = ref(props.sort)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

/** The API's sort enum is only latest|relevance, so 活跃 is derived locally. */
const ACTIVE_PAGE_SIZE = 60

const ranked = ref<Topic[]>([])
const ranking = ref(false)
const rankError = ref<string | null>(null)

const feed = usePagedList<Topic>((cursor, signal) =>
  api.get<Page<Topic>>(
    '/topics',
    { sort: 'latest', tag: props.tag || undefined, limit: 20, cursor },
    signal,
  ),
)

/**
 * Score = engagement weighted by how recently the thread moved. A reply today
 * counts for more than a reply last month, which is what "活跃" means to a reader.
 */
function activityScore(topic: Topic): number {
  const activity = Date.parse(topic.lastActivityAt ?? topic.createdAt) || 0
  const ageHours = Math.max(0, (Date.now() - activity) / 3_600_000)
  const engagement =
    (topic.replyCount ?? 0) * 4 +
    (topic.likeCount ?? 0) * 2 +
    (topic.bookmarkCount ?? 0) * 2 +
    Math.log2(1 + (topic.viewCount ?? 0))
  // Half-life of ~2 days.
  return engagement / Math.pow(1 + ageHours / 48, 1.3)
}

async function loadActive(): Promise<void> {
  ranking.value = true
  rankError.value = null
  try {
    const items: Topic[] = []
    let cursor: string | undefined
    // One page is not enough to rank by activity; walk a few until there is enough.
    for (let page = 0; page < 3 && items.length < ACTIVE_PAGE_SIZE; page += 1) {
      const result = await api.get<Page<Topic>>('/topics', {
        sort: 'latest',
        tag: props.tag || undefined,
        limit: 20,
        cursor,
      })
      items.push(...(result.items ?? []))
      cursor = result.pageInfo?.nextCursor ?? undefined
      if (!cursor) break
    }
    ranked.value = items
      .filter((t) => !t.pinned)
      .sort((a, b) => activityScore(b) - activityScore(a))
      .slice(0, ACTIVE_PAGE_SIZE)
  } catch (err) {
    rankError.value = err instanceof Error ? err.message : '加载失败'
    ranked.value = []
  } finally {
    ranking.value = false
  }
}

watch([sort, () => props.tag], () => {
  if (sort.value === 'active') void loadActive()
  else void feed.reload()
})

onMounted(async () => {
  await feed.reload()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) void feed.loadMore()
    },
    { rootMargin: '400px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())

const tabs = [
  { key: 'latest', label: '最新' },
  { key: 'active', label: '活跃' },
]
</script>

<template>
  <section>
    <PcSelector v-model="sort" :tabs="tabs" />

    <div v-if="sort === 'active'">
      <div v-if="ranking" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>
      <EmptyState v-else-if="rankError" glyph="&#xEA39;" title="加载失败" :description="rankError" />
      <div v-else-if="ranked.length" class="pc-feed">
        <TopicCard v-for="topic in ranked" :key="topic.id" :topic="topic" />
      </div>
      <EmptyState v-else glyph="&#xE7BA;" title="还没有活跃的帖子" />
    </div>

    <template v-else>
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

    <EmptyState v-else-if="feed.isEmpty.value" glyph="&#xE7BA;" title="这个分类还没有帖子" />

    <div v-else class="pc-feed">
      <TopicCard v-for="topic in feed.items.value" :key="topic.id" :topic="topic" />
      <div ref="sentinel" class="pc-sentinel">
        <ProgressRing v-if="feed.loadingMore.value" IsActive="True" :Width="24" :Height="24" />
        <span v-else-if="!feed.hasNext.value" class="pc-muted">已经到底了</span>
      </div>
    </div>
    </template>
  </section>
</template>
