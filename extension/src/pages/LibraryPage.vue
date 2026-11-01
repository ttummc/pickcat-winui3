<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { Work, Topic, Page } from '@/api/types'
import { navigate } from '@/router'
import { isSignedIn, sessionState } from '@/stores/session'
import WorkCard from '@/components/WorkCard.vue'
import TopicCard from '@/components/TopicCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'

const tab = ref('works')
const works = ref<Work[]>([])
const topics = ref<Topic[]>([])
const loading = ref(true)

const tabs = [
  { key: 'works', label: '我的作品' },
  { key: 'topics', label: '我的帖子' },
]

const userId = computed(() => sessionState.user?.id)

async function load(): Promise<void> {
  if (!userId.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [workPage, topicPage] = await Promise.allSettled([
      api.get<Page<Work>>(`/users/${userId.value}/works`, { limit: 40 }),
      api.get<Page<Topic>>(`/users/${userId.value}/topics`, { limit: 40 }),
    ])
    works.value = workPage.status === 'fulfilled' ? (workPage.value.items ?? []) : []
    topics.value = topicPage.status === 'fulfilled' ? (topicPage.value.items ?? []) : []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">个人作品库</h1>
          <p class="pc-page-subtitle">你发布过的作品和帖子都在这里。</p>
        </div>
      </header>

      <EmptyState
        v-if="!isSignedIn"
        glyph="&#xE7B8;"
        title="登录后才能查看作品库"
        action-label="去登录"
        @action="navigate('/login')"
      />

      <div v-else-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>

      <template v-else>
        <PcSelector v-model="tab" :tabs="tabs" />

        <div v-if="tab === 'works'">
          <div v-if="works.length" class="pc-work-grid">
            <WorkCard v-for="work in works" :key="work.id" :work="work" />
          </div>
          <EmptyState v-else glyph="&#xE7C3;" title="还没有作品" description="去 KittenN 做一个吧。" />
        </div>

        <div v-else>
          <div v-if="topics.length" class="pc-feed">
            <TopicCard v-for="topic in topics" :key="topic.id" :topic="topic" />
          </div>
          <EmptyState v-else glyph="&#xE7BA;" title="还没有发过帖子" />
        </div>
      </template>
    </div>
  </div>
</template>
