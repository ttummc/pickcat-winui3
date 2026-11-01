import { reactive, computed } from 'vue'
import { api, PickCatApiError } from '@/api/client'
import type { Session, SessionUser } from '@/api/types'

interface SessionState {
  user: SessionUser | null
  session: Session | null
  loading: boolean
  ready: boolean
  error: string | null
}

export const sessionState = reactive<SessionState>({
  user: null,
  session: null,
  loading: false,
  ready: false,
  error: null,
})

export const currentUser = computed(() => sessionState.user)
export const isSignedIn = computed(() => !!sessionState.user)

export async function loadSession(): Promise<void> {
  if (sessionState.loading) return
  sessionState.loading = true
  try {
    const session = await api.get<Session>('/session')
    sessionState.session = session
    sessionState.user = session.user
    sessionState.error = null
  } catch (error) {
    if (error instanceof PickCatApiError && (error.status === 401 || error.status === 403)) {
      sessionState.session = null
      sessionState.user = null
    } else {
      sessionState.error = error instanceof Error ? error.message : '无法连接服务器'
    }
  } finally {
    sessionState.loading = false
    sessionState.ready = true
  }
}

export interface LoginPayload {
  account: string
  password: string
  captchaVerifyParam: string
}

export async function signIn(payload: LoginPayload): Promise<Session> {
  const session = await api.post<Session>('/session', {
    account: payload.account.normalize('NFKC'),
    password: payload.password,
    captchaVerifyParam: payload.captchaVerifyParam,
  })
  sessionState.session = session
  sessionState.user = session.user
  sessionState.error = null
  return session
}

export async function signOut(): Promise<void> {
  try {
    await api.del('/session')
  } finally {
    sessionState.session = null
    sessionState.user = null
  }
}

export function patchCurrentUser(patch: Partial<SessionUser>): void {
  if (!sessionState.user) return
  sessionState.user = { ...sessionState.user, ...patch }
}
