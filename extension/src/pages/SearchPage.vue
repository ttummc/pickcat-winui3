<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { UserProfile, Work, Topic, Page } from '@/api/types'
import { navigate, route } from '@/router'
import { avatarUrl, initials } from '@/lib/format'
import WorkCard from '@/components/WorkCard.vue'
import TopicCard from '@/components/TopicCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'

const query = ref(route.query.q ?? '')
const tab = ref('all')
const users = ref<UserProfile[]>([])
const works = ref<Work[]>([])
const topics = ref<Topic[]>([])
const loading = ref(false)
const searched = ref(false)
const error = ref<string | null>(null)

const tabs = computed(() => [
  { key: 'all', label: '综合' },
  { key: 'topics', label: topics.value.length ? `帖子 ${topics.value.length}` : '帖子' },
  { key: 'users', label: users.value.length ? `用户 ${users.value.length}` : '用户' },
  { key: 'works', label: works.value.length ? `作品 ${works.value.length}` : '作品' },
])

/** 综合 view keeps the first few of each kind so every section stays visible. */
const PREVIEW = 3
const previewTopics = computed(() => topics.value.slice(0, PREVIEW))
const previewWorks = computed(() => works.value.slice(0, PREVIEW))
const previewUsers = computed(() => users.value.slice(0, PREVIEW))

const totalHits = computed(() => topics.value.length + works.value.length + users.value.length)

async function run(): Promise<void> {
  const q = query.value.trim()
  if (!q || loading.value) return
  loading.value = true
  searched.value = true
  error.value = null
  try {
    // Three independent searches; a failure in one must not blank the others.
    const [topicPage, userPage, workPage] = await Promise.allSettled([
      api.get<Page<Topic>>('/topics', { q, limit: 20 }),
      api.get<Page<UserProfile>>('/search/users', { q, limit: 20 }),
      api.get<Page<Work>>('/search/works', { q, limit: 20 }),
    ])
    topics.value = topicPage.status === 'fulfilled' ? (topicPage.value.items ?? []) : []
    users.value = userPage.status === 'fulfilled' ? (userPage.value.items ?? []) : []
    works.value = workPage.status === 'fulfilled' ? (workPage.value.items ?? []) : []

    if ([topicPage, userPage, workPage].every((r) => r.status === 'rejected')) {
      const first = [topicPage, userPage, workPage][0] as PromiseRejectedResult
      error.value = first.reason instanceof Error ? first.reason.message : '搜索失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '搜索失败'
  } finally {
    loading.value = false
  }
}

function submit(): void {
  void run()
}

onMounted(() => {
  if (query.value) void run()
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">搜索</h1>
          <p class="pc-page-subtitle">帖子、作品、用户，一次全搜。</p>
        </div>
      </header>

      <div class="pc-searchbar">
        <TextBox
          v-model:Text="query"
          PlaceholderText="搜索帖子、作品或用户…"
          style="flex: 1 1 auto"
          @KeyDown="(args: unknown) => ((args as { Key?: string })?.Key === 'Enter' ? submit() : undefined)"
        />
        <Button Style="AccentButtonStyle" :IsEnabled="!loading && query.trim().length > 0" @Click="submit">
          <span class="pc-btn-content"><span class="pc-btn-icon">&#xE721;</span><span>搜索</span></span>
        </Button>
      </div>

      <div v-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>

      <EmptyState v-else-if="error" glyph="&#xEA39;" title="搜索失败" :description="error" />

      <EmptyState
        v-else-if="!searched"
        glyph="&#xE721;"
        title="开始搜索"
        description="输入关键词后按回车。"
      />

      <EmptyState
        v-else-if="!totalHits"
        glyph="&#xE721;"
        title="没有找到相关内容"
        :description="`换一个关键词试试，比如作品名、帖子标题或者用户名。`"
      />

      <template v-else>
        <PcSelector v-model="tab" :tabs="tabs" />

        <!-- 综合 -->
        <div v-if="tab === 'all'" class="pc-search-all">
          <section v-if="topics.length" class="pc-block">
            <div class="pc-block-head">
              <h2 class="pc-section-title">帖子</h2>
              <button v-if="topics.length > PREVIEW" class="pc-link" @click="tab = 'topics'">
                查看全部 {{ topics.length }} 条
              </button>
            </div>
            <div class="pc-feed">
              <TopicCard v-for="topic in previewTopics" :key="topic.id" :topic="topic" />
            </div>
          </section>

          <section v-if="works.length" class="pc-block">
            <div class="pc-block-head">
              <h2 class="pc-section-title">作品</h2>
              <button v-if="works.length > PREVIEW" class="pc-link" @click="tab = 'works'">
                查看全部 {{ works.length }} 个
              </button>
            </div>
            <div class="pc-work-grid">
              <WorkCard v-for="work in previewWorks" :key="work.id" :work="work" />
            </div>
          </section>

          <section v-if="users.length" class="pc-block">
            <div class="pc-block-head">
              <h2 class="pc-section-title">用户</h2>
              <button v-if="users.length > PREVIEW" class="pc-link" @click="tab = 'users'">
                查看全部 {{ users.length }} 位
              </button>
            </div>
            <div class="pc-people-grid">
              <div
                v-for="person in previewUsers"
                :key="person.id"
                class="pc-card pc-card--interactive pc-person"
                @click="navigate(`/profile/${person.id}`)"
              >
                <img
                  v-if="avatarUrl(person)"
                  class="pc-avatar pc-avatar--lg"
                  :src="avatarUrl(person)"
                  :alt="person.username"
                />
                <span v-else class="pc-avatar pc-avatar--lg pc-avatar-fallback">{{ initials(person.username) }}</span>
                <div class="pc-grow">
                  <div class="pc-username">{{ person.username }}</div>
                  <div class="pc-muted">{{ person.bio || `Lv.${person.level?.current ?? 1}` }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 帖子 -->
        <div v-else-if="tab === 'topics'">
          <div v-if="topics.length" class="pc-feed">
            <TopicCard v-for="topic in topics" :key="topic.id" :topic="topic" />
          </div>
          <EmptyState v-else glyph="&#xE7C3;" title="没有找到帖子" />
        </div>

        <!-- 用户 -->
        <div v-else-if="tab === 'users'">
          <div v-if="users.length" class="pc-people-grid">
            <div
              v-for="person in users"
              :key="person.id"
              class="pc-card pc-card--interactive pc-person"
              @click="navigate(`/profile/${person.id}`)"
            >
              <img
                v-if="avatarUrl(person)"
                class="pc-avatar pc-avatar--lg"
                :src="avatarUrl(person)"
                :alt="person.username"
              />
              <span v-else class="pc-avatar pc-avatar--lg pc-avatar-fallback">{{ initials(person.username) }}</span>
              <div class="pc-grow">
                <div class="pc-username">{{ person.username }}</div>
                <div class="pc-muted">{{ person.bio || `Lv.${person.level?.current ?? 1}` }}</div>
              </div>
            </div>
          </div>
          <EmptyState v-else glyph="&#xE77B;" title="没有找到用户" />
        </div>

        <!-- 作品 -->
        <div v-else>
          <div v-if="works.length" class="pc-work-grid">
            <WorkCard v-for="work in works" :key="work.id" :work="work" />
          </div>
          <EmptyState v-else glyph="&#xE7C3;" title="没有找到作品" />
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.pc-searchbar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 20px;
  max-width: 720px;
}

.pc-search-all {
  display: flex;
  flex-direction: column;
  gap: 26px;
  margin-top: 16px;
}

.pc-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.pc-block-head .pc-section-title {
  margin: 0;
}
</style>
