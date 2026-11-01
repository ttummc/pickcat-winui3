<script setup lang="ts">
import { computed } from 'vue'
import { route, navigate } from '@/router'

const requested = computed(() => `/${route.params.path ?? ''}`.replace(/\/+$/, '') || '/')

const implemented = [
  { label: '首页', path: '/' },
  { label: '论坛', path: '/forum' },
  { label: '作品', path: '/works' },
  { label: '搜索', path: '/search' },
  { label: '通知', path: '/notifications' },
  { label: '个人作品库', path: '/library' },
  { label: '设置', path: '/settings' },
]

const openOriginal = (): void => {
  window.open(`https://pickcat.dao3.fun${requested.value}`, '_blank', 'noopener')
}
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <div class="pc-404">
        <div class="pc-404-glyph">&#xE7BA;</div>
        <h1 class="pc-404-title">这个页面还没重做</h1>
        <p class="pc-404-path">
          <code>{{ requested }}</code>
        </p>
        <p class="pc-404-desc">
          WinUI 3 版目前只重写了社区的主要页面。这个地址在原站存在，但在这里还没有对应界面 ——
          我不会假装它不存在然后把你丢回首页。
        </p>

        <div class="pc-404-actions">
          <Button Style="AccentButtonStyle" @Click="navigate('/')">回到首页</Button>
          <Button @Click="openOriginal">在原站打开</Button>
        </div>

        <div class="pc-404-list">
          <span class="pc-muted">已经做好的页面：</span>
          <div class="pc-tags">
            <button
              v-for="item in implemented"
              :key="item.path"
              class="pc-tag"
              @click="navigate(item.path)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.pc-404 {
  max-width: 620px;
  margin: 8vh auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.pc-404-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 46px;
  color: var(--text-tertiary);
}

.pc-404-title {
  font-size: 26px;
  font-weight: 600;
  margin: 4px 0 0;
}

.pc-404-path code {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.pc-404-desc {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 22px;
  margin: 6px 0 4px;
}

.pc-404-actions {
  display: flex;
  gap: 8px;
  margin: 6px 0 18px;
}

.pc-404-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  border-top: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
  padding-top: 16px;
  width: 100%;
}
</style>
