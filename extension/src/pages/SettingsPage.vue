<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { SettingsCard, ContentDialog, ProgressBar } from 'winuionweb'
import { api } from '@/api/client'
import type { LevelProgress, Avatar } from '@/api/types'
import { navigate } from '@/router'
import { avatarUrl, initials, compactNumber } from '@/lib/format'
import { uiState, setTheme, setAccent, ACCENTS, notify, notifyError, resolvedTheme } from '@/stores/ui'
import { sessionState, signOut, isSignedIn } from '@/stores/session'

const levelProgress = ref<LevelProgress | null>(null)
const presets = ref<Avatar[]>([])
const signingOut = ref(false)
const dialog = ref<{ ShowAsync: () => Promise<string> } | null>(null)

const themes = [
  { key: 'light' as const, label: '浅色', glyph: '\uE706' },
  { key: 'dark' as const, label: '深色', glyph: '\uE708' },
  { key: 'system' as const, label: '跟随系统', glyph: '\uE7F4' },
]

const accentKeys = Object.keys(ACCENTS)
const accentLabel = computed(() => ACCENTS[uiState.accent]?.label ?? 'PickCat 珊瑚红')

/** Average of the met-ratio across every requirement of the next level. */
const levelPercent = computed(() => {
  const next = levelProgress.value?.nextLevel
  if (!next) return 0
  const buckets = [next.scores, next.familiarity]
  const values: { current: number; required: number }[] = []
  for (const bucket of buckets) {
    for (const entry of Object.values(bucket ?? {})) {
      if (entry && typeof entry === 'object' && 'current' in entry && 'required' in entry)
        values.push(entry as { current: number; required: number })
    }
  }
  if (!values.length) return 0
  const total = values.reduce(
    (sum, item) => sum + Math.min(1, item.required > 0 ? item.current / item.required : 1),
    0,
  )
  return Math.round((total / values.length) * 100)
})

const levelSummary = computed(() => {
  const scores = levelProgress.value?.scores
  if (!scores) return ''
  return `能力 ${scores.ability} · 责任 ${scores.responsibility} · 关怀 ${scores.care}`
})

async function confirmSignOut(): Promise<void> {
  if (!dialog.value) return
  const result = await dialog.value.ShowAsync()
  if (result !== 'Primary') return
  signingOut.value = true
  try {
    await signOut()
    notify('已退出登录', '', 'Success')
    navigate('/')
  } catch (err) {
    notifyError(err, '退出失败')
  } finally {
    signingOut.value = false
  }
}

