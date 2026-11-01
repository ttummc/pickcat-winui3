<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { signIn, sessionState } from '@/stores/session'
import { navigate } from '@/router'
import { notify } from '@/stores/ui'
import { createLoginCaptcha, type CaptchaHandle } from '@/lib/captcha'
import { PickCatApiError } from '@/api/client'

const account = ref('')
const password = ref('')
const brandIcon = '/favicon.png'
const error = ref<string | null>(null)
const busy = ref(false)
const captchaReady = ref(false)

const anchor = ref<HTMLButtonElement | null>(null)
const host = ref<HTMLDivElement | null>(null)
let captcha: CaptchaHandle | null = null

const canSubmit = computed(() => account.value.trim().length > 0 && password.value.length > 0 && !busy.value)

onMounted(async () => {
  if (!anchor.value || !host.value) return
  try {
    captcha = await createLoginCaptcha(anchor.value, host.value, (message) => {
      error.value = message
    })
    captchaReady.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '人机验证加载失败'
  }
})

onBeforeUnmount(() => captcha?.destroy())

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  error.value = null
  busy.value = true
  try {
    if (!captcha) throw new Error('人机验证尚未就绪，请刷新后重试')
    const captchaVerifyParam = await captcha.verify()
    await signIn({
      account: account.value.trim(),
      password: password.value,
      captchaVerifyParam,
    })
    notify('登录成功', `欢迎回来，${sessionState.user?.username ?? ''}`, 'Success')
    navigate('/')
  } catch (err) {
    if (err instanceof PickCatApiError) {
      error.value =
        err.code === 'CAPTCHA_INVALID'
          ? '人机验证未通过，请重试'
          : err.status === 401 || err.status === 403
            ? '账号或密码不正确'
            : err.message
    } else {
      error.value = err instanceof Error ? err.message : '登录失败'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="pc-login">
    <div class="pc-login-card">
      <div class="pc-login-brand">
        <img :src="brandIcon" alt="" width="36" height="36" />
        <div>
          <div class="pc-login-title">欢迎回来</div>
          <div class="pc-muted">登录后继续参与讨论、发布作品和查看消息。</div>
        </div>
      </div>

      <div>
        <label class="pc-field-label">邮箱 / 手机号</label>
        <TextBox v-model:Text="account" PlaceholderText="输入已验证的邮箱或手机号" />
      </div>

      <div>
        <label class="pc-field-label">密码</label>
        <PasswordBox v-model:Password="password" PlaceholderText="输入你的密码" />
      </div>

      <div v-if="error">
        <InfoBar IsOpen="True" Title="无法登录" :Message="error" Severity="Error" IsClosable="True" />
      </div>

      <Button Style="AccentButtonStyle" :IsEnabled="canSubmit" @Click="submit">
        {{ busy ? '正在登录…' : '登录' }}
      </Button>

      <div class="pc-row pc-row--between">
        <span class="pc-muted">{{ captchaReady ? '登录时会弹出滑块验证' : '正在加载人机验证…' }}</span>
        <button class="pc-link" @click="navigate('/')">先去逛逛</button>
      </div>

      <!-- The captcha library triggers from this hidden anchor; the visible
           button above drives the flow so our own submit logic stays in control. -->
      <button ref="anchor" class="pc-captcha-anchor" tabindex="-1" aria-hidden="true"></button>
      <div ref="host" class="pc-captcha-host" />
    </div>
  </div>
</template>

<style>
.pc-captcha-anchor {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.pc-captcha-host {
  position: absolute;
  left: -9999px;
  top: -9999px;
}
</style>
