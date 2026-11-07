# 01 — Shell & navigation controls (WinUIonWeb)

Precise API reference for the six controls that make up the WinUIonWeb "window shell":
`NavigationView`, `TitleBar`, `Page`, `Frame`, `SplitView`, `SettingsCard`.

Everything below is transcribed from source, not from WinUI docs. Where the implementation
deviates from WinUI 3, the deviation is called out under **Gotchas**.

## Sources inspected

| File | Purpose |
| --- | --- |
| `src/components/NavigationView.vue` (4334 lines) | NavigationView implementation |
| `src/components/NavigationViewProperties.ts` (114 lines) | `NavigationViewItem`, `NavigationViewItemHeader`, `NavigationViewItemSeparator`, all `NavigationView.*` property elements |
| `src/components/TitleBar.vue` (1366 lines) | TitleBar implementation |
| `src/components/TitleBarProperties.ts` (13 lines) | `TitleBar.IconSource/LeftHeader/Content/RightHeader/Resources` |
| `src/components/TitleBarDragRegion.ts` (55 lines) | `TitleBar.IsDragRegion` attached property + interactable-element scan |
| `src/components/titleBarHostAdapter.ts` (217 lines) | Window-host adapter contract + host resolution |
| `src/components/Page.vue` (180 lines) | Page |
| `src/components/Frame.vue` (416 lines) | Frame |
| `src/components/frameNavigationRuntime.ts` (137 lines) | Frame navigation commit/input lock |
| `src/components/NavigationTransitionProperties.ts` (71 lines) | `Frame.ContentTransitions` + transition-info descriptors |
| `src/components/SplitView.vue` (536 lines) | SplitView |
| `src/components/SettingsCard.vue` (298 lines) | SettingsCard |
| `src/components/register.ts` (495 lines) | Global tag names |
| `src/gallery/pages/NavigationViewPage.vue` (688 lines) | NavigationView demos |
| `src/gallery/pages/TitleBarPage.vue` (145 lines) | TitleBar demo |
| `src/gallery/pages/SplitViewPage.vue` (248 lines) | SplitView demo |
| `src/gallery/pages/PageTransitionPage.vue` (228 lines) | Frame + `Frame.ContentTransitions` demo |
| `src/gallery/pages/SettingsPage.vue` (417 lines) | the only `SettingsCard` usage |
| `src/gallery/App.vue` (1464 lines) | the real app shell: `TitleBar` + `NavigationView` + `router-view` |
| `src/gallery/router.ts` | proves the Gallery routes with vue-router, not `Frame` |

---

## 0. Global tag names (from `register.ts`)

`registerWinUIComponents(app)` is what a host app calls. Relevant registrations:

| Tag | Line | Notes |
| --- | --- | --- |
| `NavigationView` | 284 | |
| `NavigationViewItem` | 285-290 loop | name matches `^(NavigationView\|MenuItemTemplateSelector)` |
| `NavigationViewItemHeader` | 285-290 loop | |
| `NavigationViewItemSeparator` | 285-290 loop | |
| `NavigationView.MenuItems` | 285-290 loop | property element |
| `NavigationView.FooterMenuItems` | 285-290 loop | |
| `NavigationView.MenuItemsSource` | 285-290 loop | |
| `NavigationView.FooterMenuItemsSource` | 285-290 loop | |
| `NavigationView.Header` / `.HeaderTemplate` / `.Content` | 285-290 loop | |
| `NavigationView.PaneHeader` / `.PaneFooter` / `.PaneCustomContent` | 285-290 loop | |
| `NavigationView.AutoSuggestBox` / `.ContentOverlay` | 285-290 loop | |
| `NavigationView.MenuItemTemplate` / `.MenuItemTemplateSelector` | 285-290 loop | |
| `NavigationView.MenuItemContainerStyle` / `.MenuItemContainerStyleSelector` / `.PaneToggleButtonStyle` | 285-290 loop | |
| `NavigationViewItem.Icon` / `.Content` / `.InfoBadge` / `.MenuItems` / `.MenuItemsSource` | 285-290 loop | |
| `MenuItemTemplateSelector` + `MenuItemTemplateSelector.ItemTemplate` | 285-290 loop | |
| `TitleBar` | 455 | |
| `TitleBar.Resources` / `.IconSource` / `.LeftHeader` / `.Content` / `.RightHeader` | 456 | |
| `Page` | 371 | |
| `Page.Resources` | 372 | |
| `Frame` | 273 | |
| `Frame.ContentTransitions` | 274 | |
| `TransitionCollection`, `NavigationThemeTransition`, `EntranceNavigationTransitionInfo`, `DrillInNavigationTransitionInfo`, `SuppressNavigationTransitionInfo`, `SlideNavigationTransitionInfo`, `CommonNavigationTransitionInfo`, `ContinuumNavigationTransitionInfo` | 275-283 | structural objects for `Frame.ContentTransitions` |
| `SplitView` | 328 | |
| `SplitView.Pane` | 329 | |
| `SplitView.Content` | 330 | |
| `SettingsCard` | 481-494 (glob loop) | registered by filename; not in an explicit list |

Dotted tags (`NavigationView.MenuItems`, `TitleBar.IconSource`, `SplitView.Pane`,
`Frame.ContentTransitions`) **only** resolve through these global registrations — importing the
component locally is enough for `<NavigationView>` but not for `<NavigationView.MenuItems>`.

Naming convention: every control prop is PascalCase and is consumed with `resolveXamlValue`, so
both real Vue bindings (`:Title="t"`) and XAML-ish strings (`Title="{x:Bind t}"`,
`"True"`/`"False"`, `{ThemeResource …}`) work. All snippets below use real Vue bindings.

---

## 1. NavigationView

### Import

```ts
import NavigationView from '../../components/NavigationView.vue'
import {
  NavigationViewItem, NavigationViewItemHeader, NavigationViewItemSeparator, MenuItemTemplateSelector,
} from '../../components/NavigationViewProperties'
```

Global tags: `NavigationView`, `NavigationViewItem`, `NavigationViewItemHeader`,
`NavigationViewItemSeparator`, `MenuItemTemplateSelector`, plus every `NavigationView.*` /
`NavigationViewItem.*` property tag.

### Purpose

WinUI `NavigationView`: a title-bar-adjacent navigation host with an adaptive left pane
(`Left` / `LeftCompact` / `LeftMinimal`), a `Top` mode with overflow menu, hierarchical items,
footer items, an automatic Settings item, an optional back button, optional `AutoSuggestBox`, and a
content area for the selected page. It owns the item containers; it does **not** navigate — it
raises `SelectionChanged` / `ItemInvoked` and you drive a `Frame` or router.

### Menu-entry API — the exact answer

There is **no `items` prop** and no `items` slot. There are exactly three supported ways to supply
menu entries:

1. **`<NavigationView.MenuItems>` property element with `<NavigationViewItem>` children** — the
   form used by every Gallery demo (`NavigationViewPage.vue:53-58`).
2. **`MenuItems` array prop** — array of item descriptor objects (see shape below), or of plain
   `Tag` strings. `NavigationView.vue:122`.
3. **`MenuItemsSource` prop** — array of *your own* data objects, rendered through
   `MenuItemTemplate` / `MenuItemTemplateSelector` (this is what `App.vue:69` uses).

Footer entries use the same three forms: `<NavigationView.FooterMenuItems>`, `FooterMenuItems`
prop, `FooterMenuItemsSource` prop.

**`<NavigationViewItem>` written directly as a child of `<NavigationView>` (not inside a
`MenuItems` property element) is silently dropped** — `ContentOutlet` filters
`navigationItemType(node)` out of the content and `menuItems` only reads property nodes
(`NavigationView.vue:257-266, 285-290, 417-426`).

