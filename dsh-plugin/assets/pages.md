# 现有页面与路由

> 由 @pickcat/dsh-plugin 从 `C:\Users\tjh54\Desktop\PickCatButWinUI3OnWeb` 生成于 2026/11/8 20:06:57。
> 路由是手写的，新增页面要同步 `RouteName` 联合类型、`PATTERNS`、`PAGES` 三处。

| 路由名 | 路径 | 层级 | 页面文件 |
| --- | --- | --- | --- |
| `home` | / | 0 | `src/pages/HomePage.vue` |
| `forum` | /forum | 1 | `src/pages/ForumPage.vue` |
| `category` | /forum/category/:id | 2 | `src/pages/CategoryPage.vue` |
| `topic` | /forum/post/:id<br>/forum/post/:id/:postNumber | 3 | `src/pages/TopicPage.vue` |
| `compose` | /forum/editor | 2 | `src/pages/ComposerPage.vue` |
| `works` | /works | 1 | `src/pages/WorksPage.vue` |
| `work` | /works/:id | 2 | `src/pages/WorkPage.vue` |
| `profile` | /profile/:id | 2 | `src/pages/ProfilePage.vue` |
| `notifications` | /notifications | 1 | `src/pages/NotificationsPage.vue` |
| `likes` | /notifications/likes/:id | 2 | `src/pages/LikesPage.vue` |
| `search` | /search | 1 | `src/pages/SearchPage.vue` |
| `settings` | /settings | 1 | `src/pages/SettingsPage.vue` |
| `library` | /library | 1 | `src/pages/LibraryPage.vue` |
| `media` | /personal-library | 1 | `src/pages/MediaLibraryPage.vue` |
| `login` | /login | 1 | `src/pages/LoginPage.vue` |
| `dsh` | /dsh | 1 | `src/pages/DshPage.vue` |
| `notFound` | — | 1 | `src/pages/NotFoundPage.vue` |
