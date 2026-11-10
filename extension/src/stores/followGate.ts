import { computed, reactive } from 'vue'
import { api } from '@/api/client'
import { avatarUrl, initials } from '@/lib/format'
import { isSignedIn } from '@/stores/session'
import type { UserProfile } from '@/api/types'

/**
 * 关注校验。
 *
 * 登录后检查当前账号是否关注了指定账号；未关注则整站拦一层提示，提供一键关注。
 * 仅前端拦截，不涉及任何服务端限制。
 *
 * 目标账号的名称与头像每次都从接口现取，不写死，账号改名或换头像后提示会跟着变。
 */
export const REQUIRED_PROFILE_ID = '01a0faca-3c45-7654-bea1-4147d7af5165'
export const REQUIRED_PROFILE_URL = `https://pickcat.dao3.fun/profile/${REQUIRED_PROFILE_ID}`

export const followGateState = reactive({
  checking: false,
  checked: false,
  following: false,
  busy: false,
  error: '',
  /** 目标账号的最新信息，来自每次校验的接口响应。 */
  target: {
    id: REQUIRED_PROFILE_ID,
    username: '',
    avatar: '',
    initials: '?',
    loaded: false,
  },
})

/** 已登录且确认未关注时才拦截。检测失败按放行处理，避免把用户锁在门外。 */
export const followGateBlocking = computed(
  () => isSignedIn.value && followGateState.checked && !followGateState.following,
)

let inFlight: Promise<void> | null = null

function applyProfile(profile: UserProfile): void {
  followGateState.target = {
    id: profile.id || REQUIRED_PROFILE_ID,
    username: profile.username || '',
    avatar: avatarUrl(profile),
    initials: initials(profile.username),
    loaded: true,
  }
}

export async function checkFollowGate(): Promise<void> {
  if (!isSignedIn.value) {
    followGateState.checking = false
    followGateState.checked = false
    followGateState.following = false
    followGateState.error = ''
    return
  }
  if (inFlight) return inFlight

  followGateState.checking = true
  inFlight = (async () => {
    try {
      // 每次校验都重新拉取，保证名称与头像是最新的。
      const profile = await api.get<UserProfile>(`/users/${REQUIRED_PROFILE_ID}`)
      applyProfile(profile)
      followGateState.following = Boolean(profile.viewerState?.following)
      followGateState.error = ''
      followGateState.checked = true
    } catch (error) {
      // 接口不可用时放行，并保持 checked=false，下次回到窗口会重新校验；
      // 拦截功能不能成为“账号被锁在门外”的原因。
      followGateState.following = true
      followGateState.checked = false
      followGateState.error = error instanceof Error ? error.message : '关注状态读取失败'
    } finally {
      followGateState.checking = false
      inFlight = null
    }
  })()

  return inFlight
}

/** 一键关注；成功后立即解除拦截。 */
export async function followRequiredProfile(): Promise<boolean> {
  if (followGateState.busy) return false
  followGateState.busy = true
  try {
    await api.put(`/users/${REQUIRED_PROFILE_ID}/follow`)
    followGateState.following = true
    followGateState.error = ''
    return true
  } catch (error) {
    followGateState.error = error instanceof Error ? error.message : '关注失败，请稍后重试'
    return false
  } finally {
    followGateState.busy = false
  }
}

/** 关注后手动重新校验；同时刷新账号名称与头像。 */
export async function recheckFollowGate(): Promise<void> {
  followGateState.checked = false
  await checkFollowGate()
}
