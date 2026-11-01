import { ref } from 'vue'
import { api } from '@/api/client'
import type { NotificationSummary } from '@/api/types'
import { isSignedIn } from './session'

export const unreadCount = ref(0)
export const unreadByType = ref<Record<string, number>>({})

export async function refreshNotifications(): Promise<void> {
  if (!isSignedIn.value) {
    unreadCount.value = 0
    unreadByType.value = {}
    return
  }
  try {
    const summary = await api.get<NotificationSummary>('/notification-summary')
    unreadCount.value = Math.max(0, summary.unreadCount ?? 0)
    unreadByType.value = summary.unreadCountByType ?? {}
  } catch {
    /* a missing summary must never break the shell */
  }
}

export function clearUnread(): void {
  unreadCount.value = 0
}
