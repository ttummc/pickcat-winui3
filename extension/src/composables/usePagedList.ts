import { ref, shallowRef, computed } from 'vue'
import type { Page, PageInfo } from '@/api/types'

export interface PagedSource<T> {
  items: T[]
  pageInfo?: PageInfo
}

/**
 * Cursor based paging for the feed-style endpoints. The PickCat API always
 * answers `{ items, pageInfo: { hasNextPage, nextCursor } }`, so one composable
 * covers topics, works, comments and notifications.
 */
export function usePagedList<T>(
  loader: (cursor: string | undefined, signal: AbortSignal) => Promise<PagedSource<T> | Page<T>>,
) {
  const items = shallowRef<T[]>([])
  const cursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasNext = ref(false)
  const loaded = ref(false)

  let controller: AbortController | null = null

  async function reload(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    error.value = null
    try {
      const page = await loader(undefined, controller.signal)
      items.value = page.items ?? []
      cursor.value = page.pageInfo?.nextCursor ?? null
      hasNext.value = Boolean(page.pageInfo?.hasNextPage)
      loaded.value = true
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      error.value = err instanceof Error ? err.message : '加载失败'
      items.value = []
      hasNext.value = false
    } finally {
      loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (!hasNext.value || loadingMore.value || loading.value || !cursor.value) return
    loadingMore.value = true
    try {
      const page = await loader(cursor.value, controller?.signal ?? new AbortController().signal)
      items.value = [...items.value, ...(page.items ?? [])]
      cursor.value = page.pageInfo?.nextCursor ?? null
      hasNext.value = Boolean(page.pageInfo?.hasNextPage)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError')
        error.value = err instanceof Error ? err.message : '加载更多失败'
    } finally {
      loadingMore.value = false
    }
  }

  return {
    items,
    loading,
    loadingMore,
    error,
    hasNext,
    loaded,
    isEmpty: computed(() => loaded.value && !loading.value && items.value.length === 0),
    reload,
    loadMore,
  }
}
