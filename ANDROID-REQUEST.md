# 需求：PickCat 安卓原生客户端（Kotlin + Jetpack Compose + Material 3）

> 本文档交给负责实现安卓端的 AI。读完应当能独立开工，不需要再问背景问题。

---

## 1. 一句话目标

用 **Kotlin + Jetpack Compose + Material 3** 从零实现 `pickcat.dao3.fun` 的安卓原生客户端。**不是 WebView 套壳**：界面全部用原生 Compose 编写，数据全部走站点自己的 REST 接口。

---

## 2. 硬性约束

1. **禁止套壳**：不要用 WebView 承载主界面，不要用 HTML/CSS/JS 写 UI，不要引入 Web UI 框架（Capacitor、Cordova、Ionic、React Native WebView 等一律不用）。
2. **界面必须是原生 Material 3**：使用 `androidx.compose.material3`，遵循 Material 3 设计规范（见第 9 节）。
3. **接口必须是站点原有的**：`https://pickcat.dao3.fun/api/v1`，不新建后端、不做代理。
4. **WebView 只允许两处**：官方登录页（第 6 节）与作品详情页的第三方游戏播放器（第 8 节）。这两处之外不得出现 WebView，主界面、列表、详情、编辑等全部是 Compose。
5. 登录相关页面必须与站点行为一致，不得伪造登录。

---

## 3. 参考实现（强烈建议先读）

同一套接口已经有两个成熟重写版本，**安卓端应视为第三个客户端**：

| 实现 | 位置 | 价值 |
|---|---|---|
| 浏览器扩展（Vue 3 + TS） | `extension/src/` | **完整接口契约与业务逻辑，可 1:1 移植** |
| Windows 桌面版（WinUI 3） | `desktop/` | 宿主层参考，与安卓无关 |
| 仓库 | `https://github.com/ttummc/pickcat-winui3` | 全量源码 |

重点阅读：

```
extension/src/api/client.ts      请求封装、超时、幂等键、错误类型
extension/src/api/types.ts       全部数据结构定义
extension/src/api/files.ts       文件上传与图库
extension/src/api/interactions.ts 点赞/收藏/关注
extension/src/pages/             16 个页面的业务逻辑
extension/src/lib/captcha.ts     验证码配置
extension/src/lib/format.ts      时间/数字/头像地址格式化
```

接口没有官方文档，**这张表就是文档**。遇到不确定的字段，先在 `types.ts` 里确认，不要臆造。

---

## 4. 推荐技术栈

| 层 | 选择 |
|---|---|
| 语言 | Kotlin（2.x），协程 + Flow |
| UI | Jetpack Compose + Material 3（`material3`、`material3-adaptive`、`material3-window-size-class`） |
| 架构 | MVVM + 单向数据流；多模块（`:core:network`、`:core:data`、`:core:ui`、`:feature:*`） |
| 网络 | OkHttp + Retrofit，或 Ktor Client；JSON 用 **kotlinx.serialization** |
| 图片 | Coil 3（Compose） |
| 本地缓存 | Room（帖子/作品列表、草稿）；DataStore（设置、主题） |
| 分页 | Paging 3（接口是 cursor 分页，需要自定义 PagingSource） |
| 依赖注入 | Hilt |
| 后台 | WorkManager（未读通知轮询） |
| 导航 | Navigation Compose，或自定义类型安全路由 |
| 最低版本 | minSdk 26，targetSdk 最新稳定版 |

依赖版本以开工时的最新稳定版为准，不要用 alpha。

---

## 5. 接口契约

### 5.1 基础

| 项 | 值 |
|---|---|
| Base URL | `https://pickcat.dao3.fun/api/v1` |
| 认证 | **Cookie 会话**（`Set-Cookie` 下发，后续请求 `Cookie` 头）。用 OkHttp `CookieJar` + `PersistentCookieStore` 持久化 |
| 写操作 | 必须带 `Idempotency-Key` 头，值为 UUID v4 |
| 请求体 | JSON（上传除外） |
| 严格校验 | 多余参数会返回 **400**；**404 表示端点不存在**，不是“资源为空” |
| 分页 | cursor 分页：响应 `{ items, nextCursor }`，`limit` 由客户端传 |
| 时间 | ISO 8601 字符串 |

### 5.2 端点表

