<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api/client'
import type { Tag } from '@/api/types'
import { navigate } from '@/router'
import TopicFeed from '@/components/TopicFeed.vue'

const tags = ref<Tag[]>([])

onMounted(async () => {
  try {
    const result = await api.get<{ items: Tag[] }>('/tags')
    tags.value = result.items ?? []
  } catch {
    tags.value = []
  }
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">论坛</h1>
          <p class="pc-page-subtitle">所有话题，按分类归档。</p>
        </div>
        <Button Style="AccentButtonStyle" @Click="navigate('/forum/editor')">
          <span class="pc-btn-content"><span class="pc-btn-icon">&#xE710;</span><span>发布主题</span></span>
        </Button>
      </header>

      <div class="pc-split">
        <TopicFeed />

        <aside class="pc-rail">
          <div class="pc-rail-card">
            <h3 class="pc-rail-title">全部分类</h3>
            <div class="pc-cat-list">
              <button
                v-for="tag in tags"
                :key="tag.id"
                class="pc-cat"
                @click="navigate(`/forum/category/${encodeURIComponent(tag.slug)}`)"
              >
                <span class="pc-cat-name">#{{ tag.name }}</span>
                <span v-if="tag.description" class="pc-cat-desc">{{ tag.description }}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style>
.pc-cat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pc-cat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
}

.pc-cat:hover {
  background: color-mix(in srgb, var(--text-primary) 7%, transparent);
}

.pc-cat-name {
  font-size: 13px;
  font-weight: 600;
}

.pc-cat-desc {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 16px;
}
</style>
