<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { InfoBadge } from 'winuionweb'
import { route, navigate, goBack, navigationKind } from './router'
import { uiState, dismiss, notify } from './stores/ui'
import { isSignedIn, sessionState } from './stores/session'
import { refreshNotifications, unreadCount } from './stores/notifications'
import { openContextMenu } from './stores/contextMenu'
import { resolveCard } from './stores/cardRegistry'

import HomePage from './pages/HomePage.vue'
import ForumPage from './pages/ForumPage.vue'
import CategoryPage from './pages/CategoryPage.vue'
import TopicPage from './pages/TopicPage.vue'
import ComposerPage from './pages/ComposerPage.vue'
import WorksPage from './pages/WorksPage.vue'
import WorkPage from './pages/WorkPage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import NotificationsPage from './pages/NotificationsPage.vue'
import LikesPage from './pages/LikesPage.vue'
import SearchPage from './pages/SearchPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import LibraryPage from './pages/LibraryPage.vue'
import MediaLibraryPage from './pages/MediaLibraryPage.vue'
import LoginPage from './pages/LoginPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'
import CardContextMenu from './components/CardContextMenu.vue'
import ToastHost from './components/ToastHost.vue'

const PAGES = {
  home: HomePage,
  forum: ForumPage,
  category: CategoryPage,
  topic: TopicPage,
  compose: ComposerPage,
  works: WorksPage,
  work: WorkPage,
  profile: ProfilePage,
  notifications: NotificationsPage,
  likes: LikesPage,
  search: SearchPage,
  settings: SettingsPage,
  library: LibraryPage,
  media: MediaLibraryPage,
  login: LoginPage,
  notFound: NotFoundPage,
} as const

const pageComponent = computed(() => PAGES[route.name] ?? HomePage)

// The query is part of the address, so it has to be part of the identity too:
// otherwise /search?q=A -> /search?q=B kept the old results on screen.
const pageKey = computed(
  () => `${route.name}:${route.params.id ?? ''}:${route.query.q ?? ''}`,
)
const transitionName = computed(() => `pc-page-${navigationKind.value}`)

const SECTION_FOR_ROUTE: Record<string, string> = {
  home: 'home',
  forum: 'forum',
  category: 'forum',
  topic: 'forum',
  compose: 'forum',
  works: 'works',
  work: 'works',
  profile: 'profile',
  notifications: 'notifications',
  likes: 'notifications',
  search: 'search',
  settings: 'prefs',
  library: 'library',
  media: 'media',
  login: 'home',
  notFound: 'home',
}

const activeSection = computed(() => SECTION_FOR_ROUTE[route.name] ?? 'home')

const subtitle = computed(() => {
  switch (route.name) {
    case 'forum':
      return '论坛'
    case 'category':
      return '论坛 · 分类'
    case 'topic':
      return '论坛 · 帖子'
    case 'compose':
      return '论坛 · 发布主题'
    case 'works':
      return '作品'
    case 'work':
      return '作品 · 详情'
    case 'profile':
      return '个人主页'
    case 'notifications':
      return '通知'
    case 'likes':
      return '通知 · 点赞'
    case 'search':
      return '搜索'
    case 'settings':
      return '设置'
    case 'library':
      return '个人作品库'
    case 'login':
      return '登录'
    default:
      return isSignedIn.value ? `欢迎回来，${sessionState.user?.username ?? ''}` : '社区首页'
  }
})

const showBack = computed(() => route.name !== 'home')

/**
 * NavigationView raises SelectionChanged once while it applies the initial
 * selection during mount. Acting on that event would immediately override the
 * route the user actually opened, so we ignore everything until the first real
 * pointer/keyboard gesture.
 */
let userHasInteracted = false

function markInteraction(): void {
  userHasInteracted = true
}

