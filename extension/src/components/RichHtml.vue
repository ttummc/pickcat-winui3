<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeHtml } from '@/lib/html'

const props = defineProps<{ html: string | null | undefined }>()
const clean = computed(() => sanitizeHtml(props.html ?? ''))
</script>

<template>
  <div class="pc-rich" v-html="clean" />
</template>
