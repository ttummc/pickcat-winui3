<script setup lang="ts">
import { computed } from 'vue'
import { EDITOR_ICONS } from '@/lib/editorIcons'

const props = defineProps<{ name: string }>()

const spec = computed(() => EDITOR_ICONS[props.name] ?? { strokes: [] })
</script>

<template>
  <svg
    class="pc-editor-icon"
    viewBox="0 0 20 20"
    width="20"
    height="20"
    aria-hidden="true"
    focusable="false"
  >
    <text
      v-if="spec.letter"
      x="10"
      y="15"
      text-anchor="middle"
      class="pc-editor-icon-letter"
    >
      {{ spec.letter }}
    </text>
    <path v-for="(d, i) in spec.filled ?? []" :key="`f${i}`" :d="d" class="pc-editor-icon-fill" />
    <path v-for="(d, i) in spec.strokes ?? []" :key="`s${i}`" :d="d" />
  </svg>
</template>

<style>
.pc-editor-icon {
  width: 20px;
  height: 20px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pc-editor-icon .pc-editor-icon-fill {
  fill: currentColor;
  stroke: none;
}

.pc-editor-icon .pc-editor-icon-letter {
  fill: currentColor;
  stroke: none;
  font-family: 'Segoe UI Variable Text', 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 600;
}
</style>
