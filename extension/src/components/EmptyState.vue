<script setup lang="ts">
withDefaults(
  defineProps<{
    glyph?: string
    title: string
    description?: string
    actionLabel?: string
  }>(),
  { glyph: '\uE7BA', description: '', actionLabel: '' },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="pc-empty">
    <div class="pc-empty-glyph-ring">
      <div class="pc-empty-glyph">{{ glyph }}</div>
    </div>
    <div>
      <div class="pc-empty-title">{{ title }}</div>
      <div v-if="description" class="pc-empty-desc">{{ description }}</div>
    </div>
    <Button v-if="actionLabel" @Click="$emit('action')">{{ actionLabel }}</Button>
  </div>
</template>

<style>
.pc-empty-glyph-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
  margin-bottom: 4px;
}

.pc-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}
.pc-empty-desc {
  font-size: 12px;
  margin-top: 4px;
  color: var(--text-tertiary);
}
</style>
