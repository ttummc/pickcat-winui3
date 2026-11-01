<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api/client'
import type { UserProfile, Work, Page } from '@/api/types'
import { navigate } from '@/router'
import { avatarUrl, initials } from '@/lib/format'
import WorkCard from '@/components/WorkCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'
import { route } from '@/router'

const query = ref(route.query.q ?? '')
const tab = ref('users')
const users = ref<UserProfile[]>([])
const works = ref<Work[]>([])
const loading = ref(false)
const searched = ref(false)
const error = ref<string | null>(null)

const tabs = [
  { key: 'users', label: '用户' },
  { key: 'works', label: '作品' },
]

async function run(): Promise<void> {
  const q = query.value.trim()
  if (!q || loading.value) return
  loading.value = true
  searched.value = true
  error.value = null
  try {
    const [userPage, workPage] = await Promise.allSettled([
      api.get<Page<UserProfile>>('/search/users', { q, limit: 20 }),
      api.get<Page<Work>>('/search/works', { q, limit: 20 }),
    ])
    users.value = userPage.status === 'fulfilled' ? (userPage.value.items ?? []) : []
    works.value = workPage.status === 'fulfilled' ? (workPage.value.items ?? []) : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '搜索失败'
  } finally {
    loading.value = false
  }
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
          <p class="pc-page-subtitle">找到感兴趣的人，或者看看别人做了什么。</p>
        </div>
      </header>

      <div class="pc-searchbar">
        <TextBox
          v-model:Text="query"
          PlaceholderText="搜索用户或作品…"
          style="flex: 1 1 auto"
          @KeyDown="(args: unknown) => ((args as { Key?: string })?.Key === 'Enter' ? run() : undefined)"
        />
        <Button Style="AccentButtonStyle" :IsEnabled="!loading && query.trim().length > 0" @Click="run">
          <span class="pc-btn-content"><span class="pc-btn-icon">&#xE721;</span><span>搜索</span></span>
        </Button>
      </div>

      <div v-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="32" :Height="32" />
      </div>

      <EmptyState
        v-else-if="error"
        glyph="&#xEA39;"
        title="搜索失败"
        :description="error"
      />

      <EmptyState
        v-else-if="!searched"
        glyph="&#xE721;"
        title="开始搜索"
        description="输入关键词后按回车。"
      />

      <template v-else>
        <PcSelector v-model="tab" :tabs="tabs" />

        <div v-if="tab === 'users'">
          <div v-if="users.length" class="pc-people-grid">
            <div
              v-for="person in users"
              :key="person.id"
              class="pc-card pc-card--interactive pc-person"
              @click="navigate(`/profile/${person.id}`)"
            >
              <img v-if="avatarUrl(person)" class="pc-avatar pc-avatar--lg" :src="avatarUrl(person)" :alt="person.username" />
              <span v-else class="pc-avatar pc-avatar--lg pc-avatar-fallback">{{ initials(person.username) }}</span>
              <div class="pc-grow">
                <div class="pc-username">{{ person.username }}</div>
                <div class="pc-muted">{{ person.bio || `Lv.${person.level?.current ?? 1}` }}</div>
              </div>
            </div>
          </div>
          <EmptyState v-else glyph="&#xE77B;" title="没有找到用户" />
        </div>

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
</style>
