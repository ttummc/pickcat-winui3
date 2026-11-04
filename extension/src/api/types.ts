export interface Avatar {
  type: 'PRESET' | 'CUSTOM'
  id: string | number
  url: string
}

export interface BadgeImage {
  fileId: string
  url: string
  width: number
  height: number
}

export interface Badge {
  id: string
  name: string
  description?: string
  image?: BadgeImage
}

export interface UserRef {
  id: string
  username: string
  avatar: Avatar | null
  displayedBadge?: Badge | null
}

export interface Tag {
  id: string
  slug: string
  name: string
  description?: string | null
}

export interface ViewerCapabilities {
  canEdit?: boolean
  canReply?: boolean
  canDelete?: boolean
  canBookmark?: boolean
  canClose?: boolean
  canPin?: boolean
  canLike?: boolean
  canReport?: boolean
  canSelectAnswer?: boolean
  canUnpin?: boolean
  canPinGlobally?: boolean
  canReopen?: boolean
  canUnselectAnswer?: boolean
  canClearDuplicate?: boolean
  canMarkDuplicate?: boolean
  pinnableTagIds?: string[]
}

export interface ViewerState {
  liked?: boolean
  bookmarkId?: string | null
  selectedAnswer?: boolean
  following?: boolean
  followedBy?: boolean
  canFollow?: boolean
  canReport?: boolean
}

export interface Topic {
  id: string
  title: string
  kind: 'DISCUSSION' | 'QUESTION' | string
  excerpt?: string
  author: UserRef
  tags: Tag[]
  replyCount: number
  viewCount: number
  likeCount: number
  bookmarkCount: number
  closedAt?: string | null
  pinned?: boolean
  pinnedGlobally?: boolean
  lastActivityAt?: string
  createdAt: string
  editedAt?: string | null
  collection?: { id: string; name?: string } | null
}

export interface Post {
  id: string
  topicId: string
  postNumber: number
  replyToPostNumber?: number | null
  deleted: boolean
  children?: Post[]
  currentRevision?: number
  likeCount: number
  pinned?: boolean
  cookedHtml: string
  author: UserRef
  createdAt: string
  editedAt?: string | null
  viewerCapabilities?: ViewerCapabilities
  viewerState?: ViewerState
  replyCount?: number
  viewCount?: number
  bookmarkCount?: number
  topic?: { id: string; title: string }
}

export interface TopicDetail extends Topic {
  firstPost: Post
  viewerCapabilities: ViewerCapabilities
  viewerState?: ViewerState
  repliesTruncated?: boolean
}

export interface PageInfo {
  hasNextPage: boolean
  nextCursor: string | null
}

/** GET /users/{id}/followers | /following returns wrappers, not bare users. */
export interface FollowEdge {
  user: UserProfile
  followedAt?: string
}

export interface Page<T> {
  items: T[]
  pageInfo: PageInfo
}

export interface Work {
  id: string
  sourceWorkId: string
  sourceUserId?: string
  author: UserRef
  workName: string
  type: string
  forkEnable?: boolean
  isForked?: boolean
  parentUuid?: string | null
  operation?: string
  description?: string
  preview?: string | null
  screenshotCoverUrl?: string | null
  viewCount?: number
  coinCount?: number
  likeCount: number
  favoriteCount?: number
  commentCount?: number
  published?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkComment {
  commentNumber: number
  workId?: string
  markdown?: string
  cookedHtml?: string
  content?: string
  author: UserRef
  likeCount?: number
  replyToCommentNumber?: number | null
  createdAt: string
  editedAt?: string | null
  deleted?: boolean
  viewerState?: ViewerState
  viewerCapabilities?: ViewerCapabilities
}

export interface UserProfile {
  id: string
  username: string
  avatar: Avatar | null
  bio?: string | null
  region?: string | null
  showFollowingList?: boolean
  showFollowersList?: boolean
  backgroundFileId?: string | null
  profileVersion?: string
  createdAt: string
  level: { current: number }
  stats: {
    followers: number
    following: number
    topics: number
    replies: number
  }
  viewerState?: ViewerState
  displayedBadge?: Badge | null
}

export interface SessionUser {
  id: string
  username: string
  createdAt: string
  avatar: Avatar | null
  tokenBalance?: number
  level: { current: number }
  effectivePermissions?: { key: string; scopes?: unknown[] }[]
  displayedBadge?: Badge | null
}

export interface Session {
  user: SessionUser
  createdAt: string
  expiresAt: string
  silence?: unknown
}

export interface NotificationSummary {
  unreadCount: number
  unreadCountByType: Record<string, number>
}

export type NotificationType =
  | 'REPLY_CREATED'
  | 'WORK_COMMENT_REPLY_CREATED'
  | 'USER_MENTIONED'
  | 'WORK_COMMENT_MENTIONED'
  | 'MANAGEMENT_ACTION'
  | 'POST_LIKED'
  | 'TOPIC_EVENT'
  | 'USER_FOLLOWED'
  | 'LEVEL_CERTIFICATION'
  | 'WORK_COMMENT_CREATED'
  | 'WORK_LIKED'
  | 'WORK_COMMENT_LIKED'

export interface NotificationItem {
  id: string
  type: NotificationType
  read: boolean
  createdAt: string
  actor?: UserRef | null
  topic?: { id: string; title: string } | null
  post?: { id: string; postNumber: number } | null
  work?: { id: string; workName: string } | null
  payload?: Record<string, unknown>
  /** The API actually nests actor/topic/post/work in here. */
  details?: {
    actor?: UserRef | null
    topic?: { id: string; title: string } | null
    post?: { id?: string; postNumber?: number } | null
    work?: { id: string; workName: string } | null
    [key: string]: unknown
  } | null
}

export interface LevelProgress {
  currentLevel: number
  scores: { ability: number; responsibility: number; care: number }
  nextLevel?: {
    level: number
    eligible: boolean
    scores: Record<string, { current: number; required: number; met: boolean }>
    familiarity: Record<string, { current: number; required: number; met: boolean }>
  }
  familiarity?: {
    daysSinceEntranceExam: number
    validVisitDays: number
    topicsEntered: number
    postsRead: number
    effectiveReadingSeconds: number
  }
}

export interface ProfileActivity {
  id: string
  kind: string
  occurredAt: string
  title: string
  level?: number | null
}

export interface LevelContribution {
  date?: string
  count?: number
  level?: number
  [key: string]: unknown
}

export interface TopicCollection {
  id: string
  name: string
  description?: string | null
  topicCount?: number
  createdAt?: string
}

export interface WorkRecommendationQuery {
  sort?: 'recommended' | 'latest'
  scope?: 'all' | 'following'
  cursor?: string
  limit?: number
}
