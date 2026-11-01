<script setup lang="ts">
import { ref, watchEffect, onBeforeUnmount } from 'vue'
import { navigate } from '@/router'
import { hasTextSelection } from '@/lib/selection'
import { registerCard, unregisterCard, workCardKey } from '@/stores/cardRegistry'
import { compactNumber } from '@/lib/format'
import type { Work } from '@/api/types'

const props = defineProps<{ work: Work }>()

const card = ref<HTMLElement | null>(null)

const cardKey = workCardKey(props.work.id)
watchEffect(() => registerCard(cardKey, { kind: 'work', work: props.work }))
onBeforeUnmount(() => unregisterCard(cardKey))

function open(): void {
  if (hasTextSelection()) return
  navigate(`/works/${props.work.id}`)
}

</script>

<template>
  <article ref="card" class="pc-work-card" :data-card-key="cardKey" @click="open">
    <img
      v-if="work.screenshotCoverUrl || work.preview"
      class="pc-work-cover"
      :src="work.screenshotCoverUrl || work.preview || ''"
      :alt="work.workName"
      loading="lazy"
    />
    <div v-else class="pc-work-cover pc-work-cover--empty">&#xE7C3;</div>

    <div class="pc-work-body">
      <h4 class="pc-work-title">{{ work.workName }}</h4>
      <span class="pc-work-desc">{{ work.description || work.operation || '暂无简介' }}</span>
      <div class="pc-feed-meta">
        <span class="pc-username">{{ work.author?.username }}</span>
        <span class="pc-grow" />
        <span class="pc-meta-item" title="浏览">
          <span class="pc-meta-glyph">&#xE7B3;</span>{{ compactNumber(work.viewCount) }}
        </span>
        <span class="pc-meta-item" title="点赞">
          <span class="pc-meta-glyph">&#xEB51;</span>{{ compactNumber(work.likeCount) }}
        </span>
      </div>
    </div>
  </article>
</template>

<style>
.pc-work-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 32px;
  color: var(--text-tertiary);
}
</style>
