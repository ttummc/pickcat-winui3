# 原站功能对照 / Feature parity

按原站前端 bundle 提取的 **245 个接口** 逐项对照当前重制版。

> 说明：`manage/*`（审核、徽章管理、OIDC 客户端、用户组配额等）属于管理后台，普通用户不可见，
> 单列在末尾，不计入"用户功能缺失"。

**现状：40 / 245 接口被使用。**

本轮新增：帖子收藏、回复举报、作品点赞/取消、作品收藏/取消；登录改为官方原站页面。

---

## 一、页面级对照

| 原站路由 | 当前状态 | 说明 |
| --- | --- | --- |
| `/` | ✅ 已重做 | 推荐 / 最新 |
| `/forum` | ✅ | 最新 / 活跃 |
| `/forum/category/:id` | ✅ | |
| `/forum/post/:id` | ⚠️ 部分 | 缺编辑、删除、收藏、举报、楼层跳转、只看作者 |
| `/forum/editor` | ⚠️ 部分 | 缺草稿、表情、图片上传、预览校验 |
| `/works` | ✅ | 精选 + 推荐 |
| `/works/:id` | ⚠️ 部分 | 缺点赞、收藏、金币、评论点赞/删除/编辑、统计 |
| `/profile/:uid` | ⚠️ 部分 | 缺关注/取关切换、徽章、精选设置、作品评论列表 |
| `/notifications` | ✅ | 缺按类型筛选 |
| `/notifications/likes/:key` | ✅ | |
| `/search` | ✅ | 仅用户 / 作品（原站也只有这两类） |
| `/settings` | ⚠️ 部分 | 缺改用户名、邮箱、手机、头像、背景 |
| `/personal-library` | ⚠️ 部分 | 只读列表，缺上传、删除 |
| `/login` | ✅ | 完全使用官方原站页面（不注入、不拦截） |
| `/register` | ❌ | 未做 |
| `/forgot-password` | ❌ | 未做 |
| `/reset-password/:id` | ❌ | 未做 |
| `/circles` | ❌ | 未做（用户组） |
| `/create/*` | ❌ | 创作入口（跳外部） |
| `/entrance-exam` | ❌ | 未做 |
| `/review`、`/manage/*` | ❌ | 管理后台，暂不做 |

---

## 二、功能级缺口（用户可见）

### 帖子 / 回复

| 功能 | 接口 | 状态 |
| --- | --- | --- |
| 点赞 / 取消点赞 | `PUT` / `DELETE /posts/{postId}/like` | ✅ |
| 编辑回复 | `PATCH /posts/{postId}` | ❌ |
| 删除回复 | `DELETE /posts/{postId}` | ❌ |
| 举报回复 | `POST /posts/{postId}/reports` `{targetKind, reasonCode, detail?}` | ✅ |
| 置顶 / 取消置顶 | `PUT` / `DELETE /posts/{postId}/pin` | ❌ |
| 编辑主题 | `PATCH /topics/{topicId}` | ❌ |
| 关闭 / 重开主题 | `PUT` / `DELETE /topics/{topicId}/closure` | ❌ |
| 置顶主题 | `PUT` / `DELETE /topics/{topicId}/pin` | ❌ |
| 修订历史 | `GET /posts/{postId}/revisions` | ❌ |
| 收藏帖子 | `POST /bookmarks` `{bookmarkableType:'TOPIC'\|'POST', bookmarkableId}` | ✅ 帖子 |
| 取消收藏 | `DELETE /bookmarks/{bookmarkId}` | ❌ |
| 我的收藏列表 | `GET /bookmarks` | ❌ |

### 作品

