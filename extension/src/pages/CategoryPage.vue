<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { api } from '@/api/client'
import type { Tag } from '@/api/types'
import { route, navigate } from '@/router'
import TopicFeed from '@/components/TopicFeed.vue'

const tags = ref<Tag[]>([])
const slug = computed(() => route.params.id ?? '')

const active = computed(() => tags.value.find((tag) => tag.slug === slug.value))

onMounted(async () => {
  try {
    const result = await api.get<{ items: Tag[] }>('/tags')
    tags.value = result.items ?? []
  } catch {
    tags.value = []
  }
})

watch(slug, () => {
  /* TopicFeed reacts through its tag prop */
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <button class="pc-link" @click="navigate('/forum')">← 返回论坛</button>
          <h1 class="pc-page-title" style="margin-top: 8px">#{{ active?.name || slug }}</h1>
          <p class="pc-page-subtitle">{{ active?.description || '这个分类下的话题' }}</p>
        </div>
        <Button Style="AccentButtonStyle" @Click="navigate('/forum/editor')">
          <span class="pc-btn-content"><span class="pc-btn-icon">&#xE710;</span><span>在这里发帖</span></span>
        </Button>
      </header>

      <TopicFeed :tag="slug" />
    </div>
  </div>
</template>
