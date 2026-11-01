<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { PersonPicture } from 'winuionweb'
import { api } from '@/api/client'
import type {
  UserProfile,
  Topic,
  Post,
  Work,
  Page,
  ProfileActivity,
  LevelContribution,
} from '@/api/types'
import { route, navigate } from '@/router'
import { relativeTime, compactNumber, initials, avatarUrl } from '@/lib/format'
import { notifyError } from '@/stores/ui'
import { sessionState, isSignedIn } from '@/stores/session'
import TopicCard from '@/components/TopicCard.vue'
import WorkCard from '@/components/WorkCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'
import AuthorChip from '@/components/AuthorChip.vue'

const userId = computed(() => route.params.id ?? '')
const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const following = ref(false)
const followBusy = ref(false)

const tab = ref('home')
const topics = ref<Topic[]>([])
const works = ref<Work[]>([])
const replies = ref<Post[]>([])
const activities = ref<ProfileActivity[]>([])
const followers = ref<UserProfile[]>([])
const followings = ref<UserProfile[]>([])
const featuredTopics = ref<Topic[]>([])
const featuredWorks = ref<Work[]>([])
const contributions = ref<LevelContribution[]>([])
const tabLoading = ref(false)

const isSelf = computed(() => sessionState.user?.id === userId.value)

const tabs = computed(() => [
  { key: 'home', label: '主页' },
  { key: 'topics', label: '帖子' },
  { key: 'works', label: '作品' },
  { key: 'replies', label: '回复' },
  { key: 'following', label: '关注' },
  { key: 'followers', label: '粉丝' },
])

async function loadProfile(): Promise<void> {
  if (!userId.value) return
  loading.value = true
  error.value = null
  tab.value = 'home'
  try {
    const data = await api.get<UserProfile>(`/users/${userId.value}`)
    profile.value = data
    following.value = Boolean(data.viewerState?.following)

    const year = new Date().getFullYear()
    const [contrib] = await Promise.allSettled([
      api.get<{ days?: LevelContribution[] }>(`/users/${userId.value}/level-contributions/${year}`),
      loadFeatured(),
    ])
    if (contrib.status === 'fulfilled') contributions.value = contrib.value.days ?? []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    profile.value = null
  } finally {
    loading.value = false
  }
}

async function loadFeatured(): Promise<void> {
  const [t, w] = await Promise.allSettled([
    api.get<Page<Topic>>(`/users/${userId.value}/featured-topics`),
    api.get<Page<Work>>(`/users/${userId.value}/featured-works`),
  ])
  if (t.status === 'fulfilled') featuredTopics.value = t.value.items ?? []
  if (w.status === 'fulfilled') featuredWorks.value = w.value.items ?? []
}

async function loadTab(key: string): Promise<void> {
  tabLoading.value = true
  try {
    if (key === 'topics') {
      const result = await api.get<Page<Topic>>(`/users/${userId.value}/topics`, { limit: 20 })
      topics.value = result.items ?? []
    } else if (key === 'works') {
      const result = await api.get<Page<Work>>(`/users/${userId.value}/works`, { limit: 20 })
      works.value = result.items ?? []
    } else if (key === 'replies') {
      const result = await api.get<Page<Post>>(`/users/${userId.value}/posts`, {
        role: 'reply',
        limit: 20,
      })
      replies.value = result.items ?? []
    } else if (key === 'following') {
      const result = await api.get<Page<UserProfile>>(`/users/${userId.value}/following`, { limit: 30 })
      followings.value = result.items ?? []
    } else if (key === 'followers') {
      const result = await api.get<Page<UserProfile>>(`/users/${userId.value}/followers`, { limit: 30 })
      followers.value = result.items ?? []
    } else if (key === 'home') {
      const result = await api.get<Page<ProfileActivity>>(`/users/${userId.value}/profile-activities`, {
        year: new Date().getFullYear(),
        limit: 20,
      })
      activities.value = result.items ?? []
    }
  } catch {
    /* leave the tab empty; the parent error state covers real failures */
  } finally {
    tabLoading.value = false
  }
}

watch(tab, (value) => void loadTab(value))
watch(userId, loadProfile)
onMounted(async () => {
  await loadProfile()
  await loadTab('home')
})

async function toggleFollow(): Promise<void> {
  if (!isSignedIn.value) {
    navigate('/login')
    return
  }
  if (followBusy.value) return
  followBusy.value = true
  const next = !following.value
  try {
    if (next) await api.put(`/users/${userId.value}/follow`)
    else await api.del(`/users/${userId.value}/follow`)
    following.value = next
    if (profile.value?.stats) {
      profile.value.stats.followers = Math.max(0, profile.value.stats.followers + (next ? 1 : -1))
    }
  } catch (err) {
    notifyError(err, '关注失败')
  } finally {
    followBusy.value = false
  }
}