**会话**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/session` | 当前会话，未登录返回 401 |
| POST | `/session` | 登录，body `{ account, password, captchaVerifyParam }` |
| DELETE | `/session` | 退出登录 |

**帖子（论坛）**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/topics` | 列表，参数 `sort=latest\|relevance`、`q`、`limit`、`cursor`；`relevance` 必须带 `q` |
| GET | `/topic-recommendations` | 推荐 |
| GET | `/topics/{id}` | 详情，含 `viewerState` |
| GET | `/topics/{id}/posts` | 楼层列表 |
| POST | `/posts` | 发帖/回帖 |
| PUT/DELETE | `/posts/{id}/like` | 点赞/取消 |
| POST | `/posts/{id}/reports` | 举报 |
| POST | `/bookmarks` | 收藏，body `{ bookmarkableType, bookmarkableId }` |
| DELETE | `/bookmarks/{id}` | 取消收藏 |

**用户**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/users/{id}` | 主页资料，`viewerState.following` 判断关注 |
| PUT/DELETE | `/users/{id}/follow` | 关注/取关 |
| GET | `/users/{id}/followers` \| `/following` | 返回 `{ user, followedAt }` 包装，不是裸用户 |
| GET | `/users/{id}/topics` \| `/works` \| `/posts` | 用户内容 |
| GET | `/users/{id}/featured-topics` \| `/featured-works` | 精选 |
| PUT | `/users/{id}/featured-topics` \| `/featured-works` | 设置精选，body `{ topicIds }` / `{ workIds }` |
| GET | `/users/{id}/profile-activities` | 动态 |
| GET | `/users/{id}/level-contributions/{year}` | 贡献日历 |
| POST | `/users/{id}/profile-reports` | 举报 |
| GET | `/avatar-presets` | 可选头像 |
| GET | `/level-progress` | 等级进度 |

**作品**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/works/{id}` | 详情，含 `type`（KITTEN4/KITTEN3/KITTENN/COCO/NEMO/NEKO/WOOD）与源作品 ID |
| PUT/DELETE | `/works/{id}/like` | 点赞 |
| PUT/DELETE | `/works/{id}/favorite` | 收藏 |
| GET/POST | `/works/{id}/comments` | 评论列表/发表 |
| DELETE | `/works/{id}/comments/{number}` | 删除评论 |
| GET | `/featured-works` | 精选作品 |

**通知**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/notifications` | 列表 |
| GET | `/notification-summary` | 未读数 |
| PATCH | `/notifications` | 标记已读，body `{ read: true }` |
| GET | `/like-notification-groups` | 点赞聚合 |

**搜索与标签**

| 方法 | 路径 |
|---|---|
| GET | `/search/users?q=` |
| GET | `/search/works?q=` |
| GET | `/topics?q=&sort=relevance` |
| GET | `/tags`（可选 `assignable=true`） |

**文件（图库）**

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/files` | multipart 上传：**必须**含 `ownership=PERSONAL` 与 `file` 两个 part；带 `Idempotency-Key`；单文件上限 **20 MB** |
| GET | `/files?scope=OWN&state=READY\|DELETED` | 图库列表（`limit` 不要传） |
| GET | `/files/{id}` | 直接返回原始字节 |
| GET | `/file-storage` | 容量 `{ usedBytes, limitBytes, remainingBytes }`；`limitBytes = 2^53-1` 表示不限量 |
| PUT | `/files/{id}/deletion` | 移入回收站 |
| PATCH | `/files/{id}` | `{ state: 'RESTORED' }` 还原；传 `{}` 彻底删除 |

> 注意：文件列表接口**不返回文件体积**。不要显示“0 B”，用尺寸或上传时间代替。

---

## 6. 登录：使用官方登录页（不做原生登录表单）

站点登录需要阿里云验证码（滑块/无痕），`POST /session` 必须带上 `captchaVerifyParam`。**登录一律使用官方登录页**，不要在原生端自己画登录框，也不要去接阿里云 SDK。

### 实现方式

用一个**只承载登录页的 WebView** 打开官方地址：

```
https://pickcat.dao3.fun/login
```

用户在官方页面里完成账号密码与滑块验证，登录成功后站点会下发会话 Cookie。整个登录过程完全走站点自己的逻辑，客户端不参与校验。