Item descriptor object shape — this is what the XAML `<NavigationViewItem>` attributes become, and
what the `MenuItems` / `FooterMenuItems` arrays (and the `MenuItems` / `MenuItemsSource` fields of a
data object) accept (`NavigationView.vue:222-253, 306-381`):

| Field | Type | Meaning |
| --- | --- | --- |
| `Content` | any | label (or arbitrary content nodes via `<NavigationViewItem.Content>`) |
| `Icon` | `string` \| `VNode` \| `{ Glyph }` \| `'Play'` style symbol name | `resolveSymbolGlyph` maps WinUI `Symbol` names (`'Home'`, `'Library'`, `'Contact'`, `'Clock'`, `'Favorite'`, …); a VNode (e.g. `h(ImageIcon, …)`) is rendered as the icon |
| `Tag` | string | identity you read back from `args.SelectedItem.Tag` |
| `MenuItems` / `MenuItemsSource` | array | children (hierarchical item) |
| `SelectsOnInvoked` | boolean | `False` → invokes without changing selection |
| `IsEnabled` | boolean | |
| `InfoBadge` | object | `{ Value, Opacity, … }` |
| `ToolTipService.ToolTip` / `AutomationProperties.Name` | string | |
| `Type` | `'NavigationViewItemHeader'` \| `'NavigationViewItemSeparator'` | only needed for array descriptors; the child tags imply it |

### Props (all 45, exact casing, `NavigationView.vue:119-167`)

`prop: Type = default — meaning`

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `PaneDisplayMode` | `String` | `'Auto'` | `'Auto' \| 'Left' \| 'LeftCompact' \| 'LeftMinimal' \| 'Top'`. `Auto` resolves from the control's own measured width: `>= ExpandedModeThresholdWidth` → `Left`, `>= CompactModeThresholdWidth` → `LeftCompact`, else `LeftMinimal` |
| `SelectedItem` | `[Object, String, Number]` | `null` | selected item: the item's source object/container **or** its `Tag` string (or `'settings'`) |
| `MenuItems` | `[Array, String]` | `() => []` | array of item descriptors / tags |
| `MenuItemsSource` | `[Array, Object, String]` | `null` | data objects + `MenuItemTemplate` |
| `FooterMenuItems` | `[Array, String]` | `() => []` | footer descriptors |
| `FooterMenuItemsSource` | `[Array, Object, String]` | `null` | footer data objects |
| `IsBackButtonVisible` | `String` | `'Auto'` | `'Auto' \| 'Visible' \| 'Collapsed'`. **`Auto` resolves to visible** (`NavigationView.vue:595-601`) |
| `IsBackEnabled` | `[Boolean, String]` | `false` | enables the back button; with `false` the button renders disabled and clicks do nothing |
| `IsSettingsVisible` | `[Boolean, String]` | `true` | show the automatic Settings entry at the bottom of the pane / footer menu |
| `IsPaneToggleButtonVisible` | `[Boolean, String]` | `true` | show the hamburger |
| `IsPaneOpen` | `[Boolean, String]` | `true` | pane expanded (not merely visible). `false` starts compact/closed |
| `IsPaneVisible` | `[Boolean, String]` | `true` | `false` hides the entire pane/top bar and force-closes it |
| `OpenPaneLength` | `[Number, String]` | `320` | expanded pane width (px). Clamped to the control width at layout time |
| `CompactPaneLength` | `[Number, String]` | `48` | icon-rail width |
| `CompactModeThresholdWidth` | `[Number, String]` | `641` | `Auto` breakpoint: below → `LeftMinimal` |
| `ExpandedModeThresholdWidth` | `[Number, String]` | `1008` | `Auto` breakpoint: at/above → `Left` |
| `PaneTitle` | `String` | `''` | text next to the hamburger / top-pane title |
| `Header` | `[String, Number, Object]` | `''` | page header content (`<NavigationView.Header>` overrides) |
| `HeaderTemplate` | `[Object, Function, String]` | `null` | template for `Header` |
| `PaneToggleButtonStyle` | `[Object, String]` | `null` | accepted; no visual effect documented in source |
| `MenuItemTemplate` | `[Object, Function, String]` | `null` | item template for `MenuItemsSource` |
| `MenuItemTemplateSelector` | `[Object, Function, String]` | `null` | selects a template per data item |
| `MenuItemContainerStyle` | `[Object, String]` | `null` | accepted; no visual effect documented in source |
| `MenuItemContainerStyleSelector` | `[Object, Function, String]` | `null` | accepted; no visual effect documented in source |
| `AutoSuggestBox` | `[Object, String]` | `null` | search box hosted in the pane / top bar |
| `PaneFooter` | `[Object, String]` | `null` | arbitrary content above the footer items |
| `PaneHeader` | `[Object, String]` | `null` | content at the top of the pane |
| `PaneCustomContent` | `[Object, String]` | `null` | content under the menu |
| `ContentOverlay` | `[Object, String]` | `null` | overlay on top of the content area |
| `AlwaysShowHeader` | `[Boolean, String]` | `true` | when `false`, header only shows in `Minimal` display mode |
| `SelectionFollowsFocus` | `String` | `'Disabled'` | `'Enabled'` selects items on keyboard focus |
| `ShoulderNavigationEnabled` | `String` | `'Never'` | accepted; no behaviour found in source |
| `OverflowLabelMode` | `String` | `'MoreLabel'` | top-mode overflow button shows `More` label (`'NoLabel'` hides it) |
| `IsTitleBarAutoPaddingEnabled` | `[Boolean, String]` | `true` | accepted; no visual effect documented in source |
| `IsEnabled` | `[Boolean, String]` | `true` | |
| `IsTabStop` | `[Boolean, String]` | `false` | |
| `Background` | `[String, Object]` | `'Transparent'` | acrylic-brush aware |
| `Content` | unknown (`type: null`) | `undefined` | content area when you don't pass default-slot children |
| `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight` | `[String, Number]` | `''` | CSS lengths; bare numbers become `px` |
| `Margin` | `[String, Number]` | `''` | XAML thickness string (`'0,12,0,0'`) |
| `HorizontalAlignment`, `VerticalAlignment` | `String` | `''` | `Left/Center/Right/Stretch`, `Top/Center/Bottom/Stretch` |

### v-model targets

| v-model | Event | Payload |
| --- | --- | --- |
| `v-model:SelectedItem` | `update:SelectedItem` (`NavigationView.vue:1205, 1325`) | the selected item's **source object** (not the `Tag`) |
| `v-model:IsPaneOpen` | `update:IsPaneOpen` (`NavigationView.vue:1972`) | `boolean` — `true` = expanded |

### Slots

| Slot | Slot props | Contents |
| --- | --- | --- |
| `default` | none | the content area. Every child that is **not** a `NavigationView.*` property element and **not** a `NavigationViewItem`/`…Header`/`…Separator` is rendered here (`NavigationView.vue:285-290`). This is where the Gallery puts `<router-view>` (`App.vue:76-105`) and `NavigationViewPage` puts `<Frame>`. |

There are **no** named slots (`header`/`paneFooter`/… are property elements, not slots).

Property elements (children, not slots): `NavigationView.MenuItems`, `.FooterMenuItems`,
`.MenuItemsSource`, `.FooterMenuItemsSource`, `.Header`, `.HeaderTemplate`, `.Content`,
`.PaneHeader`, `.PaneFooter`, `.PaneCustomContent`, `.AutoSuggestBox`, `.ContentOverlay`,
`.MenuItemTemplate`, `.MenuItemTemplateSelector`, `.MenuItemContainerStyle`,
`.MenuItemContainerStyleSelector`, `.PaneToggleButtonStyle`.