function onDocumentContextMenu(event: MouseEvent): void {
  // This is a desktop-app surface: the native menu is never used.
  event.preventDefault()

  const element = event.target as Element | null
  const cardNode = element?.closest?.('.pc-topic-card, .pc-work-card') as HTMLElement | null
  const editable = (element?.closest?.('input, textarea, [contenteditable="true"]') ?? null) as HTMLElement | null
  const anchor = element?.closest?.('a[href]') as HTMLAnchorElement | null
  const selection = window.getSelection()
  const selectedText = selection && !selection.isCollapsed ? selection.toString() : ''

  openContextMenu({
    card: resolveCard(cardNode?.getAttribute('data-card-key')),
    anchor: cardNode ?? null,
    position: { X: event.clientX, Y: event.clientY },
    editable,
    hasSelection: selectedText.trim().length > 0,
    selectedText,
    link: anchor ? { href: anchor.href, text: (anchor.textContent ?? '').trim() } : null,
  })
}

onMounted(() => {
  document.addEventListener('contextmenu', onDocumentContextMenu)
  window.addEventListener('pointerdown', markInteraction, true)
  window.addEventListener('keydown', markInteraction, true)
  void refreshNotifications()
})

watch(
  () => sessionState.user?.id,
  () => void refreshNotifications(),
)

watch(
  () => route.name,
  (name) => {
    if (name === 'notifications') void refreshNotifications()
  },
)

/**
 * NavigationView reflects the route through :IsSelected, and changing that
 * selection re-raises SelectionChanged. Navigating from the handler would then
 * bounce the user (the old topic -> /forum bug), so selection events caused by a
 * route change are ignored for a moment.
 */
let ignoreSelectionEvents = false
watch(pageKey, () => {
  ignoreSelectionEvents = true
  window.setTimeout(() => {
    ignoreSelectionEvents = false
  }, 300)
})

/** True when the destination is the page already on screen. */
function isAlreadyHere(tag: string): boolean {
  if (tag === 'profile') {
    return route.name === 'profile' && route.params.id === sessionState.user?.id
  }
  const section = SECTION_FOR_ROUTE[tag === 'media' ? 'media' : tag]
  if (!section) return false
  return route.name in SECTION_FOR_ROUTE && SECTION_FOR_ROUTE[route.name] === section && route.params.id === undefined
}

function onNavInvoked(
  _sender: unknown,
  args: unknown,
  source: 'invoke' | 'selection' = 'invoke',
): void {
  if (!userHasInteracted) return
  if (source === 'selection' && ignoreSelectionEvents) return

  const payload = (args ?? {}) as Record<string, unknown>
  const item = (payload.InvokedItem ??
    payload.InvokedItemContainer ??
    payload.SelectedItem ??
    payload) as Record<string, unknown> | string | undefined

  const tag =
    typeof item === 'string'
      ? item
      : ((item?.Tag ?? item?.tag ?? payload.Tag) as string | undefined)
  if (!tag) return

  // Clicking the section you are already on is a no-op; clicking it from a child
  // page (someone else's profile, a single work, a topic) must still navigate.
  if (isAlreadyHere(tag)) return

  if (tag === 'home') navigate('/')
  else if (tag === 'forum') navigate('/forum')
  else if (tag === 'works') navigate('/works')
  else if (tag === 'search') navigate('/search')
  else if (tag === 'notifications') navigate('/notifications')
  else if (tag === 'profile') {
    if (sessionState.user) navigate(`/profile/${sessionState.user.id}`)
    else navigate('/login')
  } else if (tag === 'library') navigate('/library')
  else if (tag === 'media') navigate('/personal-library')
  else if (tag === 'prefs') navigate('/settings')
}

function onClose(): void {
  uiState.windowClosed = true
}

function reopen(): void {
  uiState.windowClosed = false
  notify('PickCat 已重新启动', '窗口已恢复', 'Success')
}
</script>

