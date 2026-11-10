<script setup lang="ts">
import { computed } from 'vue'
import {
  REQUIRED_PROFILE_NAME,
  REQUIRED_PROFILE_URL,
  followGateState,
  followRequiredProfile,
  recheckFollowGate,
} from '@/stores/followGate'

/**
 * 关注校验拦截层。
 *
 * 登录后若未关注指定账号，用一层全屏遮罩挡住界面，提供一键关注与重新检测。
 * 只做前端拦截。
 */
const busy = computed(() => followGateState.busy)

async function follow(): Promise<void> {
  await followRequiredProfile()
}
</script>

<template>
  <div class="pc-gate">
    <div class="pc-gate-card">
      <div class="pc-gate-icon">
        <FontIcon Glyph="&#xE77B;" />
      </div>

      <h1 class="pc-gate-title">需要先关注 {{ REQUIRED_PROFILE_NAME }}</h1>
      <p class="pc-gate-text">
        使用本客户端前，请先关注
        <HyperlinkButton
          :Content="REQUIRED_PROFILE_NAME"
          :NavigateUri="REQUIRED_PROFILE_URL"
          class="pc-gate-link"
        />
        。关注后即可正常浏览与发帖。
      </p>

      <p v-if="followGateState.error" class="pc-gate-error">{{ followGateState.error }}</p>

      <div class="pc-gate-actions">
        <Button
          Style="AccentButtonStyle"
          :IsEnabled="!busy"
          @Click="follow()"
        >
          <span class="pc-btn-content">{{ busy ? '正在关注…' : '一键关注' }}</span>
        </Button>
        <Button :IsEnabled="!busy" @Click="recheckFollowGate()">
          <span class="pc-btn-content">已关注，重新检测</span>
        </Button>
      </div>

      <p class="pc-gate-hint">关注操作在服务端完成，成功后本提示会自动消失。</p>
    </div>
  </div>
</template>

<style>
.pc-gate {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, #000 62%, transparent);
  backdrop-filter: blur(6px);
}

.pc-gate-card {
  width: min(460px, 100%);
  padding: 28px 28px 22px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
  background: #2b2b2b;
  box-shadow: 0 18px 48px rgb(0 0 0 / 45%);
  text-align: center;
}

.pc-gate-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 18%, transparent);
  color: var(--pc-accent, #ff6b60);
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 24px;
}

.pc-gate-title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.pc-gate-text {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 21px;
  color: var(--text-secondary);
}

.pc-gate-link {
  display: inline-flex;
  vertical-align: baseline;
  padding: 0 2px;
  min-height: 0;
  height: auto;
  font-size: 13px;
}

.pc-gate-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #ff8a80;
}

.pc-gate-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0 12px;
  flex-wrap: wrap;
}

.pc-gate-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
</style>
