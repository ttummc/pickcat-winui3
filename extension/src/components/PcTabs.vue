<script setup lang="ts">
export interface TabItem {
  key: string
  label: string
  badge?: number
}

const props = defineProps<{ tabs: TabItem[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="pc-tabs" role="tablist">
    <button
      v-for="tab in props.tabs"
      :key="tab.key"
      role="tab"
      class="pc-tab"
      :class="{ 'pc-tab--active': tab.key === props.modelValue }"
      :aria-selected="tab.key === props.modelValue"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge" class="pc-tab-badge">{{ tab.badge > 99 ? '99+' : tab.badge }}</span>
    </button>
  </div>
</template>

<style>
.pc-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  padding-bottom: 2px;
}

.pc-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: background var(--fast-duration, 0.167s) ease, color var(--fast-duration, 0.167s) ease;
}

.pc-tab:hover {
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
  color: var(--text-primary);
}

.pc-tab--active {
  color: var(--text-primary);
  font-weight: 600;
}

.pc-tab--active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -3px;
  height: 3px;
  border-radius: 2px 2px 0 0;
  background: var(--pc-accent, #ff6b60);
}

.pc-tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--pc-accent, #ff6b60);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