Item property elements: `NavigationViewItem.Icon`, `.Content`, `.InfoBadge`, `.MenuItems`,
`.MenuItemsSource`.

### Events

Non-`update:` events are emitted as **`(sender, args)`** — the wrapper at
`NavigationView.vue:486-490` prepends the sender proxy. Write handlers as `(sender, args) => …`.

| Event | Payload (`args`) | Fired when |
| --- | --- | --- |
| `SelectionChanged` | `{ SelectedItem, IsSettingsSelected, SelectedItemContainer, RecommendedNavigationTransitionInfo }` (`:1206-1211`, `:1334`) | selection committed |
| `ItemInvoked` | `{ InvokedItem, IsSettingsInvoked, InvokedItemContainer, RecommendedNavigationTransitionInfo }` (`:1191-1198`) | click on an item, **before** selection |
| `DisplayModeChanged` | `{ DisplayMode }` — `'Expanded' \| 'Compact' \| 'Minimal'` (`:579-583`, `:2774`) | resolved display mode changes |
| `BackRequested` | `{}` (`:1873`) | back button clicked (only when `IsBackEnabled` is true) |
| `PaneOpening` / `PaneOpened` | `{}` (`:1904`, `:1940`) | hamburger opens the pane |
| `PaneClosing` | `{ Cancel }` — set `args.Cancel = true` to veto (`:1900-1902`) | hamburger closes |
| `PaneClosed` | `{}` (`:1940`) | close finished |
| `Expanding` | `{ ExpandingItemContainer, ExpandingItem }` (`:1253`) | group expanded |
| `Collapsed` | `{ CollapsedItemContainer, CollapsedItem }` (`:1273`) | group collapsed |

`sender` is the control API proxy: `sender.SelectedItem`, `sender.Header`, `sender.PaneDisplayMode`,
`sender.DisplayMode`, `sender.IsSettingsVisible`, … (all writable; see Exposed API).

### Exposed API (`defineExpose`, `NavigationView.vue:1289-1354`)

`SelectedItem`, `IsPaneOpen`, `Header`, `PaneDisplayMode`, `MenuItems`, `FooterMenuItems`,
`DisplayMode` (read-only `Expanded|Compact|Minimal`), `SettingsItem`, `TemplateSettings`,
`MenuItemFromContainer(container)`, `ContainerFromMenuItem(item)`, `Expand(item)`,
`Collapse(item)`, plus every declared prop as a writable computed. Writable through a `ref`
(`namescope.nvSample.IsSettingsVisible = false`) — this is how the Gallery demo mutates it
(`NavigationViewPage.vue:543-572`).

### Settings entry

* On by default (`IsSettingsVisible` default `true`).
* Rendered automatically at the end of the **footer** list (left pane and top footer)
  (`NavigationView.vue:2608`), never in `MenuItems`.
* Its label is the i18n string `text.settings`, icon `\uE713`, `Tag` = `'settings'`
  (`NavigationView.vue:466-468, 1009-1021`).
* Selecting it emits `ItemInvoked { IsSettingsInvoked: true }` then
  `SelectionChanged { IsSettingsSelected: true, SelectedItem: <settings item> }`
  (`NavigationView.vue:1181-1213, 1881-1884`).
* Guard by `args.IsSettingsSelected` and navigate to your settings page; do not rely on `Tag`.

### Compact / adaptive mode

* `PaneDisplayMode="LeftCompact"` → 48px icon rail stays in layout; opening overlays it.
* `PaneDisplayMode="LeftMinimal"` → no rail, pane is an overlay and starts **closed**
  (`isCompact` initialises to `true` when the mode is `LeftMinimal`, `NavigationView.vue:491`).
* `PaneDisplayMode="Auto"` → resolved from the control's measured width against
  `CompactModeThresholdWidth` / `ExpandedModeThresholdWidth`.
* `IsPaneOpen=false` starts compact regardless of mode.
* The hamburger toggles compact and emits `update:IsPaneOpen` plus the pane events.
* `IsPaneToggleButtonVisible="False"` with `IsPaneOpen=false` gives a rail-only nav (the Gallery
  app shell does exactly this and toggles the pane from the `TitleBar` instead, `App.vue:16-21`).
* `IsPaneVisible=false` hides the pane entirely (CSS class `is-pane-hidden`).

### Gotchas

1. **No `items` prop, no item slot.** Use `MenuItems`/`MenuItemsSource` or
   `<NavigationView.MenuItems>` children. Loose `<NavigationViewItem>` children are dropped.
2. **Height.** `.win-nav-shell` is `height: 100%` (`NavigationView.vue:2935`), so in an
   auto-height parent it collapses to 0. Give the control `Height="460"` (all Gallery demos do) or
   a fixed-height parent.
3. **`SelectedItem` is an object, not an index.** `v-model:SelectedItem` writes the source object
   back. To keep a `string` route key, use `:SelectedItem` one-way plus `@ItemInvoked` /
   `@SelectionChanged` and read `args.SelectedItem.Tag` (the Gallery app does this in `App.vue:537`
   and `:807`).
4. **`IsBackButtonVisible="Auto"` = visible.** Unlike WinUI it does not depend on a navigation
   stack; pass `"Collapsed"` if you don't want it.
5. `IsBackEnabled` is independent of `IsBackButtonVisible`; a disabled back button still renders.
6. **Top mode** moves footer items and Settings into the top footer strip and puts overflowing
   primary items behind a `…` button; the same markup works in both modes.
7. **Hierarchical items**: children live in `NavigationViewItem.MenuItems`; in `LeftCompact` /
   `Top` modes clicking a parent opens a flyout of children instead of expanding in place.
8. `PaneDisplayMode` change is animated by clip-path; the pane's expanded state lives in the
   internal `isCompact` ref, and `IsPaneOpen` is its inverse — do not also keep your own copy of
   compact state without listening to `update:IsPaneOpen`.
9. Item `Icon` accepts a WinUI `Symbol` name string (`'Home'`, `'Save'`, `'Play'`) — that is
   resolved via `resolveSymbolGlyph`, not a font glyph. Use a `FontIcon`/`ImageIcon` VNode for
   anything else.
10. `MenuItemContainerStyle`, `MenuItemContainerStyleSelector`, `PaneToggleButtonStyle`,
    `ShoulderNavigationEnabled`, `IsTitleBarAutoPaddingEnabled` are declared but have **no
    implemented visual effect** in this source — treat as accepted-but-inert.

### Minimal working SFC

```vue
<!-- NavShellExample.vue -->
<template>
  <NavigationView
    v-model:IsPaneOpen="paneOpen"
    :SelectedItem="selected"
    PaneDisplayMode="Left"
    :OpenPaneLength="280"
    PaneTitle="Cat"
    Header="Home"
    Height="480"
    @SelectionChanged="onSelectionChanged"
    @ItemInvoked="onItemInvoked"
    @BackRequested="goBack">
    <NavigationView.MenuItems>
      <NavigationViewItem Content="Home" Icon="Home" Tag="home" />
      <NavigationViewItem Content="Library" Icon="Library" Tag="library" />
      <NavigationViewItemHeader Content="Actions" />
      <NavigationViewItemSeparator />
      <NavigationViewItem Content="Favourites" Icon="Favorite" Tag="favorites">
        <NavigationViewItem.MenuItems>
          <NavigationViewItem Content="Recent" Icon="Clock" Tag="recent" />
        </NavigationViewItem.MenuItems>
      </NavigationViewItem>
    </NavigationView.MenuItems>
    <NavigationView.FooterMenuItems>
      <NavigationViewItem Content="Account" Icon="Contact" Tag="account" />
    </NavigationView.FooterMenuItems>

    <StackPanel Padding="24">
      <TextBlock :Text="'Page: ' + currentTag" />
    </StackPanel>
  </NavigationView>
</template>

<script setup>
import { ref } from 'vue'
import NavigationView from '../../components/NavigationView.vue'
import { NavigationViewItem, NavigationViewItemHeader, NavigationViewItemSeparator } from '../../components/NavigationViewProperties'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const paneOpen = ref(true)
const selected = ref(null)
const currentTag = ref('home')

function onSelectionChanged(sender, args) {
  if (args.IsSettingsSelected) { currentTag.value = 'settings'; selected.value = sender.SettingsItem; return }
  selected.value = args.SelectedItem
  currentTag.value = args.SelectedItem?.Tag ?? ''
}
function onItemInvoked(sender, args) {
  // fires before selection; args.InvokedItemContainer.Tag
}
function goBack() { currentTag.value = 'home' }
</script>
```

