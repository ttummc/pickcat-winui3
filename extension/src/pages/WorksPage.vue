<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { PipsPager } from 'winuionweb'
import { api } from '@/api/client'
import type { Work, Page } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { navigate } from '@/router'
import WorkCard from '@/components/WorkCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import PcSelector from '@/components/PcSelector.vue'

type WorkSort = 'recommended' | 'latest'

const sort = ref<WorkSort>('recommended')
const featured = ref<Work[]>([])
const featuredIndex = ref(0)

const feed = usePagedList<Work>((cursor, signal) =>
  api.get<Page<Work>>(
    '/work-recommendations',
    { sort: sort.value, scope: 'all', limit: 12, cursor },
    signal,
  ),
)

watch(sort, () => void feed.reload())

onMounted(async () => {
  await feed.reload()
  try {
    const result = await api.get<Page<Work>>('/featured-works', { limit: 7 })
    featured.value = result.items ?? []
  } catch {
    featured.value = []
  }
})

const hero = computed(() => featured.value[featuredIndex.value] ?? null)

function step(delta: number): void {
  if (!featured.value.length) return
  const next = (featuredIndex.value + delta + featured.value.length) % featured.value.length
  featuredIndex.value = next
}

const tabs = [
  { key: 'recommended', label: '推荐' },
  { key: 'latest', label: '最新' },
]
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">作品</h1>
          <p class="pc-page-subtitle">社区里用 KittenN / BoxPlay 做出来的东西。</p>
        </div>
      </header>

      <section v-if="featured.length" class="pc-featured">
        <div class="pc-featured-main" @click="hero && navigate(`/works/${hero.id}`)">
          <img
            v-if="hero?.screenshotCoverUrl || hero?.preview"
            class="pc-featured-image"
            :src="hero?.screenshotCoverUrl || hero?.preview || ''"
            :alt="hero?.workName"
          />
          <div v-else class="pc-featured-image pc-work-cover--empty">&#xE7C3;</div>
          <div class="pc-featured-caption">
            <div>
              <h2 class="pc-featured-title">{{ hero?.workName }}</h2>
              <p class="pc-featured-sub">
                {{ hero?.author?.username }} · {{ hero?.description || hero?.operation || '作品' }}
              </p>
            </div>
            <div class="pc-featured-nav" @click.stop>
              <PipsPager
                v-model:SelectedPageIndex="featuredIndex"
                :NumberOfPages="featured.length"
                PreviousButtonVisibility="Visible"
                NextButtonVisibility="Visible"
                :MaxVisiblePips="5"
                Margin="0,0,0,2"
              />
            </div>
          </div>
        </div>

        <div class="pc-featured-side">
          <button
            v-for="(item, index) in featured.slice(0, 6)"
            :key="item.id"
            class="pc-featured-thumb"
            :class="{ 'pc-featured-thumb--active': index === featuredIndex }"
            @click="featuredIndex = index"
          >
            <img
              v-if="item.screenshotCoverUrl || item.preview"
              class="pc-thumb-img"
              :src="item.screenshotCoverUrl || item.preview || ''"
              :alt="item.workName"
              loading="lazy"
            />
            <div class="pc-thumb-body">
              <span class="pc-thumb-title">{{ item.workName }}</span>
              <span class="pc-thumb-meta">{{ item.author?.username }}</span>
              <span class="pc-thumb-meta">
                {{ item.viewCount ?? 0 }} 浏览 · {{ item.likeCount ?? 0 }} 赞
              </span>
            </div>
          </button>
        </div>
      </section>

      <h2 class="pc-section-title" style="margin-top: 28px">发现作品</h2>
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

      <EmptyState v-else-if="feed.isEmpty.value" glyph="&#xE7C3;" title="还没有作品" />

      <template v-else>
        <div class="pc-work-grid">
          <WorkCard v-for="work in feed.items.value" :key="work.id" :work="work" />
        </div>
        <div class="pc-sentinel" style="margin-top: 16px">
          <Button v-if="feed.hasNext.value" :IsEnabled="!feed.loadingMore.value" @Click="feed.loadMore()">
            {{ feed.loadingMore.value ? '加载中…' : '加载更多' }}
          </Button>
          <span v-else class="pc-muted">已经到底了</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.pc-featured {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .pc-featured {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pc-featured-main {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  background: var(--card-bg);
  min-height: 280px;
}

.pc-featured-image {
  width: 100%;
  height: 100%;
  min-height: 280px;
  max-height: 380px;
  object-fit: cover;
  display: block;
}

.pc-featured-caption {
  position: absolute;
  inset: auto 0 0 0;
  padding: 16px 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(to top, rgb(0 0 0 / 82%), rgb(0 0 0 / 0%));
  color: #fff;
}

.pc-featured-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
}

.pc-featured-sub {
  margin: 0;
  font-size: 12.5px;
  opacity: 0.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-featured-nav {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

.pc-round {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 35%);
  background: rgb(0 0 0 / 35%);
  color: #fff;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pc-round:hover {
  background: rgb(0 0 0 / 60%);
}

.pc-featured-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

.pc-featured-thumb {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  background: var(--card-bg);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--text-primary);
  min-width: 0;
}

.pc-featured-thumb:hover {
  border-color: color-mix(in srgb, var(--text-primary) 22%, transparent);
}

.pc-featured-thumb--active {
  border-color: var(--pc-accent, #ff6b60);
}

.pc-thumb-img {
  width: 64px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
  flex: 0 0 auto;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-thumb-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pc-thumb-title {
  font-size: 12.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-thumb-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