// 53 columns x 7 rows heatmap, most recent last
const heatmap = computed(() => {
  const byDate = new Map<string, number>()
  for (const day of contributions.value) {
    const date = typeof day.date === 'string' ? day.date.slice(0, 10) : ''
    const count = Number(day.count ?? day.level ?? 0)
    if (date) byDate.set(date, count)
  }
  const weeks: { date: string; level: number }[][] = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 52 * 7)
  start.setDate(start.getDate() - start.getDay())

  for (let w = 0; w < 53; w += 1) {
    const column: { date: string; level: number }[] = []
    for (let d = 0; d < 7; d += 1) {
      const cell = new Date(start)
      cell.setDate(start.getDate() + w * 7 + d)
      const key = cell.toISOString().slice(0, 10)
      const count = byDate.get(key) ?? 0
      const level = count === 0 ? 0 : count < 2 ? 1 : count < 5 ? 2 : count < 10 ? 3 : 4
      column.push({ date: key, level })
    }
    weeks.push(column)
  }
  return weeks
})

const joined = computed(() => (profile.value ? relativeTime(profile.value.createdAt) : ''))

const bannerVisible = ref(true)
const bannerUrl = computed(() => `/api/v1/users/${userId.value}/background`)
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <div v-if="loading" class="pc-spin">
        <ProgressRing IsActive="True" :Width="36" :Height="36" />
      </div>

      <EmptyState
        v-else-if="error || !profile"
        glyph="&#xE77B;"
        title="找不到这个用户"
        :description="error || ''"
      />

      <template v-else>
        <section class="pc-profile-hero">
          <div class="pc-profile-banner">
            <img
              v-if="bannerVisible"
              class="pc-profile-banner-img"
              :src="bannerUrl"
              alt=""
              @error="bannerVisible = false"
            />
          </div>
          <div class="pc-profile-body">
            <PersonPicture
              class="pc-profile-avatar"
              :DisplayName="profile.username"
              :Initials="initials(profile.username)"
              :ProfilePicture="avatarUrl(profile) || undefined"
              :Width="100"
              :Height="100"
            />

            <div class="pc-grow" style="padding-bottom: 6px">
              <div class="pc-row" style="gap: 8px; flex-wrap: wrap">
                <h1 class="pc-profile-name">{{ profile.username }}</h1>
                <span class="pc-level">Lv.{{ profile.level?.current ?? 1 }}</span>
                <span v-if="profile.displayedBadge" class="pc-badge-pill">
                  {{ profile.displayedBadge.name }}
                </span>
              </div>
              <p class="pc-muted" style="margin: 2px 0 0">
                {{ joined }}加入<template v-if="profile.region"> · {{ profile.region }}</template>
              </p>
            </div>

            <div class="pc-row" style="padding-bottom: 6px">
              <Button v-if="isSelf" @Click="navigate('/settings')">
                <span class="pc-btn-content"><span class="pc-btn-icon">&#xE70F;</span><span>编辑资料</span></span>
              </Button>
              <Button
                v-else
                :Style="following ? '' : 'AccentButtonStyle'"
                :IsEnabled="!followBusy"
                @Click="toggleFollow"
              >
                {{ following ? '已关注' : '关注' }}
              </Button>
            </div>
          </div>

          <div style="padding: 0 20px 18px">
            <p v-if="profile.bio" class="pc-profile-bio">{{ profile.bio }}</p>
            <div class="pc-stat-grid">
              <div class="pc-stat">
                <span class="pc-stat-value">{{ compactNumber(profile.stats?.followers) }}</span>
                <span class="pc-stat-label">粉丝</span>
              </div>
              <div class="pc-stat">
                <span class="pc-stat-value">{{ compactNumber(profile.stats?.following) }}</span>
                <span class="pc-stat-label">关注</span>
              </div>
              <div class="pc-stat">
                <span class="pc-stat-value">{{ compactNumber(profile.stats?.topics) }}</span>
                <span class="pc-stat-label">帖子</span>
              </div>
              <div class="pc-stat">
                <span class="pc-stat-value">{{ compactNumber(profile.stats?.replies) }}</span>
                <span class="pc-stat-label">回复</span>
              </div>
            </div>
          </div>
        </section>

        <div style="margin-top: 20px">
          <PcSelector v-model="tab" :tabs="tabs" />
        </div>

        <div v-if="tabLoading" class="pc-spin">
          <ProgressRing IsActive="True" :Width="28" :Height="28" />
        </div>

        <template v-else>
          <div v-if="tab === 'home'" class="pc-profile-home">
            <section>
              <h2 class="pc-section-title">精选帖子</h2>
              <div v-if="featuredTopics.length" class="pc-feed">
                <TopicCard v-for="topic in featuredTopics" :key="topic.id" :topic="topic" />
              </div>
              <EmptyState v-else glyph="&#xE7BA;" title="暂无精选帖子" />
            </section>

            <section>
              <h2 class="pc-section-title">精选作品</h2>
              <div v-if="featuredWorks.length" class="pc-work-grid">
                <WorkCard v-for="work in featuredWorks" :key="work.id" :work="work" />
              </div>
              <EmptyState v-else glyph="&#xE7C3;" title="暂无精选作品" />
            </section>

            <section>
              <h2 class="pc-section-title">最近动态</h2>
              <div v-if="activities.length" class="pc-card">
                <div v-for="activity in activities" :key="activity.id" class="pc-activity">
                  <span class="pc-activity-kind">{{ activity.kind }}</span>
                  <span class="pc-grow pc-activity-title">{{ activity.title }}</span>
                  <span class="pc-muted">{{ relativeTime(activity.occurredAt) }}</span>
                </div>
              </div>
              <EmptyState v-else glyph="&#xE81C;" title="还没有动态" />
            </section>

            <section>
              <h2 class="pc-section-title">贡献</h2>
              <div class="pc-card">
                <div class="pc-heatmap">
                  <div v-for="(week, wi) in heatmap" :key="wi" class="pc-heat-column">
                    <span
                      v-for="cell in week"
                      :key="cell.date"
                      class="pc-heat-cell"
                      :data-level="cell.level"
                      :title="`${cell.date}`"
                    />
                  </div>
                </div>
                <p class="pc-muted" style="margin: 10px 0 0">最近一年在 PickCat 的活跃程度</p>
              </div>
            </section>
          </div>

          <div v-else-if="tab === 'topics'">
            <div v-if="topics.length" class="pc-feed">
              <TopicCard v-for="topic in topics" :key="topic.id" :topic="topic" />
            </div>
            <EmptyState v-else glyph="&#xE7BA;" title="还没有发过帖子" />
          </div>

          <div v-else-if="tab === 'works'">
            <div v-if="works.length" class="pc-work-grid">
              <WorkCard v-for="work in works" :key="work.id" :work="work" />
            </div>
            <EmptyState v-else glyph="&#xE7C3;" title="还没有发布作品" />
          </div>

          <div v-else-if="tab === 'replies'">
            <div v-if="replies.length" class="pc-feed">
              <article
                v-for="reply in replies"
                :key="reply.id"
                class="pc-card pc-card--interactive"
                @click="reply.topic && navigate(`/forum/post/${reply.topic.id}`)"
              >
                <div class="pc-feed-meta" style="margin-bottom: 6px">
                  <span class="pc-username">{{ reply.topic?.title || '帖子' }}</span>
                  <span class="pc-grow" />
                  <span class="pc-muted">{{ relativeTime(reply.createdAt) }}</span>
                </div>
                <p class="pc-feed-excerpt">
                  {{ (reply.cookedHtml || '').replace(/<[^>]*>/g, '').slice(0, 160) }}
                </p>
              </article>
            </div>
            <EmptyState v-else glyph="&#xE90A;" title="还没有回复过" />
          </div>

          <div v-else-if="tab === 'following' || tab === 'followers'">
            <div
              v-if="(tab === 'following' ? followings : followers).length"
              class="pc-people-grid"
            >
              <div
                v-for="person in tab === 'following' ? followings : followers"
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
            <EmptyState
              v-else
              glyph="&#xE77B;"
              :title="tab === 'following' ? '还没有关注任何人' : '还没有粉丝'"
            />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style>
.pc-profile-name {
  font-size: 26px;
  line-height: 32px;
  font-weight: 600;
  margin: 0;
}

.pc-level {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 18%, transparent);
  color: var(--pc-accent, #ff6b60);
}

.pc-profile-bio {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: pre-wrap;
}

.pc-profile-home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pc-activity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 6%, transparent);
  font-size: 13px;
}

.pc-activity:last-child {
  border-bottom: none;
}

.pc-activity-kind {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-secondary);
  flex: 0 0 auto;
}

.pc-activity-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.pc-person {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