---

## 2. TitleBar

### Import

```ts
import TitleBar from '../../components/TitleBar.vue'
import { TitleBarIconSource, TitleBarLeftHeader, TitleBarContent, TitleBarRightHeader, TitleBarResources } from '../../components/TitleBarProperties'
import { setTitleBarHostAdapter, registerTitleBarWindowHost, titleBarHostAdapterKey } from '../../components/titleBarHostAdapter'
```

Global tags: `TitleBar`, `TitleBar.Resources`, `TitleBar.IconSource`, `TitleBar.LeftHeader`,
`TitleBar.Content`, `TitleBar.RightHeader` (`register.ts:455-456`).

### Purpose

The XAML `TitleBar` control: a 32/46px bar with back button, pane-toggle button, leading icon,
title, subtitle, an arbitrary content presenter, left/right header hosts and (optionally)
Web-drawn minimize / maximize / close buttons, plus the attached property
`TitleBar.IsDragRegion`. It is purely visual; real window actions must come from a host adapter.

### Props (all, `TitleBar.vue:171-200`)

`prop: Type = default — meaning`

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Title` | `String` | `''` | window title text; also pushed to `document.title` **only when a window host is connected** |
| `Subtitle` | `String` | `''` | secondary text after the title |
| `IconSource` | `[String, Object]` | `null` | icon shown left of the title (`<TitleBar.IconSource>` overrides). Rendered through `IconSourceElement` |
| `IsBackButtonVisible` | `[Boolean, String]` | `false` | **Boolean**, unlike `NavigationView`'s `Visible/Collapsed/Auto` string |
| `IsBackButtonEnabled` | `[Boolean, String]` | `true` | back button disabled state |
| `IsPaneToggleButtonVisible` | `[Boolean, String]` | `false` | hamburger button |
| `IsPaneOpen` | `[Boolean, String]` | `true` | only drives the pane-toggle tooltip / `aria-expanded` |
| `IsCaptionButtonsVisible` | `[Boolean, String]` | `false` | draw minimize / maximize / close at the right edge |
| `CaptionButtonsFramework` | `String` | `''` | `'' \| 'Tauri' \| 'Electron'` — selects a built-in window bridge; ignored unless caption buttons are visible |
| `LeftHeader` | unknown (`type: null`) | `null` | element placed before the icon |
| `Content` | unknown (`type: null`) | `null` | center content (search box in the Gallery) |
| `RightHeader` | unknown (`type: null`) | `null` | element placed after the content |
| `IsEnabled` | `[Boolean, String]` | `true` | |
| `FlowDirection` | `String` | `'LeftToRight'` | `'RightToLeft'` mirrors padding and sets `dir` |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` → `display:none` |
| `AutoRefreshDragRegions` | `[Boolean, String]` | `false` | re-scan interactable children on content mutations |
| `PreferredHeightOption` | `String` | `'Standard'` | `'Tall'` → 46px; **anything other than `'Tall'` is `Standard` (32px)** |
| `Background` | `String` | `''` | raw CSS background |
| `Foreground` | `String` | `''` | raw CSS color (+ brush variable) |
| `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight` | `[String, Number]` | `''` | `Height` also selects the height variant: `32` → Standard, `46` → Tall |
| `Margin` | `[String, Number]` | `''` | XAML thickness |
| `HorizontalAlignment`, `VerticalAlignment` | `String` | `''` | alignment inside the parent |

### Icon / title / subtitle / content slots

There are no named Vue slots. `TitleBar` follows the XAML property-element model:

| Property element | Renders into | Also settable as prop |
| --- | --- | --- |
| `<TitleBar.IconSource>` | `PART_Icon` Viewbox | `IconSource` |
| `<TitleBar.LeftHeader>` | before the icon | `LeftHeader` |
| `<TitleBar.Content>` | center presenter | `Content` |
| `<TitleBar.RightHeader>` | after the content | `RightHeader` |
| `<TitleBar.Resources>` | local XAML resources (e.g. `TitleBarContentHorizontalAlignment`) | — |
| plain default-slot children | **treated as `Content`** (`TitleBar.vue:252-253`) | — |

So `<TitleBar><AutoSuggestBox /></TitleBar>` and
`<TitleBar><TitleBar.Content><AutoSuggestBox /></TitleBar.Content></TitleBar>` are equivalent.

### Events (`TitleBar.vue:202`)

Vue listeners receive the same argument lists the component emits:

| Event | Handler arguments | Fired when |
| --- | --- | --- |
| `BackRequested` | `(sender, null)` | back button clicked and enabled |
| `PaneToggleRequested` | `(sender, null)` | hamburger clicked |
| `LayoutUpdated` | `(sender, null)` | after mount/layout/compact-mode change |
| `CaptionButtonRequested` | **`(button, sender, null)`** — `button` is `'minimize' \| 'maximize' \| 'close'` | caption button clicked with no host action bridge |
| `MinimizeRequested` | `(sender, null)` | minimize clicked when no caption host |
| `MaximizeRequested` | `(sender, null)` | maximize clicked when no caption host |
| `CloseRequested` | `(sender, null)` | close clicked when no caption host |

`CaptionButtonRequested` is the only one whose first argument is not the sender
(`TitleBar.vue:801-803`); the Gallery handler is `(button) => …` (`TitleBarPage.vue:120`).

### Caption-button configuration

* `IsCaptionButtonsVisible` (default **false**) draws Web-rendered minimize / maximize / close.
* Actions resolve in this order (`TitleBar.vue:718-810`):
  1. `CaptionButtonsFramework="Tauri"` → the registered `TitleBarWindowHost` (if it implements
     `Minimize`/`ToggleMaximize`/`Close`/`IsMaximized`);
  2. `CaptionButtonsFramework="Electron"` → `window.electronAPI.windowControls`;
  3. otherwise no action bridge → events only (`MinimizeRequested` / `MaximizeRequested` /
     `CloseRequested` / `CaptionButtonRequested`).
* The buttons render inline in the bar's own grid unless a window host is connected, in which case
  they are `Teleport`ed to `body` and positioned over the native caption area
  (`TitleBar.vue:113, 830`).
* In the Gallery shell the pane toggle is moved into the TitleBar: `NavigationView` sets
  `IsPaneToggleButtonVisible="False"` and `TitleBar` raises `PaneToggleRequested` to flip
  `v-model:IsPaneOpen` (`App.vue:18-21, 67-75`).

### Does it need a window host adapter?

**No for rendering; yes for window behaviour.** `TitleBar` mounts and looks correct with zero host
configuration. `connectTitleBarWindowHost(element, hostAdapter)` (`titleBarHostAdapter.ts:203-217`)
returns `null` unless one of:

* `provide(titleBarHostAdapterKey, { Connect(el) { … } })` above the TitleBar, or
  `setTitleBarHostAdapter(...)` globally;