| 功能 | 接口 | 状态 |
| --- | --- | --- |
| 点赞 / 取消 | `PUT` / `DELETE /works/{workId}/like` | ✅ |
| 收藏 / 取消 | `PUT` / `DELETE /works/{workId}/favorite` | ✅ |
| 我的收藏 | `GET /work-favorites` | ❌ |
| 投币 | `PUT /works/{workId}/coins` | ❌ |
| 统计 | `GET /works/{workId}/stats` | ❌ |
| 评论点赞 / 取消 | `PUT` / `DELETE /works/{workId}/comments/{n}/like` | ❌ |
| 评论删除 | `DELETE /works/{workId}/comments/{n}` | ❌ |
| 评论编辑 | `PATCH /works/{workId}/comments/{n}` | ❌ |
| 评论置顶 | `PUT` / `DELETE .../pin` | ❌ |
| 已读回执 | `PUT /works/{workId}/comment-reads` | ❌ |
| 发布 / 下架 | `PATCH /works/{workId}` `{published}` | ❌ |
| 同步外部作品 | `POST /works/{workId}/sync` | ❌ |

### 用户 / 个人中心

| 功能 | 接口 | 状态 |
| --- | --- | --- |
| 关注 | `PUT /users/{userId}/follow` | ✅ |
| 取关 | `DELETE /users/{userId}/follow` | ❌ |
| 徽章列表 / 展示 | `GET /users/{userId}/badges`、`PUT .../badge-display` | ❌ |
| 改头像 | `PUT /users/{userId}/avatar` | ❌ |
| 改背景 | `PUT /users/{userId}/background` | ❌ |
| 改用户名 | `POST /users/{userId}/username-changes` | ❌ |
| 改邮箱 / 手机 | 对应 `*-changes` | ❌ |
| 实名认证 | `PUT /users/{userId}/real-name-verification` | ❌ |
| 精选帖子 / 作品 | `PUT /users/{userId}/featured-topics` `{topicIds}` / `featured-works` `{workIds}` | ❌ |
| 举报用户 | `POST /users/{userId}/profile-reports` | ❌ |
| 我发的评论 | `GET /users/{userId}/work-comments` | ❌ |

### 内容 / 其它

| 功能 | 接口 | 状态 |
| --- | --- | --- |
| 题集 | `topic-collections` ×4、`/users/{id}/topic-collections` | ❌ |
| 表情 | `GET /emojis`、`GET /emoji-collections` | ❌ |
| 文件上传 / 删除 | `POST /files`、`PATCH /files/{id}/deletion` | ❌ |
| 答题（入站考试） | `entrance-exam` ×15 | ❌ |
| 用户组 / 圈子 | `groups` ×14 | ❌ |
| 注册 / 找回密码 | `registrations`、`password-resets` | ❌ |
| 内容长度限制校验 | `GET /content-length-limit` | ❌ |
| 上传策略（允许的类型/大小） | `GET /file-upload-policy` | ❌ |

---

## 三、管理后台（暂不做）

`moderation`(26)、`badges`(6)、`badge-grant-batches`(6)、`oidc-clients`(9)、
`approved-link-domains`(3)、`groups` 管理部分、`entrance-exam` 题库部分、
`level-certifications`(4)、`official-account`(4)、`management-actions`(2)。

---

## 四、补全顺序

### P0 · 互动（最影响日常使用）

1. 帖子点赞可取消
2. 作品点赞 / 收藏 / 取消
3. 帖子与回复的收藏（bookmarks）+「我的收藏」页
4. 回复举报
5. 作品评论点赞 / 回复 / 删除

### P1 · 个人中心

6. 取关
7. 改头像 / 背景
8. 徽章展示
9. 精选帖子 / 作品
10. 我的收藏 / 我的评论聚合页

### P2 · 内容能力

11. 编辑 / 删除自己的帖子与回复
12. 表情面板
13. 图片上传（含策略校验）
14. 题集

### P3 · 独立页面

15. 注册 / 找回密码
16. 入站考试
17. 圈子

---

## 五、请求体来源

`docs/API.md` 只有方法 + 路径。写操作的实际请求体是从原站 bundle 里挖出来的，例如：

```js
// POST /bookmarks
{ bookmarkableType: 'TOPIC' | 'POST' | 'WORK_COMMENT', bookmarkableId }

// POST /posts/{postId}/reports
{ targetKind: 'POST', reasonCode, ...(detail ? { detail } : {}) }

// PUT /users/{userId}/featured-works
{ workIds: [...] }
```

抓取脚本见 `tools/extract-bodies.mjs`，产物缓存在 `research/chunks/`。
