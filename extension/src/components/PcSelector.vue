<script setup lang="ts">
import { computed } from 'vue'
import { SelectorBar } from 'winuionweb'

export interface TabItem {
  key: string
  label: string
}

const props = defineProps<{ tabs: TabItem[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/**
 * SelectorBar collects its children by component name, so a `v-for` (which
 * compiles to a Fragment) is not picked up. The supported data-driven path is
 * the `Items` prop: an array of SelectorBarItem *prop objects*.
 */
const items = computed(() =>
  props.tabs.map((tab) => ({
    Text: tab.label,
    Tag: tab.key,
    IsSelected: tab.key === props.modelValue,
  })),
)

/** args is deliberately empty — the selected item must be read off the sender. */
function onSelectionChanged(sender: { SelectedItem?: { Tag?: string | number } }): void {
  const tag = sender?.SelectedItem?.Tag
  if (typeof tag === 'string' && tag !== props.modelValue) emit('update:modelValue', tag)
}
</script>

<template>
  <SelectorBar class="pc-selector" :Items="items" @SelectionChanged="onSelectionChanged" />
</template>

<style>
.pc-selector {
  margin-bottom: 16px;
  max-width: 100%;
}
</style>