**这不是套壳**：WebView 只出现在登录这一步，登录成功后立即关闭，进入原生界面。主界面、列表、详情、发帖等全部是 Compose。

### 关键实现点

1. **Cookie 同步**：登录成功后，把 `CookieManager` 里的 Cookie 同步到 OkHttp 的 `CookieJar` 并持久化。
   - 推荐做法：`CookieManager.getCookie("https://pickcat.dao3.fun")` 取出字符串，解析成 `Cookie` 对象写入自建 `PersistentCookieStore`
   - 注意 WebView 与 OkHttp 的 Cookie 是两个独立存储，必须显式搬运
2. **登录成功判定**：不要依赖页面跳转或 URL 匹配。轮询 `GET /session`，返回 200 且含 `user` 即视为登录成功；也可以在 WebView 的 `shouldOverrideUrlLoading` 里发现回到站内其他路径时触发一次校验。
3. **关闭时机**：判定成功后关闭登录 WebView，把会话交给原生层，跳首页。
4. **已登录用户**：启动时先 `GET /session`，200 直接进主界面，不再弹登录。
5. **退出登录**：`DELETE /session` 后清空 CookieJar 与 WebView Cookie，回到登录页。
6. **WebView 配置**：开启 JS、DOM Storage、第三方 Cookie；允许页面正常加载站点资源，不要注入任何自定义 CSS/JS（会破坏验证码）。

### 不要做的事

- 不要自己实现滑块验证
- 不要接入阿里云验证码 SDK
- 不要拦截或重写登录页的 DOM
- 不要缓存账号密码

### 已知配置（仅供排查，客户端不需要使用）

```
prefix   : 1rbvwn
region   : cn
登录场景 : 1icer78a
```


---

## 7. 页面清单（与现有客户端对齐）

| # | 页面 | 关键功能 |
|---|---|---|
| 1 | 首页 | 推荐/最新信息流，下拉刷新，发帖入口 |
| 2 | 论坛 | 分类、标签、帖子列表 |
| 3 | 分类详情 | 按标签筛选 |
| 4 | 帖子详情 | 楼层、**层级回复**、点赞、收藏、举报、回复 |
| 5 | 发帖/回帖 | Markdown 编辑、预览、图片上传、草稿保存 |
| 6 | 作品列表 | 瀑布流/网格，分页 |
| 7 | 作品详情 | 播放器、点赞、收藏、**层级评论区** |
| 8 | 用户主页 | 资料、关注/取关、作品/帖子/动态/等级网格、精选编辑 |
| 9 | 通知 | 未读角标、点赞聚合、一键已读 |
| 10 | 点赞记录 | 分组列表 |
| 11 | 搜索 | 综合/帖子/用户/作品分栏，历史记录 |
| 12 | 设置 | 主题、账号、退出登录 |
| 13 | 个人图盘 | 上传、多选、批量删除/还原/彻底删除、容量条 |
| 14 | 媒体库 | 图库与回收站 |
| 15 | 个人作品库 | 我的作品 |
| 16 | 登录 | 官方登录页（WebView 承载，见第 6 节） |

---

## 8. 评论区层级（重点，不要做成平铺列表）

这是本站评论区的核心体验，务必实现。

### 8.1 数据事实

接口返回的是**扁平列表**，不带树结构：

- 帖子楼层：`GET /topics/{id}/posts` → 每项有 `postNumber`（楼层号）与 `replyToPostNumber`（回复的是哪一层，顶层为空）
- 作品评论：`GET /works/{id}/comments` → 每项有 `commentNumber` 与 `replyToCommentNumber`

`children` 字段在响应中**始终为空**（已实测），客户端必须**自己根据 replyTo 引用构建树**，不要指望服务端返回嵌套结构。

### 8.2 构树规则

1. `replyTo` 为空 → 根节点
2. `replyTo` 指向已加载节点 → 挂到该节点下
3. `replyTo` 指向不存在的楼层（被分页截断或已删除）→ **按根节点处理**，显示「回复 #N（该楼层不可见）」，不要丢弃
4. 防御环状引用（A 回复 B、B 回复 A 的异常数据），最多遍历 50 层
5. 根节点按时间正序；同一父节点下的子回复按时间正序

### 8.3 渲染规则