* `registerTitleBarWindowHost(ancestorElement, host)` for an ancestor element;
* the TitleBar has class **`gallery-titlebar`** (Gallery-only fallback, `App.vue:9`);
* the TitleBar is the first `.win-titlebar` inside `.win-system-backdrop-window-content`.

With `windowHost === null`:

* nothing is portaled — caption buttons live inside the bar;
* `document.title` is **not** changed (`updateWindowTitle` bails, `TitleBar.vue:514-515`);
* `SetDragRegions` / `ClearDragRegions` / `SetPreferredHeightOption` / insets are never called —
  i.e. no native drag regions, no window-controls-overlay padding;
* caption clicks only emit events.

Minimum to fully wire a browser window:

```ts
import { setTitleBarHostAdapter } from '../../components/titleBarHostAdapter'
setTitleBarHostAdapter({ Connect: () => ({ GetTitle: () => document.title, SetTitle: t => { document.title = t } }) })
```

### Drag-region behaviour

* The control computes interactable descendants (`findTitleBarInteractableElements`,
  `TitleBarDragRegion.ts:40-55`) and marks each with `data-titlebar-passthrough`
  (`TitleBar.vue:639-653`).
* Those rectangles, plus the caption region, icon region and caption-button regions, are handed to
  `windowHost.SetDragRegions({ Caption, Passthrough, Icon, CaptionButtons })` — only if the host
  implements `SetDragRegions` (`TitleBar.vue:654-685`).
* Anything can opt out of being a drag region via the attached property:
  `<Button TitleBar.IsDragRegion="False" />` (Gallery search button, `App.vue:49`). Helpers:
  `setIsDragRegion(el, v)` / `getIsDragRegion(el)` from `TitleBarDragRegion.ts`; also re-exported on
  the component as `TitleBar.SetIsDragRegion` / `GetIsDragRegion` / `IsDragRegionProperty`.
* In a plain browser tab there is no non-client area, so drag regions are inert — the bar is an
  ordinary DOM node.

### Other gotchas

1. **Default height 32px.** `PreferredHeightOption="Tall"` or `Height="46"` gives the 46px variant.
   The bar sets `height` itself; a `Height` prop wins.
2. `Title` only reaches `document.title` while a host is connected; when the prop is cleared the
   previous document title is restored (`TitleBar.vue:522-527`).
3. The bar reserves a 48px minimum drag lane and enters a compact display mode when its content no
   longer fits (`isCompact` exposed) — expect the title/subtitle to disappear in narrow shells.
4. `TitleBar` renders a `Grid` with class `win-titlebar`; scope styles with `:deep(.win-titlebar)`
   (`TitleBarPage.vue:131`).

### Minimal working SFC

```vue
<!-- AppTitleBar.vue — shows correctly with no host adapter -->
<template>
  <TitleBar
    Title="PickCat"
    Subtitle="WinUI on the web"
    IsBackButtonVisible="True"
    IsPaneToggleButtonVisible="False"
    PreferredHeightOption="Tall"
    @BackRequested="onBack"
    @PaneToggleRequested="onTogglePane">
    <TitleBar.IconSource>
      <ImageIconSource ImageSource="/cat.ico" />
    </TitleBar.IconSource>
    <TitleBar.RightHeader>
      <PersonPicture Width="30" Height="30" Initials="JD" />
    </TitleBar.RightHeader>
    <TitleBar.Content>
      <AutoSuggestBox MaxWidth="480" PlaceholderText="Search" QueryIcon="Find" />
    </TitleBar.Content>
  </TitleBar>
</template>

<script setup>
import TitleBar from '../../components/TitleBar.vue'
import AutoSuggestBox from '../../components/AutoSuggestBox.vue'
import PersonPicture from '../../components/PersonPicture.vue'
import { ImageIconSource } from '../../components/IconSource'

const onBack = () => { /* history.back() */ }
const onTogglePane = () => { /* your pane state */ }
</script>
```

---

## 3. SettingsCard

### Import

```ts
import SettingsCard from '../../components/SettingsCard.vue'
```

Global tag: `SettingsCard` (registered by the filename glob, `register.ts:481-494`).

### Purpose

A one-row settings entry: optional header icon + header text + description, a right-hand action
area (any content), and a chevron action icon when the whole card is a click target
(`SettingsCard.vue:1-60`).

### Props (`SettingsCard.vue:67-80`)

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Header` | `[String, Number]` | `''` | header text (rendered as a `TextBlock`, 14px) |
| `Description` | `[String, Number]` | `''` | secondary line (12px, secondary brush) |
| `HeaderIcon` | `String` | `''` | leading glyph/emoji; **HTML when the string starts with `<`** |
| `ActionIcon` | `String` | `'\uE974'` (ChevronRight) | trailing chevron; **HTML when the string starts with `<`** |
| `ActionIconToolTip` | `String` | `''` | tooltip applied to the whole card root |
| `IsClickEnabled` | `Boolean` | `false` | renders a `<button>` instead of a `<div>` and enables the `Click` event |
| `ContentAlignment` | `String` | `'Right'` | `'Right'`, `'Left'`, `'Vertical'` |
| `IsActionIconVisible` | `Boolean` | `true` | show/hide the trailing chevron (only when clickable) |
| `Height` | `[String, Number]` | `''` | applied as **`min-height`** |
| `Width` | `[String, Number]` | `''` | applied as `width` |

`Header`, `Description`, `HeaderIcon`, `ActionIcon` are passed through `resolveXamlValue`, so
`{ThemeResource …}` / `{StaticResource …}` markers resolve.

### v-model

None. There is no value/checked model — put a `ToggleSwitch`/`ComboBox` in the default slot and
`v-model` that control.

### Slots

| Slot | Slot props | Contents |
| --- | --- | --- |
| `Header` | none | overrides the header text block |
| `Description` | none | overrides the description block |
| `HeaderIcon` | none | overrides the leading icon (any markup) |
| `ActionIcon` | none | overrides the trailing chevron |
| `default` | none | the action area on the right (or below, for `ContentAlignment="Vertical"`) |

### Events

| Event | Handler arguments | Fired when |
| --- | --- | --- |
| `Click` | the DOM `MouseEvent` (`SettingsCard.vue:107-111`) | card clicked and `IsClickEnabled` is true |

Note the payload is a raw `MouseEvent`, **not** `(sender, args)` — different convention from
`NavigationView`/`TitleBar`.

### Gotchas

1. **`ContentAlignment="Left"` hides the header block entirely** — `v-if="ContentAlignment !== 'Left'"`
   on the header container (`SettingsCard.vue:17`). In WinUI `Left` only moves the action area.
2. `ActionIcon` (and its slot) render only when `IsClickEnabled && IsActionIconVisible`.
3. `IsClickEnabled` is declared as plain `Boolean`, so the XAML-ish string `"False"` is truthy.
   Always bind a real boolean: `:IsClickEnabled="true"`.
4. `HeaderIcon` / `ActionIcon` strings starting with `<` are injected with `v-html`
   (`SettingsCard.vue:19-22, 53-56`) — never pass user input.
5. `Height` is `min-height`; the card's own padding is 16px and it has a 4px bottom margin.
6. `IsClickEnabled` swaps the root element to `<button>`, which changes default inner layout — keep
   the action content non-interactive in that case (nested buttons are invalid HTML).

### Minimal working SFC

```vue
<!-- SettingsRowExample.vue -->
<template>
  <StackPanel Spacing="4">
    <SettingsCard
      Header="Navigation pane position"
      Description="Where the navigation pane is placed."
      HeaderIcon="&#xF594;"
      Height="70">
      <ComboBox :SelectedIndex="0">
        <ComboBoxItem Content="Left" />
        <ComboBoxItem Content="Top" />
      </ComboBox>
    </SettingsCard>

    <SettingsCard
      Header="Mica backdrop"
      Description="Requires a supported window host."
      :IsClickEnabled="true"
      ActionIconToolTip="Open appearance settings"
      @Click="openAppearance">
      <ToggleSwitch v-model:IsOn="micaOn" />
    </SettingsCard>
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import SettingsCard from '../../components/SettingsCard.vue'
import StackPanel from '../../components/StackPanel.vue'
import ComboBox from '../../components/ComboBox.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { ComboBoxItem } from '../../components/inlineControlProperties'