onMounted(async () => {
  if (isSignedIn.value) {
    try {
      levelProgress.value = await api.get<LevelProgress>('/level-progress')
    } catch {
      levelProgress.value = null
    }
  }
  try {
    const result = await api.get<{ items: Avatar[] }>('/avatar-presets')
    presets.value = (result.items ?? []).slice(0, 12)
  } catch {
    presets.value = []
  }
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">设置</h1>
          <p class="pc-page-subtitle">让 PickCat 变成你喜欢的样子。</p>
        </div>
      </header>

      <div class="pc-settings">
        <section class="pc-settings-group">
          <h2 class="pc-settings-heading">账户</h2>

          <template v-if="isSignedIn && sessionState.user">
            <SettingsCard :Header="sessionState.user.username" :Description="`Lv.${sessionState.user.level?.current ?? 1} · ${compactNumber(sessionState.user.tokenBalance)} 猫币`">
              <template #HeaderIcon>
                <img
                  v-if="avatarUrl(sessionState.user)"
                  class="pc-settings-avatar"
                  :src="avatarUrl(sessionState.user)"
                  alt=""
                />
                <span v-else class="pc-settings-avatar pc-avatar-fallback">
                  {{ initials(sessionState.user.username) }}
                </span>
              </template>
              <Button @Click="navigate(`/profile/${sessionState.user.id}`)">查看主页</Button>
            </SettingsCard>

            <SettingsCard
              v-if="levelProgress"
              :Header="`等级进度 · Lv.${levelProgress.currentLevel}`"
              :Description="levelSummary"
            >
              <template #HeaderIcon><FontIcon Glyph="&#xE9D9;" :FontSize="16" /></template>
              <div class="pc-level-meter">
                <ProgressBar :Value="levelPercent" :Maximum="100" :Width="150" />
                <span class="pc-muted">{{ levelPercent }}%</span>
              </div>
            </SettingsCard>
          </template>

          <SettingsCard v-else Header="未登录" Description="登录后才能发帖、点赞和查看通知。">
            <Button Style="AccentButtonStyle" @Click="navigate('/login')">登录</Button>
          </SettingsCard>
        </section>

        <section class="pc-settings-group">
          <h2 class="pc-settings-heading">外观</h2>

          <SettingsCard
            Header="应用主题"
            :Description="`当前：${resolvedTheme === 'dark' ? '深色' : '浅色'}`"
          >
            <template #HeaderIcon><FontIcon Glyph="&#xE793;" :FontSize="16" /></template>
            <div class="pc-segmented">
              <button
                v-for="theme in themes"
                :key="theme.key"
                class="pc-segment"
                :class="{ 'pc-segment--on': uiState.theme === theme.key }"
                @click="setTheme(theme.key)"
              >
                <span class="pc-segment-glyph">{{ theme.glyph }}</span>
                {{ theme.label }}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard Header="强调色" :Description="accentLabel">
            <template #HeaderIcon><FontIcon Glyph="&#xE790;" :FontSize="16" /></template>
            <div class="pc-swatches">
              <button
                v-for="key in accentKeys"
                :key="key"
                class="pc-swatch"
                :class="{ 'pc-swatch--on': uiState.accent === key }"
                :style="{ background: ACCENTS[key][resolvedTheme] }"
                :title="ACCENTS[key].label"
                @click="setAccent(key)"
              />
            </div>
          </SettingsCard>
        </section>

        <section v-if="presets.length" class="pc-settings-group">
          <h2 class="pc-settings-heading">头像预设</h2>
          <div class="pc-settings-card">
            <div class="pc-avatar-presets">
              <img
                v-for="preset in presets"
                :key="`${preset.id}`"
                class="pc-preset"
                :src="preset.url"
                alt=""
                loading="lazy"
              />
            </div>
            <p class="pc-muted" style="margin: 12px 0 0">
              这些是站点提供的预设头像；实际更换请到网页端操作。
            </p>
          </div>
        </section>

        <section class="pc-settings-group">
          <h2 class="pc-settings-heading">关于</h2>

          <SettingsCard
            Header="PickCat · WinUI 3 Edition"
            Description="用 WinUIonWeb 从零重构的客户端 —— 窗口、导航、列表、对话框都是重写的。"
          >
            <template #HeaderIcon><FontIcon Glyph="&#xE946;" :FontSize="16" /></template>
            <span class="pc-muted">v0.1.0</span>
          </SettingsCard>

          <SettingsCard
            v-if="isSignedIn"
            Header="退出登录"
            Description="会清除当前会话。"
          >
            <template #HeaderIcon><FontIcon Glyph="&#xE7E8;" :FontSize="16" /></template>
            <Button :IsEnabled="!signingOut" @Click="confirmSignOut">退出登录</Button>
          </SettingsCard>
        </section>
      </div>

      <ContentDialog
        ref="dialog"
        Title="退出 PickCat？"
        Content="退出后需要重新登录才能发帖和查看通知。"
        PrimaryButtonText="退出"
        CloseButtonText="取消"
        DefaultButton="Close"
      />
    </div>
  </div>
</template>

<style>
.pc-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
}

.pc-settings-heading {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--text-primary);
}

.pc-settings-group {
  display: flex;
  flex-direction: column;
}

.pc-settings-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.pc-level-meter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 210px;
  max-width: 100%;
}

.pc-level-meter > span {
  flex: 0 0 38px;
  text-align: right;
}

.pc-segmented {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
  gap: 2px;
}

.pc-segment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.pc-segment:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.pc-segment--on {
  background: var(--card-bg);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
}

.pc-segment-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 12px;
}

.pc-swatches {
  display: flex;
  gap: 8px;
}

.pc-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  outline-offset: 2px;
}

.pc-swatch--on {
  border-color: var(--text-primary);
}

.pc-settings-card {
  background: var(--card-bg);
  border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  border-radius: 8px;
  padding: 14px 16px;
}

.pc-avatar-presets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 10px;
}

.pc-preset {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}
</style>