- **缩进层级**：每层 12–16dp，最多渲染 3 层
- 超过 3 层的回复**并入第 3 层**，并在作者名前加「回复 @某某」，避免无限缩进挤爆屏幕
- 每条回复显示**被回复内容摘要行**（引用块，最多两行，超出省略）
- 楼主楼层（`postNumber == 1`）加「楼主」徽标，始终排在最前
- 楼层号始终显示（形如 `#12`），便于引用

### 8.4 交互

- 点「回复」时发帖接口必须带 `replyToCommentNumber` / `replyToPostNumber`
- 回复框预填「回复 @用户名」，并提供取消引用的入口
- 子回复超过 3 条时折叠为「展开 N 条回复」，但折叠状态下仍显示前 2 条
- 点击引用行可滚动到被回复的那一条并短暂高亮

### 8.5 分页与同步

- 评论是 cursor 分页，**子回复可能落在后面的页**。新加载的页要按 replyTo 归位到已有节点下，不能直接追加到末尾
- 发表成功后本地插入，不要整页刷新
- 删除后保留占位「该评论已删除」，其子回复仍然显示

### 8.6 规格小结

| 要求 | 值 |
|---|---|
| 最大渲染层级 | 3 |
| 每层缩进 | 12–16dp |
| 子回复折叠阈值 | 3 条 |
| 引用摘要行数 | ≤2 行 |
| 时间线排序 | 正序 |

---

## 9. 作品播放器

作品详情页内嵌 Codemao 的第三方播放器，按作品 `type` 拼接地址：

```
KITTEN4 → https://player.codemao.cn/new/{id}
KITTEN3 → https://player.codemao.cn/old/{id}?origin=kitten_qrcode
KITTENN → https://kn.codemao.cn/player?type=2&workId={id}
COCO    → https://coco.codemao.cn/editor/player/{id}?channel=h5
NEMO    → https://nemo.codemao.cn/w/{id}
NEKO / WOOD / BOX → 没有外部播放器，回退到封面图
```

实现要求：

- 用 WebView 承载，开启 JS、DOM Storage，禁用需要用户手势的自动播放限制
- **必须**允许全屏（`WebChromeClient.onShowCustomView`）与横屏，游戏类作品依赖横屏
- 加载失败或类型未知时显示封面 + 提示，不要白屏

---

## 10. Material 3 设计要求

界面是本次改写的重点，不要做成“网页截图式”实现。

### 必须使用

- **Dynamic Color**：Android 12+ 用 `dynamicLightColorScheme` / `dynamicDarkColorScheme`，低版本回退到基线配色
- **Material 3 组件**：`TopAppBar`（含 `LargeTopAppBar`/`MediumTopAppBar` 折叠）、`NavigationBar` / `NavigationRail`（大屏）、`NavigationDrawer`、`FloatingActionButton`、`Card`、`ListItem`、`Chip`、`SegmentedButton`、`SearchBar`、`Badge`、`Snackbar`
- **Edge-to-edge**：全面屏沉浸，处理 `WindowInsets`（状态栏、导航栏、输入法 `ime`）
- **预测式返回**（Android 14+）：`PredictiveBackHandler`
- **大屏与折叠屏**：`WindowSizeClass` 断点，双栏（列表 + 详情）在 `Expanded` 时生效
- **动效**：M3 运动规范，转场用 `AnimatedContent` / `SharedTransitionLayout`，时长 200–300ms

### 禁止

- 自绘 iOS 风格控件、圆角卡片堆砌、仿网页布局
- 硬编码颜色（必须走 `MaterialTheme.colorScheme`）
- 固定的 `dp` 尺寸不随字号缩放（要支持系统字体缩放）
- 底部栏超过 5 项

### 排版

- 正文 `bodyLarge`，标题用 `headlineSmall` / `titleMedium`
- 列表项统一 `ListItem`，不要每页自己画
- 空状态、加载、错误三种状态都要有明确 UI，不要白屏

---

## 11. 数据层要点

1. **错误统一映射**：401 → 跳登录；403 → 无权限提示；400 → 展示服务端 `message`；404 → “内容不存在”
2. **写操作幂等**：所有 POST/PUT/PATCH/DELETE 自动生成 `Idempotency-Key`
3. **超时**：请求 15 秒超时，失败可重试（读操作自动重试 1 次）
4. **图片**：统一经 Coil，头像地址可能是相对路径（`/api/v1/avatars/...`），需要拼成完整 URL
5. **草稿**：发帖内容本地持久化，退出不丢
6. **未读轮询**：前台 60 秒一次，或按需在回到前台时刷新；不要用长连接
7. **登录态**：启动时先 `GET /session`，401 视为未登录，不做报错弹窗