<template>
  <div v-if="!uiState.windowClosed" class="pc-shell">
    <div class="pc-titlebar-host">
      <TitleBar
        Title="PickCat"
        :Subtitle="subtitle"
        :IsBackButtonVisible="showBack"
        :IsBackButtonEnabled="showBack"
        IsPaneToggleButtonVisible="True"
        :IsPaneOpen="uiState.paneOpen"
        IsCaptionButtonsVisible="True"
        PreferredHeightOption="Tall"
        AutoRefreshDragRegions="True"
        @BackRequested="goBack()"
        @PaneToggleRequested="uiState.paneOpen = !uiState.paneOpen"
        @CloseRequested="onClose"
        @MinimizeRequested="notify('最小化', '网页版无法最小化浏览器窗口', 'Informational')"
        @MaximizeRequested="notify('最大化', '请使用浏览器窗口控件', 'Informational')"
      >
        <TitleBar.IconSource>
          <ImageIconSource ImageSource="/favicon.png" />
        </TitleBar.IconSource>
      </TitleBar>
    </div>

    <NavigationView
      v-if="route.name !== 'login'"
      v-model:IsPaneOpen="uiState.paneOpen"
      PaneDisplayMode="Left"
      :IsBackButtonVisible="'Collapsed'"
      :IsBackEnabled="showBack"
      IsSettingsVisible="False"
      IsPaneToggleButtonVisible="False"
      :OpenPaneLength="260"
      :CompactPaneLength="48"
      @SelectionChanged="(s: unknown, e: unknown) => onNavInvoked(s, e, 'selection')"
      @BackRequested="goBack()"
      @ItemInvoked="(s: unknown, e: unknown) => onNavInvoked(s, e, 'invoke')"
    >
      <NavigationView.MenuItems>
        <NavigationViewItem Content="首页" Tag="home" :IsSelected="activeSection === 'home'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE80F;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="论坛" Tag="forum" :IsSelected="activeSection === 'forum'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE90A;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="作品" Tag="works" :IsSelected="activeSection === 'works'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE7C3;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="搜索" Tag="search" :IsSelected="activeSection === 'search'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE721;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem
          Content="通知"
          Tag="notifications"
          :IsSelected="activeSection === 'notifications'"
        >
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xEA8F;" />
          </NavigationViewItem.Icon>
          <NavigationViewItem.InfoBadge>
            <InfoBadge v-if="unreadCount > 0" :Value="unreadCount" Style="Attention" />
          </NavigationViewItem.InfoBadge>
        </NavigationViewItem>
        <NavigationViewItem Content="我的主页" Tag="profile" :IsSelected="activeSection === 'profile'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE77B;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
      </NavigationView.MenuItems>

      <NavigationView.FooterMenuItems>
        <NavigationViewItem Content="个人图盘" Tag="media" :IsSelected="activeSection === 'media'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE8B7;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="个人作品库" Tag="library" :IsSelected="activeSection === 'library'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE8F1;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="设置" Tag="prefs" :IsSelected="activeSection === 'prefs'">
          <NavigationViewItem.Icon>
            <FontIcon Glyph="&#xE713;" />
          </NavigationViewItem.Icon>
        </NavigationViewItem>
      </NavigationView.FooterMenuItems>

      <div class="pc-content">
        <Transition :name="transitionName" mode="out-in">
          <component :is="pageComponent" :key="pageKey" />
        </Transition>
      </div>
    </NavigationView>

    <div v-else class="pc-content">
      <Transition :name="transitionName" mode="out-in">
        <component :is="pageComponent" :key="pageKey" />
      </Transition>
    </div>

    <ToastHost />

    <CardContextMenu />
    <ToolTipService />
  </div>

  <div v-else class="pc-closed">
    <div class="pc-closed-card">
      <div class="pc-closed-glyph">&#xE7E8;</div>
      <h1>PickCat 已关闭</h1>
      <p>这个窗口结束运行了 —— 就像真正的 WinUI 应用那样。</p>
      <Button Style="AccentButtonStyle" @Click="reopen">重新打开</Button>
    </div>
  </div>
</template>

<style>
.pc-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pc-closed {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  color: var(--text-primary);
}

.pc-closed-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  max-width: 360px;
}

.pc-closed-card h1 {
  font-size: 22px;
  margin: 0;
}

.pc-closed-card p {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pc-closed-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
  font-size: 40px;
  color: var(--text-tertiary);
}
</style>