const micaOn = ref(true)
const openAppearance = (event) => { /* event is the MouseEvent */ }
</script>
```

---

## 4. Page

### Import

```ts
import Page from '../../components/Page.vue'
```

Global tags: `Page`, `Page.Resources` (`register.ts:371-372`).

### Purpose

A thin **resource / theme / namescope host**, not a routing primitive. It:

* provides the XAML namescope (`xamlNameScopeKey`) used by `x:Name` / `{Binding ElementName=…}`;
* collects `<Page.Resources>` declarations (including theme dictionaries) into the page resource
  dictionary and the primitive resource scope;
* provides `RequestedTheme` to descendants (`'Light'` / `'Dark'`), and
* optionally renders a `div.win-page` content host when it has layout attributes.

(`Page.vue:35-41, 55-70, 91-177`.)

### Props

**None declared.** `Page` uses `attrs` only. Attributes that create the host `<div>`:

`class`, `style`, `RequestedTheme`, `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`,
`MaxHeight`, `Margin`, `Padding`, `HorizontalAlignment`, `VerticalAlignment`, `Background`,
`BorderBrush`, `BorderThickness`, `CornerRadius`, `Visibility`, `IsHitTestVisible`, `Opacity`
(`Page.vue:35`).

### v-model

None.

### Slots

| Slot | Slot props | Contents |
| --- | --- | --- |
| `default` | none | page content **and** `<Page.Resources>` property element (resources are stripped from the visual tree) |

### Events

None.

### Gotchas

1. **Not needed for routing.** `Page` has no navigation API. The Gallery routes with vue-router
   (`src/gallery/router.ts`, whose own comment says the Web version replaces `Frame` navigation
   with vue-router) and each page component is simply wrapped in `<Page>`.
2. **No host element by default.** With no recognised attributes, `Page` renders a Vue
   `Fragment` (`Page.vue:176`) — so `style`/`class` you want to see must be one of the attributes
   above; a `class` does create the host `div` and turns on `display:grid`.
3. `RequestedTheme` is resolved dynamically and wrapped in `win-theme-scope theme-light|dark`; it is
   stripped from the host element's attributes.
4. `<Page.Resources>` must be a child of the page (it is matched by the registered dotted tag); its
   children are collected every render, so declaring resources inline is the supported pattern.
5. A `Page` nested in a `Frame` gets its own namescope; a `Frame` also provides a fresh one.

### Minimal working SFC

```vue
<!-- CatPage.vue -->
<template>
  <Page class="cat-page" RequestedTheme="Dark">
    <Page.Resources>
      <SolidColorBrush x:Key="CardBrush" Color="#202020" />
    </Page.Resources>
    <StackPanel Padding="24" Spacing="8">
      <TextBlock Text="Cats" FontSize="28" />
      <TextBlock Text="A page is just a resource/theme host." />
    </StackPanel>
  </Page>
</template>

<script setup>
import Page from '../../components/Page.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'
import { SolidColorBrush } from '../../components/xamlPrimitives'
</script>
```

---

## 5. Frame

### Import

```ts
import Frame from '../../components/Frame.vue'
import { FrameContentTransitions, TransitionCollection, NavigationThemeTransition } from '../../components/NavigationTransitionProperties'
```

Global tags: `Frame`, `Frame.ContentTransitions`, `TransitionCollection`,
`NavigationThemeTransition`, `EntranceNavigationTransitionInfo`, `DrillInNavigationTransitionInfo`,
`SuppressNavigationTransitionInfo`, `SlideNavigationTransitionInfo`,
`CommonNavigationTransitionInfo`, `ContinuumNavigationTransitionInfo` (`register.ts:273-283`).

### Purpose

A real XAML-style navigation host: page-type navigation with back/forward stacks, `Navigating` /
`Navigated` / `NavigationFailed` / `NavigationStopped` events with cancellation, `NavigationMode`
(`New` / `Back` / `Forward`), and navigation transitions (entrance / drill-in / slide / suppress /
`NavigationThemeTransition`). Unlike `Page`, this is a functional control — but it is **optional**:
the Gallery itself routes with vue-router and only uses `Frame` inside demo samples.

### Props (`Frame.vue:19-30`)

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `[String, Number, Object]` | `null` | current content: a component, a VNode, or text |
| `ContentTransitions` | `[String, Object, Array]` | `null` | transition descriptors (`[{ Type: 'NavigationThemeTransition', … }]`); `<Frame.ContentTransitions>` overrides |
| `IsNavigationStackEnabled` | `[Boolean, String]` | `true` | when `false`, `Navigate` does not push a back-stack entry |
| `Background` | `[String, Object]` | `''` | |
| `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight` | `[String, Number]` | `''` / `0` | CSS lengths |
| `Margin` | `[String, Number]` | `0` | XAML thickness |
| `HorizontalAlignment`, `VerticalAlignment` | `String` | `'Stretch'` | |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` hides |
| `Opacity` | `[String, Number]` | `1` | |

### v-model

| v-model | Event | Payload |
| --- | --- | --- |
| `v-model:Content` | `update:Content` (`Frame.vue:85, 202, 215`) | the current content / page component |

### Slots

| Slot | Slot props | Contents |
| --- | --- | --- |
| `default` | none | fallback content rendered when nothing has been navigated (any `Frame.*` property element is filtered out, `Frame.vue:360-361`) |

Property element: `<Frame.ContentTransitions>` (`Frame.vue:6-8`, structural; never rendered).

### Events

Emitted as **`(sender, args)`**, `sender` being the exposed API proxy (`Frame.vue:91-94`).

| Event | `args` | Fired when |
| --- | --- | --- |
| `Navigating` | `{ SourcePageType, Parameter, NavigationTransitionInfo, NavigationMode, Cancel }` — set `args.Cancel = true` to abort | before commit |
| `Navigated` | same object **plus `Content`** | after the destination page mounted and the transition started |
| `NavigationFailed` | `{ SourcePageType, Exception, Handled }` — set `Handled = true` to swallow | page threw during creation |
| `NavigationStopped` | the cancelled `Navigating` args | navigation cancelled |

### Exposed API (`Frame.vue:291-300, 389`)

`Content`, `CanGoBack`, `CanGoForward`, `BackStack`, `ForwardStack`, `BackStackDepth`,
`CurrentSourcePageType`, `IsNavigationStackEnabled`,
`Navigate(pageType, parameter = null, transitionInfo = null) → boolean`,
`NavigateToType(pageType, parameter = null, { TransitionInfoOverride, IsNavigationStackEnabled }) → boolean`,
`GoBack(transitionInfo?) → boolean`, `GoForward() → boolean`.

Navigated pages are instantiated with these props (`Frame.vue:337-344`):

`Parameter`, `NavigationTransitionInfo`, `NavigationVersion`.

### Gotchas

1. **You usually don't need `Frame`.** vue-router is the app-level router; `Frame` is for pages
   that want real XAML navigation semantics (the Gallery uses it only inside demos, e.g.
   `NavigationViewPage` navigates a `Frame` from `SelectionChanged`).