---

## 12. 交付物

1. 可编译运行的 Android 工程（Gradle Kotlin DSL）
2. 16 个页面全部可用
3. 登录（含验证码方案）打通并说明所选方案
4. README：构建方式、模块结构、验证码方案说明、已知限制
5. 至少一个演示用的 debug APK

---

## 13. 验收标准

| 编号 | 场景 | 期望 |
|---|---|---|
| A1 | 未登录启动 | 进入登录页，不报错 |
| A2 | 登录 | 通过官方登录页完成（含滑块），成功后进入首页，重启应用仍保持登录 |
| A3 | 首页信息流 | 分页加载、下拉刷新、图片正常 |
| A4 | 帖子详情 | 楼层正确、点赞/收藏状态与服务端一致 |
| A4b | 评论区层级 | 回复按 replyTo 缩进成树，超过 3 层收拢并标注「回复 @某某」 |
| A5 | 发帖 | 支持图片上传，20 MB 上限有提示，草稿不丢 |
| A6 | 作品详情 | 播放器可加载、可全屏、可横屏 |
| A7 | 图库 | 上传、删除、还原、彻底删除、容量显示正确（不出现 0 B 体积） |
| A8 | 通知 | 未读角标准确，一键已读生效 |
| A9 | 大屏/折叠屏 | 双栏布局生效 |
| A10 | 深色模式与动态取色 | 跟随系统，切换即时生效 |
| A11 | 全局搜索 | 三类结果分组正确 |

---

## 14. 已知坑（务必避开）

1. **参数严格校验**：多传一个参数就 400。只传文档里列出的参数。
2. **404 = 端点不存在**，不是空数据；空列表是 200 + `items: []`。
3. `/users/{id}/followers` 返回 `{ user, followedAt }`，不是用户对象本身。
4. `/files` 上传必须两个 part（`ownership` + `file`），否则 400。
5. 文件列表没有体积字段，别显示 0 B。
6. `GET /file-storage` 的 `limitBytes = 2^53-1` 表示不限量。
7. `/topics` 的 `sort=relevance` 必须同时给 `q`，否则 400。
8. 头像 URL 可能是相对路径，需拼接域名。
9. 会话是 Cookie，不是 Bearer Token；OkHttp 必须配置 CookieJar 并持久化。
10. 验证码 `captchaVerifyParam` 一次性，失败要重新取。

---

## 15. 里程碑建议

| 阶段 | 内容 | 产出 |
|---|---|---|
| 0 | 官方登录页接入 + Cookie 同步验证 | 能登录、能拿 `/session` 返回 200 |
| 1 | 工程骨架、网络层、会话管理、M3 主题 | 能登录、能拉首页数据 |
| 2 | 首页 / 论坛 / 帖子详情 | 可浏览、可互动 |
| 3 | 发帖 / 作品 / 作品详情 / 播放器 | 内容闭环 |
| 4 | 用户主页 / 通知 / 搜索 | 功能补齐 |
| 5 | 图库 / 设置 / 大屏适配 / 动效打磨 | 收尾 |

---

## 16. 需要先确认的问题

1. 登录页必须使用官方页面，已在上文明确；若官方登录页在 WebView 中出现兼容问题（例如需要特定 UA），优先调整 WebView 配置，不要改成原生表单。
2. 是否需要平板/折叠屏双栏？默认做。
3. 是否需要作品离线缓存（封面、简介）？默认只缓存封面缩略图。
4. 最低支持 Android 版本？默认 8.0（API 26）。
5. 是否要发布到应用商店？影响签名与隐私政策，默认只出 debug APK。

---

## 17. 补充：接口探测方法

若对某个端点有疑问，直接用浏览器打开：

```
https://pickcat.dao3.fun/api/v1/topics?limit=5
```

多数 GET 接口未登录即可访问。需要登录的接口，在浏览器登录后从开发者工具复制 `Cookie` 头，再用 curl 复现：

```bash
curl -H "Cookie: <session cookie>" "https://pickcat.dao3.fun/api/v1/session"
```

不要猜测字段名——先请求一次，看真实响应。
