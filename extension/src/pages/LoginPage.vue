<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigate } from '@/router'
import { sessionState, loadSession } from '@/stores/session'
import { notify } from '@/stores/ui'

/**
 * Sign-in is the official page, untouched.
 *
 * The extension deliberately does not rebuild it: the real form carries the Aliyun
 * CAPTCHA, and any injected CSS or blocked resource breaks it. This screen only
 * hands the user over to the stock page and picks the session up afterwards.
 */
const opening = ref(false)
const checking = ref(false)

const loginUrl = 'https://pickcat.dao3.fun/login'
const brandIcon = chrome.runtime?.getURL?.('icons/pickcat.png') ?? '/favicon.png'

function openOfficial(): void {
  opening.value = true
  window.open(loginUrl, '_blank', 'noopener')
  window.setTimeout(() => {
    opening.value = false
  }, 1200)
}

async function checkAgain(): Promise<void> {
  checking.value = true
  try {
    await loadSession()
    if (sessionState.user) {
      notify('登录成功', `欢迎回来，${sessionState.user.username}`, 'Success')
      navigate('/')
    } else {
      notify('还没检测到登录', '请先在官方页面完成登录，再点这里', 'Warning')
    }
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  if (sessionState.user) navigate('/')
})
</script>

<template>
  <div class="pc-login">
    <div class="pc-login-card">
      <div class="pc-login-brand">
        <img :src="brandIcon" alt="" width="36" height="36" />
        <div>
          <div class="pc-login-title">登录使用官方页面</div>
          <div class="pc-muted">
            登录表单原样保留 PickCat 官方页面，我们不做任何改动 —— 滑块验证、账号保护都在那边完成。
          </div>
        </div>
      </div>

      <div class="pc-login-steps">
        <div class="pc-login-step">
          <span class="pc-login-step-num">1</span>
          <span>点下面的按钮，在新标签页打开官方登录页</span>
        </div>
        <div class="pc-login-step">
          <span class="pc-login-step-num">2</span>
          <span>完成账号密码与滑块验证</span>
        </div>
        <div class="pc-login-step">
          <span class="pc-login-step-num">3</span>
          <span>回到这个页面，点「我已完成登录」</span>
        </div>
      </div>

      <div class="pc-login-actions">
        <Button Style="AccentButtonStyle" @Click="openOfficial">
          <span class="pc-btn-content">
            <span class="pc-btn-icon">&#xE8A7;</span>
            {{ opening ? '已打开官方页面…' : '打开官方登录页' }}
          </span>
        </Button>
        <Button :IsEnabled="!checking" @Click="checkAgain">
          <span class="pc-btn-content">
            <span class="pc-btn-icon">&#xE72C;</span>
            {{ checking ? '检测中…' : '我已完成登录' }}
          </span>
        </Button>
      </div>

      <div class="pc-row pc-row--between">
        <span class="pc-muted">登录状态与官方页面共享，返回后自动带上</span>
        <button class="pc-link" @click="navigate('/')">先去逛逛</button>
      </div>
    </div>
  </div>
</template>

<style>
.pc-login-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-primary) 5%, transparent);
}

.pc-login-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.pc-login-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 18%, transparent);
  color: var(--pc-accent, #ff6b60);
  font-size: 11px;
  font-weight: 700;
  flex: 0 0 auto;
}

.pc-login-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
