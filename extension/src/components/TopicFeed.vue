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

const feed = usePagedList<Topic>((cursor, signal) =>
  api.get<Page<Topic>>(
    '/topics',
    { sort: sort.value, tag: props.tag || undefined, limit: 20, cursor },
    signal,
  ),
)

watch([sort, () => props.tag], () => void feed.reload())

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
  </section>
</template>
