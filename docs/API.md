# PickCat API 接口清单

从 `pickcat.dao3.fun` 的前端 bundle 中静态提取，共 **245** 个接口。

Base URL：`https://pickcat.dao3.fun/api/v1`

认证：Cookie `pickcat_session`（`POST /session` 获取，需要阿里云人机验证）。

分页统一为 `?cursor=<nextCursor>&limit=<n>`，返回 `{ items, pageInfo: { hasNextPage, nextCursor } }`。

## 目录

- [account-verification-policy](#accountverificationpolicy) — 2 个
- [approved-link-domains](#approvedlinkdomains) — 3 个
- [avatar-presets](#avatarpresets) — 1 个
- [badge-grant-batches](#badgegrantbatches) — 6 个
- [badges](#badges) — 6 个
- [bookmarks](#bookmarks) — 3 个
- [content-length-limit](#contentlengthlimit) — 1 个
- [content-length-quotas](#contentlengthquotas) — 2 个
- [emoji-collections](#emojicollections) — 5 个
- [emojis](#emojis) — 4 个
- [entrance-exam](#entranceexam) — 15 个
- [external-works](#externalworks) — 1 个
- [featured-works](#featuredworks) — 2 个
- [file-storage](#filestorage) — 1 个
- [file-storage-quotas](#filestoragequotas) — 2 个
- [file-upload-policy](#fileuploadpolicy) — 2 个
- [files](#files) — 4 个
- [groups](#groups) — 14 个
- [level-certifications](#levelcertifications) — 4 个
- [level-contributions](#levelcontributions) — 1 个
- [level-progress](#levelprogress) — 1 个
- [like-notification-groups](#likenotificationgroups) — 3 个
- [management-actions](#managementactions) — 2 个
- [moderation](#moderation) — 26 个
- [notification-summary](#notificationsummary) — 1 个
- [notifications](#notifications) — 2 个
- [official-account](#officialaccount) — 4 个
- [oidc-clients](#oidcclients) — 9 个
- [password-resets](#passwordresets) — 2 个
- [permissions](#permissions) — 1 个
- [post-submissions](#postsubmissions) — 2 个
- [posts](#posts) — 10 个
- [product-analytics](#productanalytics) — 1 个
- [profile-activities](#profileactivities) — 1 个
- [questions](#questions) — 4 个
- [reading-sessions](#readingsessions) — 1 个
- [recommendation-events](#recommendationevents) — 1 个
- [registration-email-domains](#registrationemaildomains) — 2 个
- [registrations](#registrations) — 2 个
- [search](#search) — 2 个
- [session](#session) — 3 个
- [tags](#tags) — 5 个
- [topic-collection-quotas](#topiccollectionquotas) — 2 个
- [topic-collection-usage](#topiccollectionusage) — 1 个
- [topic-collections](#topiccollections) — 4 个
- [topic-recommendations](#topicrecommendations) — 1 个
- [topics](#topics) — 10 个
- [user-badge-displays](#userbadgedisplays) — 1 个
- [users](#users) — 40 个
- [work-favorites](#workfavorites) — 1 个
- [work-recommendations](#workrecommendations) — 1 个
- [works](#works) — 20 个

## account-verification-policy

| 方法 | 路径 |
| --- | --- |
| GET | `/account-verification-policy` |
| PUT | `/account-verification-policy` |

## approved-link-domains

| 方法 | 路径 |
| --- | --- |
| GET | `/approved-link-domains` |
| POST | `/approved-link-domains` |
| DELETE | `/approved-link-domains/{domainId}` |

## avatar-presets

| 方法 | 路径 |
| --- | --- |
| GET | `/avatar-presets` |

## badge-grant-batches

| 方法 | 路径 |
| --- | --- |
| GET | `/badge-grant-batches` |
| POST | `/badge-grant-batches` |
| GET | `/badge-grant-batches/{batchId}` |
| POST | `/badge-grant-batches/{batchId}/actions` |
| GET | `/badge-grant-batches/{batchId}/items` |
| POST | `/badge-grant-batches/{batchId}/reports` |

## badges

| 方法 | 路径 |
| --- | --- |
| GET | `/badges` |
| POST | `/badges` |
| DELETE | `/badges/{badgeId}` |
| GET | `/badges/{badgeId}` |
| PATCH | `/badges/{badgeId}` |
| GET | `/badges/{badgeId}/image` |

## bookmarks

| 方法 | 路径 |
| --- | --- |
| GET | `/bookmarks` |
| POST | `/bookmarks` |
| DELETE | `/bookmarks/{bookmarkId}` |

## content-length-limit

| 方法 | 路径 |
| --- | --- |
| GET | `/content-length-limit` |

## content-length-quotas

| 方法 | 路径 |
| --- | --- |
| GET | `/content-length-quotas` |
| PUT | `/content-length-quotas` |

## emoji-collections

| 方法 | 路径 |
| --- | --- |
| GET | `/emoji-collections` |
| POST | `/emoji-collections` |
| DELETE | `/emoji-collections/{collectionId}` |
| GET | `/emoji-collections/{collectionId}` |
| PATCH | `/emoji-collections/{collectionId}` |

## emojis

| 方法 | 路径 |
| --- | --- |
| GET | `/emojis` |
| POST | `/emojis` |
| GET | `/emojis/{emojiId}` |
| PATCH | `/emojis/{emojiId}` |

## entrance-exam

| 方法 | 路径 |
| --- | --- |
| GET | `/entrance-exam` |
| POST | `/entrance-exam/attempts` |
| PATCH | `/entrance-exam/attempts/{attemptId}` |
| GET | `/entrance-exam/attempts/{attemptId}/current-question` |
| PATCH | `/entrance-exam/attempts/{attemptId}/current-question` |
| GET | `/entrance-exam/plan` |
| PUT | `/entrance-exam/plan` |
| GET | `/entrance-exam/question-groups` |
| POST | `/entrance-exam/question-groups` |
| DELETE | `/entrance-exam/question-groups/{groupId}` |
| PATCH | `/entrance-exam/question-groups/{groupId}` |
| GET | `/entrance-exam/questions` |
| POST | `/entrance-exam/questions` |
| PATCH | `/entrance-exam/questions/{questionId}` |
| PUT | `/entrance-exam/questions/{questionId}` |

## external-works

| 方法 | 路径 |
| --- | --- |
| GET | `/external-works/codemao/{workId}` |

## featured-works

| 方法 | 路径 |
| --- | --- |
| GET | `/featured-works` |
| PUT | `/featured-works` |

## file-storage

| 方法 | 路径 |
| --- | --- |
| GET | `/file-storage` |

## file-storage-quotas

| 方法 | 路径 |
| --- | --- |
| GET | `/file-storage-quotas` |
| PUT | `/file-storage-quotas` |

## file-upload-policy

| 方法 | 路径 |
| --- | --- |
| GET | `/file-upload-policy` |
| PUT | `/file-upload-policy` |

## files

| 方法 | 路径 |
| --- | --- |
| GET | `/files` |
| POST | `/files` |
| PATCH | `/files/{fileId}/deletion` |
| PUT | `/files/{fileId}/deletion` |

## groups

| 方法 | 路径 |
| --- | --- |
| GET | `/groups` |
| POST | `/groups` |
| DELETE | `/groups/{groupId}` |
| GET | `/groups/{groupId}` |
| PATCH | `/groups/{groupId}` |
| GET | `/groups/{groupId}/grants` |
| POST | `/groups/{groupId}/grants` |
| DELETE | `/groups/{groupId}/grants/{grantId}` |
| PATCH | `/groups/{groupId}/grants/{grantId}` |
| GET | `/groups/{groupId}/members` |
| POST | `/groups/{groupId}/members` |
| DELETE | `/groups/{groupId}/members/{userId}` |
| GET | `/groups/{groupId}/quota-rules` |
| PUT | `/groups/{groupId}/quota-rules` |

## level-certifications

| 方法 | 路径 |
| --- | --- |
| GET | `/level-certifications` |
| POST | `/level-certifications` |
| GET | `/level-certifications/{certificationId}` |
| PATCH | `/level-certifications/{certificationId}` |

## level-contributions

| 方法 | 路径 |
| --- | --- |
| GET | `/level-contributions/{year}` |

## level-progress

| 方法 | 路径 |
| --- | --- |
| GET | `/level-progress` |

## like-notification-groups

| 方法 | 路径 |
| --- | --- |
| GET | `/like-notification-groups` |
| GET | `/like-notification-groups/{groupKey}` |
| GET | `/like-notification-groups/{groupKey}/likers` |

## management-actions

| 方法 | 路径 |
| --- | --- |
| GET | `/management-actions` |
| GET | `/management-actions/{managementActionId}` |

## moderation

| 方法 | 路径 |
| --- | --- |
| POST | `/moderation/content-removals` |
| GET | `/moderation/post-submissions` |
| POST | `/moderation/post-submissions/{submissionId}/decision` |
| GET | `/moderation/posts` |
| GET | `/moderation/posts/{postId}` |
| GET | `/moderation/profile-report-cases` |
| GET | `/moderation/profile-report-cases/{caseId}` |
| PATCH | `/moderation/profile-report-cases/{caseId}` |
| GET | `/moderation/report-cases` |
| GET | `/moderation/report-cases/{caseId}` |
| PATCH | `/moderation/report-cases/{caseId}` |
| GET | `/moderation/topic-quality-reassessments` |
| PATCH | `/moderation/topic-quality-reassessments/{runId}` |
| POST | `/moderation/topic-quality-reassessments/{runId}/actions` |
| GET | `/moderation/topic-quality-statistics` |
| GET | `/moderation/topics` |
| GET | `/moderation/topics/{topicId}` |
| GET | `/moderation/users/{userId}/profile` |
| PATCH | `/moderation/users/{userId}/profile` |
| GET | `/moderation/users/{userId}/silence` |
| PATCH | `/moderation/users/{userId}/silence` |
| GET | `/moderation/users/{userId}/suspension` |
| PATCH | `/moderation/users/{userId}/suspension` |
| GET | `/moderation/work-report-cases` |
| GET | `/moderation/work-report-cases/{caseId}` |
| PATCH | `/moderation/work-report-cases/{caseId}` |

## notification-summary

| 方法 | 路径 |
| --- | --- |
| GET | `/notification-summary` |

## notifications

| 方法 | 路径 |
| --- | --- |
| GET | `/notifications` |
| PATCH | `/notifications` |

## official-account

| 方法 | 路径 |
| --- | --- |
| GET | `/official-account` |
| PUT | `/official-account` |
| GET | `/official-account/works` |
| POST | `/official-account/works/sync` |

## oidc-clients

| 方法 | 路径 |
| --- | --- |
| GET | `/oidc-clients` |
| POST | `/oidc-clients` |
| DELETE | `/oidc-clients/{clientId}` |
| GET | `/oidc-clients/{clientId}` |
| PATCH | `/oidc-clients/{clientId}` |
| DELETE | `/oidc-clients/{clientId}/logo` |
| GET | `/oidc-clients/{clientId}/logo` |
| PUT | `/oidc-clients/{clientId}/logo` |
| POST | `/oidc-clients/{clientId}/secret` |

## password-resets

| 方法 | 路径 |
| --- | --- |
| POST | `/password-resets` |
| POST | `/password-resets/completions` |

## permissions

| 方法 | 路径 |
| --- | --- |
| GET | `/permissions` |

## post-submissions

| 方法 | 路径 |
| --- | --- |
| GET | `/post-submissions` |
| GET | `/post-submissions/{submissionId}` |

## posts

| 方法 | 路径 |
| --- | --- |
| POST | `/posts` |
| DELETE | `/posts/{postId}` |
| GET | `/posts/{postId}` |
| PATCH | `/posts/{postId}` |
| DELETE | `/posts/{postId}/like` |
| PUT | `/posts/{postId}/like` |
| DELETE | `/posts/{postId}/pin` |
| PUT | `/posts/{postId}/pin` |
| POST | `/posts/{postId}/reports` |
| GET | `/posts/{postId}/revisions` |

## product-analytics

| 方法 | 路径 |
| --- | --- |
| GET | `/product-analytics` |

## profile-activities

| 方法 | 路径 |
| --- | --- |
| GET | `/profile-activities` |

## questions

| 方法 | 路径 |
| --- | --- |
| DELETE | `/questions/{topicId}/duplicate` |
| PUT | `/questions/{topicId}/duplicate` |
| DELETE | `/questions/{topicId}/selected-answer` |
| PUT | `/questions/{topicId}/selected-answer` |

## reading-sessions

| 方法 | 路径 |
| --- | --- |
| PUT | `/reading-sessions/{readingSessionId}/batches/{sequence}` |

## recommendation-events

| 方法 | 路径 |
| --- | --- |
| POST | `/recommendation-events` |

## registration-email-domains

| 方法 | 路径 |
| --- | --- |
| GET | `/registration-email-domains` |
| PUT | `/registration-email-domains` |

## registrations

| 方法 | 路径 |
| --- | --- |
| POST | `/registrations` |
| PATCH | `/registrations/{registrationId}` |

## search

| 方法 | 路径 |
| --- | --- |
| GET | `/search/users` |
| GET | `/search/works` |

## session

| 方法 | 路径 |
| --- | --- |
| DELETE | `/session` |
| GET | `/session` |
| POST | `/session` |

## tags

| 方法 | 路径 |
| --- | --- |
| GET | `/tags` |
| POST | `/tags` |
| PATCH | `/tags/{tagSlug}` |
| GET | `/tags/{tagSlug}/sidebar-links` |
| PUT | `/tags/{tagSlug}/sidebar-links` |

## topic-collection-quotas

| 方法 | 路径 |
| --- | --- |
| GET | `/topic-collection-quotas` |
| PUT | `/topic-collection-quotas` |

## topic-collection-usage

| 方法 | 路径 |
| --- | --- |
| GET | `/topic-collection-usage` |

## topic-collections

| 方法 | 路径 |
| --- | --- |
| DELETE | `/topic-collections/{collectionId}` |
| GET | `/topic-collections/{collectionId}` |
| PATCH | `/topic-collections/{collectionId}` |
| GET | `/topic-collections/{collectionId}/topics` |

## topic-recommendations

| 方法 | 路径 |
| --- | --- |
| GET | `/topic-recommendations` |

## topics

| 方法 | 路径 |
| --- | --- |
| GET | `/topics` |
| GET | `/topics/{topicId}` |
| PATCH | `/topics/{topicId}` |
| DELETE | `/topics/{topicId}/closure` |
| PUT | `/topics/{topicId}/closure` |
| PUT | `/topics/{topicId}/collection` |
| GET | `/topics/{topicId}/duplicate-candidates` |
| DELETE | `/topics/{topicId}/pin` |
| PUT | `/topics/{topicId}/pin` |
| GET | `/topics/{topicId}/posts` |

## user-badge-displays

| 方法 | 路径 |
| --- | --- |
| GET | `/user-badge-displays` |

## users

| 方法 | 路径 |
| --- | --- |
| GET | `/users/{userId}` |
| PATCH | `/users/{userId}` |
| GET | `/users/{userId}/avatar` |
| PUT | `/users/{userId}/avatar` |
| PUT | `/users/{userId}/background` |
| GET | `/users/{userId}/badge-display` |
| PUT | `/users/{userId}/badge-display` |
| GET | `/users/{userId}/badges` |
| POST | `/users/{userId}/badges` |
| DELETE | `/users/{userId}/badges/{badgeId}` |
| GET | `/users/{userId}/badges/{badgeId}` |
| GET | `/users/{userId}/email` |
| POST | `/users/{userId}/email-changes` |
| PATCH | `/users/{userId}/email-changes/{emailChangeId}` |
| GET | `/users/{userId}/featured-topics` |
| PUT | `/users/{userId}/featured-topics` |
| GET | `/users/{userId}/featured-works` |
| PUT | `/users/{userId}/featured-works` |
| DELETE | `/users/{userId}/follow` |
| PUT | `/users/{userId}/follow` |
| GET | `/users/{userId}/followers` |
| GET | `/users/{userId}/following` |
| GET | `/users/{userId}/level-contributions/{year}` |
| GET | `/users/{userId}/oidc-grants` |
| DELETE | `/users/{userId}/oidc-grants/{clientId}` |
| GET | `/users/{userId}/phone` |
| POST | `/users/{userId}/phone-changes` |
| PATCH | `/users/{userId}/phone-changes/{phoneChangeId}` |
| GET | `/users/{userId}/posts` |
| GET | `/users/{userId}/profile-activities` |
| POST | `/users/{userId}/profile-reports` |
| PUT | `/users/{userId}/real-name-verification` |
| GET | `/users/{userId}/topic-collections` |
| POST | `/users/{userId}/topic-collections` |
| GET | `/users/{userId}/topics` |
| POST | `/users/{userId}/username-changes` |
| GET | `/users/{userId}/username-changes/{usernameChangeId}` |
| PATCH | `/users/{userId}/username-changes/{usernameChangeId}` |
| GET | `/users/{userId}/work-comments` |
| GET | `/users/{userId}/works` |

## work-favorites

| 方法 | 路径 |
| --- | --- |
| GET | `/work-favorites` |

## work-recommendations

| 方法 | 路径 |
| --- | --- |
| GET | `/work-recommendations` |

## works

| 方法 | 路径 |
| --- | --- |
| GET | `/works/{workId}` |
| PATCH | `/works/{workId}` |
| PUT | `/works/{workId}/coins` |
| PUT | `/works/{workId}/comment-reads` |
| GET | `/works/{workId}/comments` |
| POST | `/works/{workId}/comments` |
| DELETE | `/works/{workId}/comments/{commentNumber}` |
| GET | `/works/{workId}/comments/{commentNumber}` |
| PATCH | `/works/{workId}/comments/{commentNumber}` |
| DELETE | `/works/{workId}/comments/{commentNumber}/like` |
| PUT | `/works/{workId}/comments/{commentNumber}/like` |
| DELETE | `/works/{workId}/comments/{commentNumber}/pin` |
| PUT | `/works/{workId}/comments/{commentNumber}/pin` |
| GET | `/works/{workId}/comments/{commentNumber}/revisions` |
| DELETE | `/works/{workId}/favorite` |
| PUT | `/works/{workId}/favorite` |
| DELETE | `/works/{workId}/like` |
| PUT | `/works/{workId}/like` |
| GET | `/works/{workId}/stats` |
| POST | `/works/{workId}/sync` |

