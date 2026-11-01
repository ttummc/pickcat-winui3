<script setup lang="ts">
import { ref, watchEffect, onBeforeUnmount } from 'vue'
import { navigate } from '@/router'
import { hasTextSelection } from '@/lib/selection'
import { registerCard, unregisterCard, topicCardKey } from '@/stores/cardRegistry'
import { openContextMenu } from '@/stores/contextMenu'
import { relativeTime, compactNumber } from '@/lib/format'
import type { Topic } from '@/api/types'
import AuthorChip from './AuthorChip.vue'

const props = defineProps<{ topic: Topic }>()

const card = ref<HTMLElement | null>(null)

// The shell owns right clicks; cards announce what they represent.
const cardKey = topicCardKey(props.topic.id)
watchEffect(() => registerCard(cardKey, { kind: 'topic', topic: props.topic }))
onBeforeUnmount(() => unregisterCard(cardKey))
const menuAnchor = ref<HTMLElement | null>(null)

function open(): void {
  // Dragging to select text must not navigate away mid-selection.
  if (hasTextSelection()) return
  navigate(`/forum/post/${props.topic.id}`)
}

/** The "⋯" button opens the same shared menu, anchored under itself. */
function openMenuFromButton(): void {
  const rect = menuAnchor.value?.getBoundingClientRect()
  const selection = window.getSelection()
  const selectedText = selection && !selection.isCollapsed ? selection.toString() : ''
  openContextMenu({
    card: { kind: 'topic', topic: props.topic },
    anchor: menuAnchor.value,
    position: { X: rect ? rect.left : 0, Y: rect ? rect.bottom + 6 : 0 },
    editable: null,
    hasSelection: selectedText.trim().length > 0,
    selectedText,
  })
}

function openTag(slug: string): void {
  navigate(`/forum/category/${encodeURIComponent(slug)}`)
}


</script>

<template>
  <article
    ref="card"
    class="pc-card pc-card--interactive pc-feed-item pc-topic-card"
    :data-card-key="cardKey"
    @click="open"
   
  >
    <h3 class="pc-feed-title">
      <span v-if="topic.pinned" class="pc-pin" title="置顶">&#xE718;</span>
      {{ topic.title }}
    </h3>

    <div class="pc-card-menu" @click.stop>
      <span ref="menuAnchor" class="pc-menu-anchor">
        <Button
          class="pc-menu-btn"
          Padding="0"
          :Width="32"
          :Height="32"
          MinWidth="0"
          MinHeight="0"
          @Click="openMenuFromButton"
        >
          <FontIcon Glyph="&#xE712;" :FontSize="14" />
        </Button>
      </span>
    </div>

    <div v-if="topic.tags?.length" class="pc-tags" @click.stop>
      <button
        v-for="tag in topic.tags.slice(0, 4)"
        :key="tag.id"
        class="pc-tag pc-tag--accent"
        @click="openTag(tag.slug)"
      >
        #{{ tag.name }}
      </button>
    </div>

    <p v-if="topic.excerpt" class="pc-feed-excerpt">{{ topic.excerpt }}</p>

    <div class="pc-feed-meta">
      <AuthorChip :user="topic.author" :time="relativeTime(topic.lastActivityAt || topic.createdAt)" />
      <span class="pc-grow" />
      <span class="pc-meta-item" title="回复">
        <span class="pc-meta-glyph">&#xE90A;</span>{{ compactNumber(topic.replyCount) }}
      </span>
      <span class="pc-meta-item" title="浏览">
        <span class="pc-meta-glyph">&#xE7B3;</span>{{ compactNumber(topic.viewCount) }}
      </span>
      <span class="pc-meta-item" title="点赞">
        <span class="pc-meta-glyph">&#xEB51;</span>{{ compactNumber(topic.likeCount) }}
      </span>
    </div>
  </article>
</template>

<style>
.pc-topic-card {
  position: relative;
}

.pc-card-menu {
  position: absolute;
  top: 10px;
  right: 12px;
  opacity: 0;
  transition: opacity var(--fast-duration, 0.167s) ease;
}

.pc-topic-card:hover .pc-card-menu,
.pc-card-menu:focus-within {
  opacity: 1;
}

.pc-menu-anchor {
  display: inline-flex;
}

.pc-menu-btn {
  min-width: 0;
}

.pc-pin {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 14px;
  color: var(--pc-accent, #ff6b60);
}
</style>
