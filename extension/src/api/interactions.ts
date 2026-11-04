import { api } from './client'

/**
 * Endpoints the remake did not cover yet.
 *
 * Request bodies were recovered from the site's own bundle (see
 * tools/extract-bodies.mjs) because docs/API.md only records method + path.
 */

export type BookmarkableType = 'TOPIC' | 'POST' | 'WORK_COMMENT'

interface BookmarkCreated {
  id?: string
  bookmarkId?: string
}

/** POST /bookmarks — body shape copied from the original client. */
export async function createBookmark(
  bookmarkableType: BookmarkableType,
  bookmarkableId: string,
): Promise<string> {
  const created = await api.post<BookmarkCreated>('/bookmarks', { bookmarkableType, bookmarkableId })
  return created?.id ?? created?.bookmarkId ?? ''
}

/** DELETE /bookmarks/{bookmarkId} */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await api.del(`/bookmarks/${encodeURIComponent(bookmarkId)}`)
}

/** PUT|DELETE /works/{workId}/like */
export async function setWorkLike(workId: string, liked: boolean): Promise<void> {
  if (liked) await api.put(`/works/${workId}/like`)
  else await api.del(`/works/${workId}/like`)
}

/** PUT|DELETE /works/{workId}/favorite — "收藏" for works, distinct from /like. */
export async function setWorkFavorite(workId: string, favorited: boolean): Promise<void> {
  if (favorited) await api.put(`/works/${workId}/favorite`)
  else await api.del(`/works/${workId}/favorite`)
}

/** PUT|DELETE /works/{workId}/comments/{n}/like */
export async function setWorkCommentLike(
  workId: string,
  commentNumber: number,
  liked: boolean,
): Promise<void> {
  const path = `/works/${workId}/comments/${commentNumber}/like`
  if (liked) await api.put(path)
  else await api.del(path)
}

/** DELETE /works/{workId}/comments/{n} */
export async function deleteWorkComment(workId: string, commentNumber: number): Promise<void> {
  await api.del(`/works/${workId}/comments/${commentNumber}`)
}

export interface ReportReason {
  code: string
  label: string
}

/**
 * What the original client offers. `reasonCode` is passed straight through, so
 * the list only needs to cover the codes the site actually uses.
 */
export const REPORT_REASONS: ReportReason[] = [
  { code: 'SPAM', label: '垃圾广告' },
  { code: 'HARASSMENT', label: '人身攻击 / 骚扰' },
  { code: 'NSFW', label: '不适宜内容' },
  { code: 'MISINFORMATION', label: '虚假信息' },
  { code: 'COPYRIGHT', label: '侵犯著作权' },
  { code: 'OTHER', label: '其他' },
]

/** POST /posts/{postId}/reports */
export async function reportPost(
  postId: string,
  reasonCode: string,
  detail?: string,
): Promise<void> {
  await api.post(`/posts/${postId}/reports`, {
    targetKind: 'POST',
    reasonCode,
    ...(detail ? { detail } : {}),
  })
}

/** POST /users/{userId}/profile-reports */
export async function reportUser(userId: string, reasonCode: string, detail?: string): Promise<void> {
  await api.post(`/users/${userId}/profile-reports`, {
    targetKind: 'USER',
    reasonCode,
    ...(detail ? { detail } : {}),
  })
}

/** PUT /users/{userId}/featured-topics — {topicIds} */
export async function setFeaturedTopics(userId: string, topicIds: string[]): Promise<void> {
  await api.put(`/users/${userId}/featured-topics`, { topicIds })
}

/** PUT /users/{userId}/featured-works — {workIds} */
export async function setFeaturedWorks(userId: string, workIds: string[]): Promise<void> {
  await api.put(`/users/${userId}/featured-works`, { workIds })
}
