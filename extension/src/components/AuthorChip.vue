<script setup lang="ts">
import { navigate } from '@/router'
import { avatarUrl, initials } from '@/lib/format'
import type { UserRef } from '@/api/types'

withDefaults(
  defineProps<{
    user: UserRef | null | undefined
    size?: number
    time?: string
    hideName?: boolean
  }>(),
  { size: 24, time: '', hideName: false },
)

function open(id?: string): void {
  if (id) navigate(`/profile/${id}`)
}
</script>

<template>
  <div v-if="user" class="pc-author">
    <img
      v-if="avatarUrl(user)"
      class="pc-avatar"
      :src="avatarUrl(user)"
      :alt="user.username"
      :style="{ width: `${size}px`, height: `${size}px` }"
      loading="lazy"
      @click="open(user.id)"
    />
    <span
      v-else
      class="pc-avatar pc-avatar-fallback"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @click="open(user.id)"
      >{{ initials(user.username) }}</span
    >
    <span v-if="!hideName" class="pc-username pc-clickable" @click="open(user.id)">
      {{ user.username }}
    </span>
    <span v-if="user.displayedBadge" class="pc-badge-pill">{{ user.displayedBadge.name }}</span>
    <span v-if="time" class="pc-muted">{{ time }}</span>
  </div>
</template>

<style>
.pc-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
</style>