2. `Navigate` requires a **component object/function**; anything else returns `false`
   (`Frame.vue:267-271`). Wrap SFC imports in `markRaw(...)` if you store them in reactive state.
3. `NavigationMode` is decided by the API you call: `Navigate`/`NavigateToType` → `New`,
   `GoBack` → `Back`, `GoForward` → `Forward`.
4. `Navigating` runs synchronously inside the navigation call; cancelling emits
   `NavigationStopped` and returns `false`.
5. A navigation transition only plays when `Frame.ContentTransitions` contains a
   `NavigationThemeTransition` **or** the transition is a back navigation / non-first entry
   (`Frame.vue:185-201`), and is skipped entirely under `prefers-reduced-motion: reduce`.
6. `Frame` provides a fresh XAML namescope per retained page, so two pages may reuse `x:Name`s.
7. Text/`Fragment` content (`:Content="'hello'"`) renders as text; a VNode renders as-is.
8. During a transition the outgoing page is `inert`, `aria-hidden` and absolutely positioned
   (`Frame.vue:322-336`), and all input is locked via `frameNavigationRuntime.acquireNavigationInputLock`.

### Minimal working SFC

```vue
<!-- FrameExample.vue -->
<template>
  <Frame
    ref="frame"
    :Content="HomePage"
    MinHeight="320"
    @Navigating="onNavigating"
    @Navigated="onNavigated">
    <Frame.ContentTransitions>
      <TransitionCollection>
        <NavigationThemeTransition />
      </TransitionCollection>
    </Frame.ContentTransitions>
  </Frame>
</template>

<script setup>
import { ref, markRaw } from 'vue'
import Frame from '../../components/Frame.vue'
import { TransitionCollection, NavigationThemeTransition } from '../../components/NavigationTransitionProperties'
import HomePage from './HomePage.vue'
import DetailsPage from './DetailsPage.vue'

const frame = ref(null)
const onNavigating = (sender, args) => { /* args.Cancel = true to abort */ }
const onNavigated = (sender, args) => { console.log('now at', args.SourcePageType, args.Parameter) }

// pages receive Parameter / NavigationTransitionInfo / NavigationVersion as props
const goToDetails = () => frame.value?.Navigate(markRaw(DetailsPage), { id: 42 })
const back = () => frame.value?.GoBack()
</script>
```

---

## 6. SplitView

### Import

```ts
import SplitView from '../../components/SplitView.vue'
import { SplitViewPane, SplitViewContent } from '../../components/SplitView.vue'
```

Global tags: `SplitView`, `SplitView.Pane`, `SplitView.Content` (`register.ts:328-330`).

### Purpose

WinUI `SplitView`: a pane + content layout with `Overlay` / `Inline` / `CompactOverlay` /
`CompactInline` display modes, left/right placement, animated opening/closing, a light-dismiss
layer that closes on outside tap or `Escape`, and focus restoration. `NavigationView` uses the
same template contract internally.

### Props (`SplitView.vue:54-82`)

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Pane` | `[String, Number, Object]` | `''` | pane content when you don't use `<SplitView.Pane>` |
| `Content` | `[String, Number, Object]` | `''` | content when you don't use `<SplitView.Content>` / default children |
| `IsPaneOpen` | `[Boolean, String]` | `false` | pane expanded |
| `DisplayMode` | `String` | `'Overlay'` | `'Overlay' \| 'Inline' \| 'CompactOverlay' \| 'CompactInline'`; unknown values fall back to `'Overlay'` |
| `PanePlacement` | `String` | `'Left'` | `'Left'` or `'Right'` (anything else is `Left`) |
| `OpenPaneLength` | `[String, Number]` | `'{ThemeResource SplitViewOpenPaneThemeLength}'` | expanded width; `'Auto'` measures the pane's content. That theme resource is not defined anywhere else in this codebase, so the effective default falls back to **320px** |
| `CompactPaneLength` | `[String, Number]` | `'{ThemeResource SplitViewCompactPaneThemeLength}'` | rail width when compact/closed; effectively **48px** (same fallback) |
| `PaneBackground` | `[String, Object]` | `'{ThemeResource SystemControlPageBackgroundChromeLowBrush}'` | acrylic-brush aware |
| `LightDismissOverlayMode` | `String` | `'Auto'` | `'Auto' \| 'On' \| 'Off'`. `'On'` paints `var(--SplitViewLightDismissOverlayBackground)`; `'Auto'` stays transparent in browsers |
| `Background` | `[String, Object]` | `''` | |
| `Foreground` | `[String, Object]` | `''` | defaults to `var(--TextFillColorPrimaryBrush)` |
| `BorderBrush` | `[String, Object]` | `'{ThemeResource SystemControlForegroundTransparentBrush}'` | pane border color |
| `BorderThickness` | `[String, Number]` | `'0,0,1,0'` | pane border thickness (XAML thickness) |
| `CornerRadius` | `[String, Number]` | `'{ThemeResource SplitViewPaneRootCornerRadius}'` | pane corner radius |
| `Padding` | `[String, Number]` | `0` | **accepted but not consumed by the template** |
| `HorizontalContentAlignment` | `String` | `'Stretch'` | accepted but not consumed |
| `VerticalContentAlignment` | `String` | `'Stretch'` | accepted but not consumed |
| `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight` | `[String, Number]` | `''`, `0` | CSS lengths |
| `Margin` | `[String, Number]` | `0` | XAML thickness |
| `HorizontalAlignment`, `VerticalAlignment` | `String` | `'Stretch'` | |
| `IsTabStop` | `[Boolean, String]` | `true` | `tabindex` 0 / -1 on the root |
| `IsEnabled` | `[Boolean, String]` | `true` | `aria-disabled` + `inert` when false |
| `IsHitTestVisible` | `[Boolean, String]` | `true` | `pointer-events: none` when false |
| `Opacity` | `[String, Number]` | `1` | |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` → `display:none` |

### v-model targets

| v-model | Event | Payload |
| --- | --- | --- |
| `v-model:IsPaneOpen` | `update:IsPaneOpen` | `boolean` |
| `v-model:DisplayMode` | `update:DisplayMode` | string mode |
| `v-model:PanePlacement` | `update:PanePlacement` | `'Left' \| 'Right'` |
| `v-model:OpenPaneLength` | `update:OpenPaneLength` | number/string |
| `v-model:CompactPaneLength` | `update:CompactPaneLength` | number/string |
| `v-model:PaneBackground` | `update:PaneBackground` | brush |
| `v-model:Background` | `update:Background` | brush |
| `v-model:LightDismissOverlayMode` | `update:LightDismissOverlayMode` | string |

### Slots

| Slot / property element | Contents |
| --- | --- |
| `<SplitView.Pane>` | pane content (`Pane` prop used as fallback) |
| `<SplitView.Content>` | content region |
| `default` (unwrapped children) | fall into **content**; use `<SplitView.Pane>` for the pane |

No slot props.

### Events

Emitted as **`(sender, args)`** via `raise()` (`SplitView.vue:245-248`).

| Event | `args` |
| --- | --- |
| `PaneOpening` / `PaneOpened` / `PaneClosed` | `null` |
| `PaneClosing` | `{ Cancel }` — light-dismiss checks `Cancel` after dispatch, so it can veto the close (`SplitView.vue:342-354`) |

### Exposed API (`SplitView.vue:476-481`)

`IsPaneOpen`, `DisplayMode`, `PanePlacement`, `OpenPaneLength`, `CompactPaneLength`,
`PaneBackground`, `Background`, `LightDismissOverlayMode`, `TemplateSettings`
(`OpenPaneLength`, `NegativeOpenPaneLength`, `OpenPaneLengthMinusCompactLength`,
`NegativeOpenPaneLengthMinusCompactLength`, `OpenPaneGridLength`, `CompactPaneGridLength`).

### Gotchas

1. **`DisplayMode`, not `PaneDisplayMode`** — that is the `NavigationView` prop name.
2. `IsPaneOpen` defaults to **`false`** (closed), unlike `NavigationView`.
3. `Overlay`/`CompactOverlay` close on outside pointer press, on `Escape`, and when the root
   resizes; `Inline`/`CompactInline` do not.
4. Root is `height: 100%` — give it a sized parent or an explicit `Height`.
5. `Padding` / `HorizontalContentAlignment` / `VerticalContentAlignment` are declared but the
   official template does not consume them (comment at `SplitView.vue:69`).
6. `OpenPaneLength="Auto"` measures the pane content via `ResizeObserver`; the pane renders as
   `max-content` until measured.
7. Under `forced-colors: active` an extra high-contrast pane border is rendered.
8. `LightDismissOverlayMode="Auto"` is intentionally transparent in browsers (native WinUI only
   paints it on Xbox) — use `"On"` to get a visible scrim.

### Minimal working SFC

```vue
<!-- SplitViewExample.vue -->
<template>
  <SplitView
    v-model:IsPaneOpen="open"
    DisplayMode="CompactOverlay"
    PanePlacement="Left"
    :OpenPaneLength="240"
    :CompactPaneLength="48"
    Height="360">
    <SplitView.Pane>
      <StackPanel Padding="12" Spacing="4">
        <Button Content="Item 1" @Click="open = false" />
        <Button Content="Item 2" @Click="open = false" />
      </StackPanel>
    </SplitView.Pane>
    <SplitView.Content>
      <StackPanel Padding="16">
        <Button Content="Toggle pane" @Click="open = !open" />
        <TextBlock Text="SplitView content" />
      </StackPanel>
    </SplitView.Content>
  </SplitView>
</template>

<script setup>
import { ref } from 'vue'
import SplitView from '../../components/SplitView.vue'
import StackPanel from '../../components/StackPanel.vue'
import Button from '../../components/Button.vue'
import TextBlock from '../../components/TextBlock.vue'

const open = ref(true)
</script>
```

---

## 7. Cross-control cheat sheet

| Need | Control | Exact spelling |
| --- | --- | --- |
| navigation items | `NavigationView` | `<NavigationView.MenuItems>` + `<NavigationViewItem Content Icon Tag>` (no `items` prop) |
| footer items | `NavigationView` | `<NavigationView.FooterMenuItems>` |
| selected item | `NavigationView` | `v-model:SelectedItem` / `@SelectionChanged(sender, { SelectedItem, IsSettingsSelected })` |
| pane mode | `NavigationView` | `PaneDisplayMode` = `Auto/Left/LeftCompact/LeftMinimal/Top` |
| pane open | `NavigationView` | `v-model:IsPaneOpen` (inverse of internal compact) |
| page header | `NavigationView` | `Header` prop or `<NavigationView.Header>` |
| settings entry | `NavigationView` | `IsSettingsVisible` (default true) + `args.IsSettingsSelected` |
| custom title bar | `TitleBar` | `Title`, `Subtitle`, `<TitleBar.IconSource>`, `<TitleBar.Content>`, `<TitleBar.RightHeader>`, `<TitleBar.LeftHeader>` |
| window buttons | `TitleBar` | `IsCaptionButtonsVisible` (+ `CaptionButtonsFramework="Tauri"\|"Electron"` or a registered host) |
| drag opt-out | `TitleBar` | `TitleBar.IsDragRegion="False"` on a child |
| page resources / theme | `Page` | `<Page.Resources>`, `RequestedTheme` (thin wrapper, no routing) |
| XAML navigation | `Frame` | `Navigate` / `GoBack` / `GoForward` + `@Navigated(sender, args)` (optional; vue-router is the app router) |
| pane/content layout | `SplitView` | `DisplayMode`, `v-model:IsPaneOpen`, `<SplitView.Pane>` |
| settings row | `SettingsCard` | `Header`, `Description`, `HeaderIcon`, default slot = action, `@Click` (MouseEvent) |

Conventions to remember across all six:

* Props are PascalCase and accept both real bindings and XAML-ish strings (`"True"`, `"0,12,0,0"`, `{ThemeResource X}`).
* `NavigationView`, `Frame`, `SplitView`, `TitleBar` emit `(sender, args)`; `SettingsCard` emits the raw DOM event; `update:*` events carry a single payload.
* `NavigationView.IsBackButtonVisible` is a **string** enum; `TitleBar.IsBackButtonVisible` is a **boolean**.
* `NavigationView` uses `PaneDisplayMode`; `SplitView` uses `DisplayMode`.

---

## Appendix — claim → source map

| Claim | Source |
| --- | --- |
| NavigationView props/defaults | `NavigationView.vue:119-167` |
| NavigationView event names | `NavigationView.vue:472-485` |
| `(sender, args)` emission wrapper | `NavigationView.vue:486-490` |
| Selection payloads | `NavigationView.vue:1206-1211`, `:1317-1337`, `:2817-2823` |
| ItemInvoked payload | `NavigationView.vue:1191-1198` |
| DisplayMode strings | `NavigationView.vue:579-583` |
| Auto → Left/LeftCompact/LeftMinimal | `NavigationView.vue:523-535` |
| `isCompact` initial value | `NavigationView.vue:491` |
| hamburger → `update:IsPaneOpen` + pane events | `NavigationView.vue:1886-1977` |
| Settings item construction + click | `NavigationView.vue:1009-1021`, `:1881-1884`, `:2583-2597`, `:2608` |
| Items must be property-element children | `NavigationView.vue:257-266`, `:417-426` |
| Item descriptor shape / `Tag` identity | `NavigationView.vue:205-253` |
| Exposed API | `NavigationView.vue:1289-1354` |
| NavigationView global tags | `register.ts:284-290`, `NavigationViewProperties.ts:23-75` |
| TitleBar props | `TitleBar.vue:171-200` |
| TitleBar events + CaptionButtonRequested arity | `TitleBar.vue:202`, `:776-810` |
| TitleBar exposed API | `TitleBar.vue:947-956` |
| TitleBar height / variant | `TitleBar.vue:408-409`, `:461-511` |
| Document title sync needs a host | `TitleBar.vue:514-527` |
| Drag-region computation | `TitleBar.vue:639-685`, `TitleBarDragRegion.ts:40-55` |
| Host resolution rules | `titleBarHostAdapter.ts:203-217` |
| TitleBar property elements | `TitleBarProperties.ts:9-13`, `register.ts:455-456`, `TitleBar.vue:252-261` |
| Page attribute list / host div / Fragment | `Page.vue:35`, `:162-177` |
| Page resources + theme + namescope | `Page.vue:41-89` |
| Frame props | `Frame.vue:19-30` |
| Frame events + sender | `Frame.vue:37`, `:91-94`, `:151-220` |
| Frame exposed API | `Frame.vue:291-300` |
| Page instance props (`Parameter`, …) | `Frame.vue:337-344` |
| Frame transitions gate | `Frame.vue:185-201` |
| vue-router replaces Frame navigation | `src/gallery/router.ts:1-3` |
| SplitView props | `SplitView.vue:54-82` |
| SplitView events | `SplitView.vue:83-88`, `:245-248` |
| SplitView exposed API | `SplitView.vue:470-481` |
| SettingsCard props | `SettingsCard.vue:67-80` |
| SettingsCard slots / click arity | `SettingsCard.vue:1-60`, `:107-111` |
| SettingsCard `Left` hides header | `SettingsCard.vue:17` |
