# Tabs, bars, pivots, and flyouts

Reference for 14 controls of the WinUI-on-Web component library in
`WinUIonWeb-master/WinUIonWeb`. Every statement below was read from the component
source and from the Gallery pages that exercise it:

- `src/components/{TabView,TabViewItem,CommandBar,CommandBarFlyout,MenuBar,MenuBarItem,MenuFlyout,Flyout,SelectorBar,SelectorBarItem,Pivot,PivotItem,BreadcrumbBar,BreadcrumbBarItem}.vue`
- `src/components/{TabViewProperties,PivotProperties,commandBarRuntime,selectorBarRuntime,MenuFlyoutItems,MenuFlyoutPresenter,appBarRuntime,flyoutInput,popupRuntime}.ts`
- Gallery: `src/gallery/pages/{TabView,CommandBar,CommandBarFlyout,MenuBar,MenuFlyout,Flyout,SelectorBar,Pivot,BreadcrumbBar}Page.vue`

Values that could not be read from source are written as **unknown**; nothing here is inferred
from WinUI documentation.

---

## House conventions (applies to all 14 controls)

1. **Props are PascalCase XAML names** — `TabWidthMode`, `IsClosable`, `DefaultLabelPosition`.
   Vue would normally accept `tab-width-mode`, but every Gallery page uses the XAML spelling, and
   the untyped props of the "XAML mirror" controls are also fed `{ThemeResource …}` /
   `{x:Bind …}` strings that are resolved at render time.
2. **Handlers receive the sender first**: a control always calls
   `handler(sender, args)`, never a bare payload. `sender` is the control's public API object
   (for items, the item container). Example: `@TabCloseRequested="onClose"` →
   `function onClose(sender, args) {}` with `args.Item`, `args.Tab`.
3. **`type: null` means untyped.** `TabView`, `TabViewItem`, `Pivot`, `PivotItem` (and the
   collection-typed props of the other controls) declare `type: null`, so *any* value passes and
   XAML markup strings resolve through `resolveXamlValue`. Props with an explicit type
   (`Boolean`, `String`, `[Boolean, String]`, …) only add Vue's type warning; the string literals
   `"True"`/`"False"` are still converted to booleans by `resolveXamlValue`, which is why the
   Gallery can write `IsClosable="False"` anywhere.
4. **Property elements are components**, not slots you can skip: `<TabView.TabItems>`,
   `<CommandBar.PrimaryCommands>`, `<PivotItem.Header>`, `<Flyout.Content>`, … Each one is a
   zero-render marker component exported alongside the control.
5. **`v-model` works only where an `update:<Prop>` event is emitted** (listed per control).
   Flyout-shaped controls (`Flyout`, `MenuFlyout`, `CommandBarFlyout`) have **no** `IsOpen` prop;
   they are opened with `ShowAt(...)` and closed with `Hide()`.
6. Imports below are written relative to `src/gallery/pages/`, matching the Gallery pages.

### Quick answers to the five questions in scope

| Question | Answer |
| --- | --- |
| How are TabView tabs declared? | **Both**: `<TabViewItem>` children (bare, or inside `<TabView.TabItems>`) **or** an array through the `TabItemsSource` prop (`TabItemTemplate` renders it). `TabItemsSource` wins when set. |
| Add a tab | The control never adds one. `@AddTabButtonClick` fires `(sender, {})`; you push to your array, push to `TabItemsSource`, or call `sender.TabItems.Add(...)` / `InsertAt(...)`. |
| Close a tab | The control never removes one. Close button, middle-click and `Ctrl+F4` all raise `@TabCloseRequested` `(sender, { Item, Tab })`; you remove it. |
| Reorder tabs | User drag reorders internally when `CanReorderTabs !== false` (default `true`) and raises `TabItemsChanged { CollectionChange:'Reset', Index }`. Programmatically: splice your array, or `TabItems.RemoveAt(i)` + `TabItems.Insert(i, item)`. |
| How is `MenuFlyout` anchored to a button? | No `target` prop. Either nest it in `<Button.Flyout>` / `<AppBarButton.Flyout>` — the flyout injects the button's ref (`buttonFlyoutAnchor`) and attaches the click handler — or keep a ref and call `menu.value.ShowAt(targetElement, options)`. |
| CommandBar primary/secondary commands | `<CommandBar.PrimaryCommands>` / `<CommandBar.SecondaryCommands>` property elements; **bare** `AppBarButton`/`AppBarToggleButton`/`AppBarSeparator`/`AppBarElementContainer` children default to *primary*; runtime collections `PrimaryCommands` / `SecondaryCommands` (Add, Append, InsertAt, SetAt, RemoveAt, Clear, GetAt, Count). |
| Declarative Flyout trigger | `<Button.Flyout><Flyout>…</Flyout></Button.Flyout>` (or `<AppBarButton.Flyout>`, or `Button`'s `Flyout` prop bound to a resource flyout). The flyout opens itself; `ShowAt`/`Hide` exist for imperative control. |

---

## TabView

**Import:** `import TabView from '../../components/TabView.vue'`

**Purpose:** Tab strip + content presenter. Owns selection, tab realization, close/add buttons,
width modes, drag reordering, drag-out/tear-out plumbing, keyboard navigation, and overflow
scrolling. It is a *presentation* control: it raises intents and lets the page mutate the item
collection.

### Props

- `TabWidthMode: unknown = 'Equal'` — `'Equal'` (default, equal widths clamped to
  `TabViewItemMinWidth`/`TabViewItemMaxWidth`, i.e. 100–240 px), `'SizeToContent'`, `'Compact'`.
- `CloseButtonOverlayMode: unknown = 'Auto'` — `'Auto'`, `'Always'`, `'OnPointerOver'`. Only
  `'OnPointerOver'` hides the close button until the tab is selected or hovered.
- `TabStripHeader: unknown = null` — element left of the strip.
- `TabStripHeaderTemplate: unknown = null` — template for `TabStripHeader`.
- `TabStripFooter: unknown = null` — element right of the strip (star column, after the add button).
- `TabStripFooterTemplate: unknown = null` — template for `TabStripFooter`.
- `IsAddTabButtonVisible: unknown = true` — shows the `+` button.
- `AddTabButtonCommand: unknown = null` — `{ CanExecute(param), Execute(param) }`; called *in addition*
  to raising `AddTabButtonClick`, and gates the button's enabled state.
- `AddTabButtonCommandParameter: unknown = null` — passed to that command.
- `TabItemsSource: unknown = null` — array/iterable of item data; overrides declared children.
- `TabItemTemplate: unknown = null` — template (DataTemplate / VNode / component) used for
  `TabItemsSource` items.
- `TabItemTemplateSelector: unknown = null` — `{ SelectTemplate(item, owner) }`.
- `CanDragTabs: unknown = false` — enables the native HTML5 drag (drag-out of the control).
- `CanReorderTabs: unknown = true` — pointer drag inside the strip reorders tabs.
- `AllowDropTabs: unknown = true` — accepts drops from another TabView (or a host adapter).
- `CanTearOutTabs: unknown = false` — enables the tear-out handshake
  (`TabTearOutWindowRequested` → `TabTearOutRequested`).
- `SelectedIndex: unknown = 0` — selected index; `-1` when nothing is selected.
- `SelectedItem: unknown = undefined` — selected item (`TabItemsSource` object, or the
  `TabViewItem` container for markup tabs).
- `IsEnabled: unknown = true` — disables selection, closing and the add button.
- `IsTabStop: unknown = false` — **declared but not used** by the renderer (the tab elements
  compute their own roving `tabindex`); kept for XAML-parity.
- `Visibility: unknown = 'Visible'` — `'Visible'` / `'Collapsed'`.
- `Background: unknown = '{ThemeResource TabViewBackground}'`.
- `Foreground: unknown = ''` — text colour override.
- `BorderBrush: unknown = ''`, `BorderThickness: unknown = 0`, `CornerRadius: unknown = 0` —
  applied to the content presenter only.
- `Margin: unknown = 0`, `Padding: unknown = '{ThemeResource TabViewHeaderPadding}'` —
  padding is the *tab list* padding, not the content padding.
- `Width: unknown = ''`, `Height: unknown = ''`, `MinWidth: unknown = ''`, `MinHeight: unknown = ''`,
  `MaxWidth: unknown = ''`, `MaxHeight: unknown = ''` — numeric px or empty.
- `HorizontalAlignment: unknown = 'Stretch'`, `VerticalAlignment: unknown = 'Top'`.
- `RequestedTheme: unknown = 'Default'` — `'Light'`/`'Dark'` opens a theme scope.
- `FlowDirection: unknown = ''` — `'LeftToRight'`/`'RightToLeft'`; empty inherits the computed direction.
- `Opacity: unknown = 1`, `IsHitTestVisible: unknown = true`.

### v-model

- `v-model:SelectedIndex` — reads `update:SelectedIndex` (`number`, `-1` for none).
- `v-model:SelectedItem` — reads `update:SelectedItem` (the item object).

Both are also written on the XAML binding when the control changes selection internally.

### Events (all called as `(sender, args)`)

| Event | `args` |
| --- | --- |
| `Loaded` | `{ OriginalSource }` — raised once after mount/layout. |
| `SelectionChanged` | `{ RemovedItems: unknown[], AddedItems: unknown[] }` |
| `TabCloseRequested` | `{ Item, Tab }` — for markup tabs `Item` and `Tab` are the *same* `TabViewItem` container object; for `TabItemsSource` items `Item` is your source object. |
| `TabDroppedOutside` | `{ Item, Tab }` — drop finished outside every strip (before tear-out). |
| `AddTabButtonClick` | `{}` — empty object. |
| `TabItemsChanged` | `{ CollectionChange: 'ItemInserted' \| 'ItemRemoved' \| 'ItemChanged' \| 'Reset', Index: number }` |
| `TabDragStarting` | `{ Cancel, Data, Item, Tab }` — set `args.Cancel = true` to abort the drag. |
| `TabDragCompleted` | `{ Item, Tab, DropResult }` — `DropResult` is `'None'` or `'Move'`. |
| `TabStripDragOver` | `{ Data, DataView, Signal, AcceptedOperation, Handled, OriginalSource, DropIndex, GetPosition, OriginalEvent }` — set `AcceptedOperation = 'None'` to refuse. |
| `TabStripDrop` | same shape as above; **awaited**, so an `async` handler is supported. |
| `TabTearOutWindowRequested` | `{ Items, Tabs, SourceTabView, Signal, NewWindowId, Cancel }` — you must set `NewWindowId` or the tear-out aborts. |
| `TabTearOutRequested` | `{ Items, Tabs, SourceTabView, Signal, NewWindowId, Cancel }` |
| `ExternalTornOutTabsDropping` | `{ Items, Tabs, SourceWindowId, SourceId, Signal, DropIndex, AllowDrop }` |
| `ExternalTornOutTabsDropped` | `{ Items, Tabs, SourceWindowId, SourceId, Signal, DropIndex }` (awaited) |

`update:SelectedIndex` and `update:SelectedItem` are the only `update:` events.

### Slots

- **default** — tab declarations. Bare `<TabViewItem>` children and a `<TabView.TabItems>`
  property element are equivalent.
- Property elements: `TabItems`, `TabItemTemplate`, `TabStripHeader`, `TabStripHeaderTemplate`,
  `TabStripFooter`, `TabStripFooterTemplate`, `Resources`, `KeyboardAccelerators`.
- **No slot props** anywhere.

### Gotchas

- **Nothing is automatic.** `AddTabButtonClick` and `TabCloseRequested` are *requests*; the Gallery
  handlers do `sender.TabItems.Add(...)` / `sender.TabItems.RemoveAt(...)` (or splice their own
  bound array).
- **Declarative children vs. `TabItems` mutations don't mix.** The item list is resolved as
  `TabItemsSource ?? localItems ?? declared children`. The first programmatic `TabItems.Add/RemoveAt/
  InsertAt/ReplaceAll` on a markup-declared TabView freezes a VNode snapshot into `localItems`, and
  later changes to your `v-for` array are ignored. Choose one style: mutate your own array, or drive
  the `TabItems` collection (`TabItemsSource` arrays are spliced in place and stay live).
- **Finding which tab was closed.** For declarative tabs `args.Item === args.Tab ===` the
  `TabViewItem` container, not your row object. Resolve the index with
  `sender.IndexFromContainer(args.Tab)` (or `sender.TabItems.IndexOf(args.Tab)`), then splice your
  array. For `TabItemsSource`, `args.Item` *is* your source object.
- **Reordering** — pointer drag reorders only when `CanReorderTabs !== false`, and it rewrites the
  collection internally, raising `TabItemsChanged { CollectionChange: 'Reset', Index }`.
  `Alt+Shift+ArrowLeft/Right` performs the same reorder from the keyboard. Native drag-out (moving a
  tab to another TabView) needs `CanDragTabs = true`; tear-out needs a host adapter
  (`tabViewHostAdapter`) plus `CanTearOutTabs = true`.
- **Keyboard** — `Ctrl+F4` closes the selected tab, `Ctrl+Tab` / `Ctrl+Shift+Tab` cycles selection,
  `Home`/`End`/arrows move focus. These still only *raise* events.
- `<TabView.KeyboardAccelerators>` children are evaluated while the TabView has focus and call
  `(sender, args)` with `sender = { Key, Modifiers, IsEnabled }`, `args = { Handled, Element,
  OriginalEvent }`; set `args.Handled = true` to suppress the browser default. Write
  `<KeyboardAccelerator Key="T" Modifiers="Control" @Invoked="newTab" />` (or the XAML string form
  `Invoked="newTab"` used by the Gallery).
- **Close button visibility** is decided by `CloseButtonOverlayMode` plus `TabViewItem.IsClosable`
  and `IsEnabled`; `CanDragTabs` also sets `draggable` on the tab element.
- **`SelectedIndex` prop writes are watched** (not just `v-model`), so
  `sender.SelectedIndex = 2` works from an event handler.
- **Zero items** ⇒ `SelectedIndex === -1`. Loading items in `@Loaded` (as the Gallery does) is the
  usual pattern when the list comes from data.
- Give `v-for` tabs a stable `:key`; selection, drag identity and the realization cache are keyed by
  the VNode key.
- `Padding` styles the tab list; the content presenter has its own border/radius. `Margin="-12"`
  (as in the Gallery) only cancels the example's inset.

### Minimal SFC — declare tabs, add, close, reorder

```vue
<template>
  <TabView v-model:SelectedIndex="selectedIndex" @AddTabButtonClick="addTab" @TabCloseRequested="closeTab">
    <TabViewItem v-for="tab in tabs" :key="tab.id" :Header="tab.header" :IsClosable="true">
      <TextBlock :Text="tab.body" />
    </TabViewItem>
  </TabView>
</template>

<script setup>
import { ref } from 'vue'
import TabView from '../../components/TabView.vue'
import TabViewItem from '../../components/TabViewItem.vue'
import TextBlock from '../../components/TextBlock.vue'

let nextId = 3
const tabs = ref([
  { id: 1, header: 'Document 1', body: 'First tab' },
  { id: 2, header: 'Document 2', body: 'Second tab' }
])
const selectedIndex = ref(0)

// Add: the control only asks; we mutate our own array.
function addTab() {
  const id = nextId++
  tabs.value.push({ id, header: `Document ${id}`, body: 'New tab' })
  selectedIndex.value = tabs.value.length - 1
}

// Close: args.Tab is the TabViewItem container for declarative tabs.
function closeTab(sender, args) {
  const index = sender.IndexFromContainer(args.Tab)
  if (index >= 0) tabs.value.splice(index, 1)
}

// Reorder (also: drag the tab, or Alt+Shift+ArrowLeft/Right).
function moveTab (from, to) {
  const [tab] = tabs.value.splice(from, 1)
  tabs.value.splice(to, 0, tab)
  selectedIndex.value = to
}
</script>
```

Prop-array variant (no children, data + `TabItemTemplate`):

```vue
<TabView :TabItemsSource="tabs" @AddTabButtonClick="() => tabs.push({ Header: 'New', Content: 'Body' })"
         @TabCloseRequested="(sender, args) => tabs.splice(tabs.indexOf(args.Item), 1)" />
```

---

## TabViewItem

**Import:** `import TabViewItem from '../../components/TabViewItem.vue'`

**Purpose:** One tab header + its content panel. Renders `role="tab"`, the close button, the icon,
the drag ghost, the context flyout hook, and registers itself with the parent `TabView`
(`SetContainer`/`SetElement`). Content is realized once and kept alive in a hidden panel.

### Props

- `Header: unknown = null` — header content; a string is rendered as text and is also the default
  tooltip.
- `HeaderTemplate: unknown = null` — template for `Header`.
- `IconSource: unknown = null` — icon descriptor (`{ Symbol: 'Document' }`, `{ UriSource }`, a
  `SymbolIconSource`/`FontIconSource` element, …), rendered through `IconSourceElement` in a 16 px
  `Viewbox`.
- `Content: unknown = null` — panel content; when omitted the default slot is used.
- `ContentTemplate: unknown = null` — template for `Content`.
- `IsClosable: unknown = true` — `false` hides the close button and blocks close/middle-click.
- `IsEnabled: unknown = true` — disabled tabs cannot be selected or closed.
- `IsSelected: unknown = false` — two-way; setting it selects the tab in the parent.
- `IsTabStop: unknown = true` — participates in the header roving tabindex.
- `Visibility: unknown = 'Visible'`.
- `Background: unknown = ''`, `Foreground: unknown = ''`, `BorderBrush: unknown = ''` — per-tab
  brush overrides (set as `--tab-custom-*` CSS variables).
- `BorderThickness: unknown = 1`, `CornerRadius: unknown = '{ThemeResource OverlayCornerRadius}'`.
- `Width: unknown = ''`, `Height: unknown = ''`, `MinWidth: unknown = ''`, `MaxWidth: unknown = ''`,
  `MinHeight: unknown = 32`, `MaxHeight: unknown = ''`.
- `Margin: unknown = 0`, `Padding: unknown = ''`.
- `HorizontalAlignment: unknown = 'Stretch'`, `VerticalAlignment: unknown = 'Stretch'`.
- `HorizontalContentAlignment: unknown = 'Stretch'`, `VerticalContentAlignment: unknown = 'Center'`.
- `FontSize: unknown = 12`, `FontWeight: unknown = 'Normal'`.
- `Opacity: unknown = 1`.
- `ContextFlyout: unknown = null` — a `MenuFlyout` (or flyout object with `ShowAt`) shown on
  right-click; `<TabViewItem.ContextFlyout>` is the property element.
- `AccessKey: unknown = ''` — `accesskey` on the tab element.
- `DataContext: unknown = null` — the bound data item, used by templates.

### v-model

- `v-model:IsSelected` — reads `update:IsSelected` (`boolean`). Setting it selects the tab, subject to
  the parent's guard (a disabled item is skipped); prefer `TabView`'s `SelectedIndex` for
  programmatic moves.

### Events

| Event | `args` |
| --- | --- |
| `CloseRequested` | `{ Item, Tab }` — raised by the parent when it routes a close (close button, middle-click, `Ctrl+F4`, `RequestClose()`). `sender` is the item container. |
| `update:IsSelected` | `boolean` |

Both are dispatched in addition to the TabView-level events, so a `TabCloseRequested` close request
fires `TabView.TabCloseRequested` **and** the item's `CloseRequested`.

### Slots

- **default** — the tab body (becomes `Content` when no `Content` prop is set).
- Property elements: `Header`, `HeaderTemplate`, `IconSource`, `Content`, `ContentTemplate`,
  `ContextFlyout`, `Resources`.
- **No slot props.**

### Gotchas

- Close button visibility is `IsClosable !== false` **and** (`CloseButtonOverlayMode !==
  'OnPointerOver'` or the tab is selected/hovered). `'Auto'` behaves like `'Always'` here.
- Middle-click (`pointerup` with `button === 1`) closes without a context menu; the browser
  `auxclick` default is suppressed.
- Inside a `TabView` the item is a *container*: `IsSelected` is read from the parent, and
  `Content`/`Header`/`IconSource`/`ContextFlyout` getters/setters also flow through the parent's
  XAML bindings, so writing `item.Header = 'x'` from a handler works.
- The content of **all** realized tabs stays mounted (hidden + `inert`); don't assume
  mount/unmount lifecycle signals a tab switch.
- `TabViewItem` exposes `RequestClose()`, `Focus()`, `ParentTabView`, `TabView`, `Content`,
  `ContentTemplate`, `ActualWidth`, `ActualHeight`, `TabViewTemplateSettings`.
- `Header` also drives the automatic tooltip; `ToolTipService.ToolTip` overrides it.

### Minimal SFC

```vue
<template>
  <TabView>
    <TabViewItem Header="Home" :IsClosable="false">
      <TabViewItem.IconSource><SymbolIconSource Symbol="Home" /></TabViewItem.IconSource>
      <TextBlock Text="Home content" />
    </TabViewItem>
    <TabViewItem Header="Details" @CloseRequested="onClose">
      <TextBlock Text="Details content" />
    </TabViewItem>
  </TabView>
</template>

<script setup>
import TabView from '../../components/TabView.vue'
import TabViewItem from '../../components/TabViewItem.vue'
import { SymbolIconSource } from '../../components/IconSource'
import TextBlock from '../../components/TextBlock.vue'

function onClose (sender, args) {
  // Remove the owning item from wherever the tabs live.
  console.log('close requested', args.Item, args.Tab)
}
</script>
```

---

## CommandBar

**Import:** `import CommandBar from '../../components/CommandBar.vue'`
(`AppBarButton`, `AppBarToggleButton`, `AppBarSeparator`, `AppBarElementContainer` are the only
accepted command components.)

**Purpose:** Compact app bar with primary commands inline, dynamic overflow, a secondary (overflow)
presenter, an optional content area, and an expandable/collapsible animated surface.

### Props

- `Content: unknown = undefined` — content shown before the primary commands (`<CommandBar.Content>`
  or a string).
- `PrimaryCommands: unknown = undefined` — array of command VNodes (`h(AppBarButton, {...})`).
- `SecondaryCommands: unknown = undefined` — array of command VNodes shown in the overflow.
- `IsOpen: Boolean|String = false` — expanded state; two-way. `"False"`/`false` collapse it.
- `IsSticky: Boolean|String = false` — while true, outside-pointerdown and window-blur dismissal are
  skipped (it does not open the bar by itself).
- `IsEnabled: Boolean|String = true`.
- `IsDynamicOverflowEnabled: Boolean|String = true` — moves primary commands into the overflow as
  width shrinks (honours each command's `DynamicOverflowOrder`).
- `DefaultLabelPosition: String = 'Bottom'` — `'Bottom'`, `'Right'`, `'Collapsed'`.
- `ClosedDisplayMode: String = 'Compact'` — `'Compact'` (48 px), `'Minimal'` (24 px), `'Hidden'` (0).
- `OverflowButtonVisibility: String = 'Auto'` — `'Auto'` (only with commands), `'Visible'`, `'Collapsed'`.
- `Background: unknown = undefined` — closed background; open uses `CommandBarBackgroundOpen`.
- `Foreground: unknown = undefined`.
- `Padding: unknown = '4,0,0,0'` — content padding, XAML thickness string.
- `CornerRadius: unknown = undefined`.
- `HorizontalAlignment: String = 'Stretch'` — `'Left'|'Center'|'Right'|'Stretch'` maps to
  `align-self`/`justify-self`.

### v-model

Every non-collection prop has an `update:<Prop>` event (`update:IsOpen`, `update:IsSticky`,
`update:DefaultLabelPosition`, `update:ClosedDisplayMode`, …), so `v-model:IsOpen` and
`v-model:IsSticky` work. Collection props are set through the exposed collections instead.

### Events

| Event | `args` |
| --- | --- |
| `Opening` | `{}` |
| `Opened` | `{}` (raised once the open animation starts) |
| `Closing` | `{}` |
| `Closed` | `{}` |
| `DynamicOverflowItemsChanging` | `{ Action: 'AddingToOverflow' \| 'RemovingFromOverflow' }` |

There is no cancellable `args.Cancel` on any of these. Command clicks are raised by the command
components themselves (`@Click` on `AppBarButton`).

### Slots

- **default** — command declarations and property markers. Bare
  `AppBarButton`/`AppBarToggleButton`/`AppBarSeparator`/`AppBarElementContainer` children go to
  **PrimaryCommands**.
- Property elements: `PrimaryCommands`, `SecondaryCommands`, `Content`.
- **No slot props.**

### Gotchas

- **Only four command component names are recognised** (`isAppBarCommand`); anything else — including
  a custom wrapper component — is silently dropped. `Content` must be passed via
  `<CommandBar.Content>` or the `Content` prop; a bare `<TextBlock>` child is ignored.
- **Runtime command API** — `bar.PrimaryCommands` / `bar.SecondaryCommands` are collections with
  `Count`, `Size`, `length`, `Add`, `Append`, `InsertAt`, `SetAt`, `RemoveAt`, `Clear`, `GetAt`.
  Every element must be a **VNode**, so build them with `h(AppBarButton, { Icon: 'Add', ... })`
  (that is exactly what `CommandBarPage.vue` does).
- Passing a plain data array to the `PrimaryCommands` prop throws
  `TypeError: PrimaryCommands requires AppBar command elements`.
- **Dynamic overflow is on by default**: a primary command can move into the overflow (and back) as
  the bar resizes; observe `DynamicOverflowItemsChanging` to mirror it in your own state. Use
  `DynamicOverflowOrder` on commands to control which move first.
- The bar needs a real width for overflow to be computed (the Gallery wraps it in a
  `StackPanel`); `HorizontalAlignment="Stretch"` gives it the parent width.
- Keyboard: `Escape` closes, arrows move between commands, `Tab` inside the overflow closes it,
  `ArrowDown`/`ArrowUp` on the "more" button open and focus the overflow.
- `IsSticky` disables the outside-pointerdown and window-blur dismissal; combine
  `IsOpen = true` + `IsSticky = true` for a pinned bar (see `CommandBarPage.vue`).
- The primary/secondary presenters are portaled and the overflow is positioned against the bar's
  bounding rect, so scoped CSS from your page will not reach it.

### Minimal SFC

```vue
<template>
  <CommandBar>
    <CommandBar.PrimaryCommands>
      <AppBarButton Icon="Add" Label="Add" @Click="clicked = 'Add'" />
      <AppBarButton Icon="Edit" Label="Edit" @Click="clicked = 'Edit'" />
    </CommandBar.PrimaryCommands>
    <CommandBar.SecondaryCommands>
      <AppBarButton Icon="Setting" Label="Settings" @Click="clicked = 'Settings'" />
    </CommandBar.SecondaryCommands>
  </CommandBar>
  <TextBlock :Text="clicked ? `You clicked ${clicked}` : ''" />
</template>

<script setup>
import { ref } from 'vue'
import CommandBar from '../../components/CommandBar.vue'
import AppBarButton from '../../components/AppBarButton.vue'
import TextBlock from '../../components/TextBlock.vue'

const clicked = ref('')
</script>
```

---

## MenuBar

**Import:** `import MenuBar from '../../components/MenuBar.vue'`

**Purpose:** Horizontal menu strip (`role="menubar"`) that hosts `MenuBarItem` titles and manages
one open menu at a time, roving focus, arrow-key traversal, hover-to-switch and window-blur
dismissal.

### Props

- `Items: Array|Object|String = undefined` — array of `MenuBarItem` **VNodes**; when set it replaces
  declared children.
- `IsEnabled: Boolean|String = true`.
- `Visibility: String = 'Visible'` — `'Collapsed'` hides it and closes any open menu.
- `RequestedTheme: String = 'Default'` — `'Light'`/`'Dark'` opens a theme scope and provides
  `winuiTheme` to descendants.

### v-model

`update:Items`, `update:IsEnabled`, `update:Visibility`. (`RequestedTheme` has no update event.)

### Events

None besides the `update:*` events — interaction events belong to the menu items
(`MenuFlyoutItem` `@Click`).

### Slots

- **default** — `MenuBarItem` children (anything without the `__menuBarItem` marker is filtered out).
- Property element: `MenuBar.Items`.
- **No slot props.**

### Gotchas

- Children must be `MenuBarItem`; wrapping them in another component breaks the marker check.
- `Items` accepts VNodes only (`h(MenuBarItem, { Title: 'File' }, () => [...])`); a data array will
  render nothing.
- One menu open at a time: hovering another title while a menu is open switches menus; `Escape`
  closes and restores focus; window blur closes everything.
- `MenuBar` is a `<nav>` with `role="menubar"`, `min-height: 40px`; `MenuBarItem` supplies its own
  4 px margin and padding.
- Exposed API: `Items` (collection: `Count`, `GetAt`, `IndexOf`, `Add`, `Append`, `InsertAt`,
  `SetAt`, `RemoveAt`, `RemoveAtEnd`, `Clear`, `ReplaceAll`), `Focus()`, `Element`,
  `IsEnabled`, `Visibility`.
- `IsEnabled`/`Visibility` on the bar cascade: a disabled or collapsed bar closes and disables its
  items.

### Minimal SFC

```vue
<template>
  <MenuBar>
    <MenuBarItem Title="File">
      <MenuFlyoutItem Text="New" @Click="log('New')" />
      <MenuFlyoutItem Text="Open" @Click="log('Open')" />
      <MenuFlyoutSeparator />
      <MenuFlyoutItem Text="Exit" @Click="log('Exit')" />
    </MenuBarItem>
    <MenuBarItem Title="Edit">
      <MenuFlyoutItem Text="Cut" @Click="log('Cut')" />
      <MenuFlyoutItem Text="Copy" @Click="log('Copy')" />
    </MenuBarItem>
  </MenuBar>
</template>

<script setup>
import { ref } from 'vue'
import MenuBar from '../../components/MenuBar.vue'
import MenuBarItem from '../../components/MenuBarItem.vue'
import { MenuFlyoutItem, MenuFlyoutSeparator } from '../../components/MenuFlyoutItems'

const last = ref('')
const log = (name) => { last.value = name }
</script>
```

---

## MenuBarItem

**Import:** `import MenuBarItem from '../../components/MenuBarItem.vue'`

**Purpose:** One clickable menu title in a `MenuBar`. Renders a `role="menuitem"` button (with
`aria-haspopup="menu"` / `aria-expanded`) and lazily attaches an internal
`MenuFlyout` (always `Placement="Bottom"`) holding the declared menu items.

### Props

- `Title: String|Number|Object = undefined` — the visible title; defaults to the localized
  `MenuBarItemDefaultTitle` string when omitted.
- `Items: Array|Object|String = undefined` — menu-item VNodes; replaces declared children.
- `IsEnabled: Boolean|String = true`.
- `IsTabStop: Boolean|String = true` — participates in the menu bar's roving tabindex.
- `Visibility: String = 'Visible'` — `'Collapsed'` hides the title and closes its menu.

### v-model

`update:Title`, `update:Items`, `update:IsEnabled`, `update:IsTabStop`, `update:Visibility`.

### Events

No interaction events of its own. The hosted menu items raise `Click` / `Checked` / `Unchecked`
(`MenuFlyoutItem`, `ToggleMenuFlyoutItem`, `RadioMenuFlyoutItem`, `SplitMenuFlyoutItem`).

### Slots

- **default** — `MenuFlyoutItem`, `MenuFlyoutSubItem`, `MenuFlyoutSeparator`,
  `ToggleMenuFlyoutItem`, `RadioMenuFlyoutItem`, `SplitMenuFlyoutItem`.
- Property element: `MenuBarItem.Items`.
- **No slot props.**

### Gotchas

- **`MenuBarItem` cannot usefully stand alone.** It registers with the injected `MenuBar` context;
  without one it still renders a button and a flyout, but menu-to-menu keyboard/hover switching,
  roving tabindex and "one open menu" behaviour are gone.
- **An item with no menu items does not open** (`hasItems()` gates both click and keyboard open).
- Opening happens on **pointerdown**, plus `click` for keyboard/programmatic activation;
  `ArrowDown`/`Enter`/`Space` open, `ArrowLeft`/`ArrowRight` move between titles.
- The nested flyout is created for you — do not put a `MenuFlyout` inside `<MenuBarItem>` yourself.
- Exposed: `Title`, `IsEnabled`, `IsTabStop`, `Visibility`, `Name` (from `x:Name`), `Items`,
  `Element`, `Focus()`.

### Minimal SFC

```vue
<template>
  <MenuBar>
    <MenuBarItem Title="View">
      <MenuBarItem.Items>
        <RadioMenuFlyoutItem Text="Landscape" GroupName="Orientation" @Click="log('Landscape')" />
        <RadioMenuFlyoutItem Text="Portrait" GroupName="Orientation" :IsChecked="true" @Click="log('Portrait')" />
        <MenuFlyoutSeparator />
        <ToggleMenuFlyoutItem v-model:IsChecked="compact" Text="Compact view" />
      </MenuBarItem.Items>
    </MenuBarItem>
  </MenuBar>
</template>

<script setup>
import { ref } from 'vue'
import MenuBar from '../../components/MenuBar.vue'
import MenuBarItem from '../../components/MenuBarItem.vue'
import { MenuFlyoutSeparator, RadioMenuFlyoutItem, ToggleMenuFlyoutItem } from '../../components/MenuFlyoutItems'

const compact = ref(false)
const log = () => {}
</script>
```

---

## MenuFlyout

**Import:** `import MenuFlyout from '../../components/MenuFlyout.vue'`

**Purpose:** Lightweight popup menu (`MenuFlyout` + `MenuFlyoutPresenter`) supporting items,
submenus, separators, toggles, radio groups and split items. Anchored at a target element and
positioned with popup placement/constraint logic.

### Props

- `Items: unknown = undefined` — `MenuFlyoutItemBase` VNodes; replaces declared children.
- `MenuFlyoutPresenterStyle: unknown = undefined` — style object / `{StaticResource …}` with
  `Setters` (Background, Padding, MinWidth, `ScrollViewer.*`, …).
- `Placement: String = 'Bottom'` — note: **`'Bottom'`**, unlike `Flyout`'s `'Top'`.
- `ShowMode: String = 'Standard'` — `'Standard'`, `'Transient'`, `'TransientWithDismissOnPointerMoveAway'`.
- `LightDismissOverlayMode: String = 'Auto'` — `'On'` paints the smoke overlay.
- `AreOpenCloseAnimationsEnabled: Boolean|String = true`.
- `ShouldConstrainToRootBounds: Boolean|String = true` — `false` lets it overflow the viewport root.
- `AllowFocusOnInteraction: Boolean|String = true`.
- `AllowFocusWhenDisabled: Boolean|String = false`.
- `OverlayInputPassThroughElement: unknown = undefined` — element that keeps receiving input while
  the overlay is shown.

### v-model

No `IsOpen` prop ⇒ **no `v-model:IsOpen`**. Use `ShowAt` / `Hide`. Every prop has an
`update:<Prop>` event; `update:Items` is emitted by the collection API when items are replaced.

### Events

| Event | `args` |
| --- | --- |
| `Opening` | `{}` — handler receives `(menuApi, {})`; the Gallery rebuilds `menu.Items` here. |
| `Opened` | `{}` |
| `Closing` | `{ Cancel }` — set `args.Cancel = true` to refuse closing. |
| `Closed` | `{}` |

Item clicks are raised by the items (`MenuFlyoutItem` `@Click` → `(itemApi, args)`).

### Exposed API (template ref / `x:Name`)

`ShowAt(target?, options?)`, `Hide(restoreFocus = true)`, `IsOpen`, `Target`, `Items`,
`IsConstrainedToRootBounds`, plus writable properties for every prop.

`ShowAt` options: `{ Placement?, ShowMode?, Position?: { X, Y }, ExclusionRect?: { X, Y, Width, Height } }`
— `ExclusionRect` keeps the menu below the anchor when a `Bottom` placement with an explicit
`Position` would overlap it.

### Slots

- **default** — menu items.
- Property elements: `MenuFlyout.Items`, `MenuFlyout.MenuFlyoutPresenterStyle`
  (`<Style><Setter Property="…" Value="…" /></Style>`).
- **No slot props.**

### Gotchas

- **Anchoring a menu to a button — three supported ways:**
  1. Nest it in the button's flyout property:
     `<Button><Button.Flyout><MenuFlyout>…</MenuFlyout></Button.Flyout></Button>`.
     `MenuFlyout` injects `buttonFlyoutAnchor` (provided by `Button`/`RichEditBox`) and adds the
     click listener itself, so no code is required.
  2. `<AppBarButton><Button.Flyout><MenuFlyout …>` — `AppBarButton` accepts the `__buttonProperty`
     `'flyout'` marker, computes `hasFlyout` (chevron + `aria-haspopup="menu"` when the child is a
     `MenuFlyout`) and **toggles** it on click (open → `Hide`, closed → `ShowAt`).
  3. Bind a resource flyout to the `Flyout` prop of a control, or call
     `menu.value.ShowAt(element, { Placement: 'Bottom' })` yourself. `ShowAt()` with no argument
     falls back to the injected button anchor, then to the parent of the component's hidden
     `<span class="win-menu-flyout-anchor">`.
- A `MenuFlyout` rendered **outside** one of those anchors renders only the hidden anchor span —
  nothing visible until you call `ShowAt`.
- **Items are VNodes of the library's item components**, not plain data. `Items.Add/SetAt/InsertAt/
  ReplaceAll` throw `TypeError: MenuFlyout.Items accepts MenuFlyoutItemBase elements.` otherwise.
  Build dynamic items with `h(MenuFlyoutItem, { Text: '…', onClick: … })`.
- `Opening` is the supported place to populate items (`menu.Items.Clear()` then `Add(...)`), as in
  `TabViewPage.vue`; call `menu.Hide()` to suppress an empty menu.
- Collection API: `Count`, `Size`, `length`, `GetAt`, `Add`, `Append`, `InsertAt`, `SetAt`,
  `RemoveAt`, `RemoveAtEnd`, `Clear`, `IndexOf`, `ReplaceAll`; iteration yields the live items.
- `Placement` defaults to `'Bottom'`; the presenter auto-flips to `Top` when there is no room.
- The presenter is portaled to `<body>`; page-scoped CSS does not reach it. Theme still follows the
  nearest `data-theme`/theme class of the anchor.
- Light dismiss comes from the shared flyout input region plus a body-level dismiss layer; nested
  submenus get higher z-index layers automatically.

### Minimal SFC

```vue
<template>
  <Button Content="Options">
    <Button.Flyout>
      <MenuFlyout>
        <MenuFlyoutItem Text="Reset" @Click="last = 'Reset'" />
        <MenuFlyoutSeparator />
        <MenuFlyoutSubItem Text="Export">
          <MenuFlyoutItem Text="PDF" @Click="last = 'PDF'" />
          <MenuFlyoutItem Text="Text" @Click="last = 'Text'" />
        </MenuFlyoutSubItem>
        <ToggleMenuFlyoutItem v-model:IsChecked="repeat" Text="Repeat" />
      </MenuFlyout>
    </Button.Flyout>
  </Button>
  <TextBlock :Text="last" />
</template>

<script setup>
import { ref } from 'vue'
import Button from '../../components/Button.vue'
import MenuFlyout from '../../components/MenuFlyout.vue'
import TextBlock from '../../components/TextBlock.vue'
import {
  MenuFlyoutItem,
  MenuFlyoutSeparator,
  MenuFlyoutSubItem,
  ToggleMenuFlyoutItem
} from '../../components/MenuFlyoutItems'

const last = ref('')
const repeat = ref(true)
</script>
```

---

## Flyout

**Import:** `import Flyout from '../../components/Flyout.vue'`

**Purpose:** A general light-dismiss popup (dialog role) hosting arbitrary content in a
`FlyoutPresenter`, with focus management, focus trap, escape/outside-click/blur dismissal, theme
scoping and `FlyoutPresenterStyle` support.

### Props

- `Content: unknown = undefined` — content element; otherwise the default slot is used.
- `Placement: String = 'Top'` — side `Top`/`Bottom`/`Left`/`Right`, optional alignment suffix
  (`TopEdgeAlignedLeft`, `RightEdgeAlignedTop`, …), `Full`, or `Auto` (treated as `Bottom`).
- `ShowMode: String = 'Standard'` — `'Standard'` (focus + tab trap), `'Transient'`,
  `'TransientWithDismissOnPointerMoveAway'`.
- `LightDismissOverlayMode: String = 'Auto'` — `'On'` adds the smoke overlay layer.
- `AreOpenCloseAnimationsEnabled: Boolean|String = true`.
- `ShouldConstrainToRootBounds: Boolean|String = true`.
- `AllowFocusOnInteraction: Boolean|String = true` — moves focus into the flyout on `ShowAt` when
  `ShowMode === 'Standard'`.
- `AllowFocusWhenDisabled: Boolean|String = false`.
- `FlyoutPresenterStyle: unknown = undefined` — object or `{StaticResource …}` with `Setters`
  (Background, Padding, MinWidth/MaxWidth, CornerRadius, `ScrollViewer.*`). Property-element setters
  are also read: `<Flyout.FlyoutPresenterStyle><Style><Setter …/></Style></Flyout.FlyoutPresenterStyle>`.

### v-model

No `IsOpen` prop ⇒ **no `v-model`**. Open with `ShowAt`, close with `Hide` (declaratively:
`<Button.Flyout>` automation). Each prop has `update:<Prop>`.

### Events

| Event | `args` |
| --- | --- |
| `Opening` | `{}` |
| `Opened` | `{}` |
| `Closing` | `{ Cancel }` — set `args.Cancel = true` to keep it open. |
| `Closed` | `{}` |

Listeners are called as `(flyoutApi, args)`.

### Exposed API

`ShowAt(placementTarget?, options?)`, `Hide(restoreFocus = true)`, `IsOpen`, `Target`, `Content`,
`IsConstrainedToRootBounds`, plus writable copies of every non-`Content` prop.

`ShowAt` options: `{ Placement?, ShowMode?, Position?: { X, Y } }`.

### Slots

- **default** — the flyout body.
- Property elements: `Flyout.Content`, `Flyout.FlyoutPresenterStyle`.
- **No slot props.**

### Gotchas

- **Declarative open** (the intended pattern): put the flyout in a control's flyout property —
  `<Button.Flyout><Flyout>…</Flyout></Button.Flyout>`. `Flyout` injects `buttonFlyoutAnchor`
  and binds that button's `click` to `ShowAt`; `Button` itself also calls `Flyout.ShowAt` for a
  `Flyout`-prop declaration. There is no `IsOpen` boolean to bind.
- **Closing is manual for `Button`**: a second click on the owning `Button` re-runs `ShowAt`
  (reposition) rather than closing, so a "Confirm/Close" button inside the flyout must call
  `Hide()` — exactly what `FlyoutPage.vue` does (`controls.Control1?.Flyout?.Hide()` via the
  `Button`'s exposed `Flyout`). `AppBarButton` *does* toggle.
- Content is teleported into a body-level `FlyoutPresenter` (`PortalHost`); page-scoped styles will
  not apply, and `position: fixed` coordinates come from the placement target.
- `Escape`, outside `pointerdown`, `window.blur`, and (in
  `TransientWithDismissOnPointerMoveAway`) moving the pointer > 40 px outside the anchor+presenter
  all hide it.
- Multiple flyouts coordinate through a `winui-flyout-opening` window event: opening another flyout
  hides the previous one.
- `Tab` cycles inside the flyout for `ShowMode === 'Standard'`; focus returns to the previous
  element on `Hide`.
- `ShowAt()` with no target falls back to the injected button anchor and then to the parent of the
  component's own hidden `<span class="flyout-anchor">`; `ShowAt()` before mount is a no-op.

### Minimal SFC

```vue
<template>
  <Button ref="owner" Content="Empty the cart">
    <Button.Flyout>
      <Flyout>
        <div>
          <TextBlock Text="This removes every item." />
          <Button Content="Confirm" @Click="confirm" />
        </div>
      </Flyout>
    </Button.Flyout>
  </Button>
</template>

<script setup>
import { ref } from 'vue'
import Button from '../../components/Button.vue'
import Flyout from '../../components/Flyout.vue'
import TextBlock from '../../components/TextBlock.vue'

const owner = ref(null)

function confirm () {
  owner.value?.Flyout?.Hide()   // Button exposes its flyout as `Flyout`
}
</script>
```

---

## CommandBarFlyout

**Import:** `import CommandBarFlyout from '../../components/CommandBarFlyout.vue'`

**Purpose:** A compact command bar in a flyout: primary commands plus a "more" button that expands
the secondary commands in place. Used for image/context action menus.

### Props

- `PrimaryCommands: unknown = undefined` — command VNodes.
- `SecondaryCommands: unknown = undefined` — command VNodes (expanded section).
- `AlwaysExpanded: Boolean|String = false` — forces an expanded, standard flyout and removes the
  "more" button.
- `Placement: String = 'Top'` — default **`'Top'`** (unlike `MenuFlyout`).
- `ShowMode: String = 'Standard'`.
- `AreOpenCloseAnimationsEnabled: Boolean|String = true`.
- `ShouldConstrainToRootBounds: Boolean|String = true`.
- `LightDismissOverlayMode: String = 'Auto'`.

There is **no `Content` prop** (commands only).

### v-model

No `IsOpen` prop (`IsOpen` is a read-only getter on the exposed API). Props emit
`update:PrimaryCommands`, `update:SecondaryCommands`, `update:AlwaysExpanded`, ….

### Events

| Event | `args` |
| --- | --- |
| `Opening` | `{}` |
| `Opened` | `{}` |
| `Closing` | `{}` |
| `Closed` | `{}` |

Command clicks come from the command components (`@Click` on `AppBarButton`).

### Exposed API

`ShowAt(target?, { Placement?, ShowMode?, Position? })`, `Hide(restoreFocus = true)`,
`IsOpen` (read-only), `Target`, `PrimaryCommands`, `SecondaryCommands`, plus every prop.

### Slots

- **default** — commands and property markers.
- Property elements: `CommandBarFlyout.PrimaryCommands`, `CommandBarFlyout.SecondaryCommands`.
- **No slot props.**

### Gotchas

- **`ShowMode` at open time is what matters**: the Gallery opens it as `'Transient'` for a click and
  `'Standard'` (with focus) for a right-click context request:
  `flyout.ShowAt(image, { ShowMode: 'Standard', Placement: 'RightEdgeAlignedTop' })`.
- **Anchoring**: it injects `buttonFlyoutAnchor`/`buttonFlyoutController` like `Flyout`, so nesting it
  in `<Button.Flyout>` auto-arms click-to-open; otherwise call `ShowAt` (a `Button`/control ref or an
  `HTMLElement` both resolve through `resolvePopupElement`).
- Primary commands overflow at roughly 440 px (`min(440, available)`); overflowed primaries appear
  above the secondary commands with a divider.
- `AlwaysExpanded = true` forces `ShowMode = 'Standard'`, disables the "more" button and expands the
  secondary section immediately.
- The expanded/collapsed state is animated with clip-path; `prefers-reduced-motion` disables it.
- The presenter is portaled to `<body>` with its own acrylic backdrop layers; page-scoped CSS does
  not reach it.
- No `Content`, no `v-model:IsOpen` — use `ShowAt`/`Hide`.

### Minimal SFC

```vue
<template>
  <Button ref="anchor" Content="Show actions" @Click="show" />
  <CommandBarFlyout ref="bar" Placement="Right">
    <CommandBarFlyout.PrimaryCommands>
      <AppBarButton Icon="Share" Label="Share" @Click="bar.Hide()" />
      <AppBarButton Icon="Delete" Label="Delete" @Click="bar.Hide()" />
    </CommandBarFlyout.PrimaryCommands>
    <CommandBarFlyout.SecondaryCommands>
      <AppBarButton Label="Resize" @Click="bar.Hide()" />
    </CommandBarFlyout.SecondaryCommands>
  </CommandBarFlyout>
</template>

<script setup>
import { ref } from 'vue'
import AppBarButton from '../../components/AppBarButton.vue'
import Button from '../../components/Button.vue'
import CommandBarFlyout from '../../components/CommandBarFlyout.vue'

const anchor = ref(null)
const bar = ref(null)

function show () {
  bar.value?.ShowAt(anchor.value, { ShowMode: 'Transient', Placement: 'Right' })
}
</script>
```

---

## SelectorBar

**Import:** `import SelectorBar from '../../components/SelectorBar.vue'`

**Purpose:** Segmented selector (like WinUI's `SelectorBar`): a horizontal row of
`SelectorBarItem`s with a single selected item, accent "pill" indicator, roving focus and
keyboard/pointer selection.

### Props

- `Style: String|Object = null` — style object / `{StaticResource …}`; `Key === 'TokenViewSelectorBarStyle'`
  switches to the token visual.
- `Items: Array|String = undefined` — array of **`SelectorBarItem` prop objects** (each is rendered as
  `h(SelectorBarItem, item)`); replaces declared children.
- `SelectedItem: unknown = undefined` — must be an element of `Items` or an error is thrown.
- `Padding: String|Number = '{ThemeResource SelectorBarPadding}'` — applied to the items view, not the root.
- `Background: String = 'Transparent'`, `BorderBrush: String = 'Transparent'`.
- `CornerRadius: String|Number = 0`.
- `Width: String|Number = ''`, `Height: String|Number = ''`.
- `MinWidth: String|Number = 0`, `MinHeight: String|Number = 0`.
- `MaxWidth: String|Number = ''`, `MaxHeight: String|Number = ''`.
- `Margin: String|Number = 0`.
- `HorizontalAlignment: String = 'Left'`, `VerticalAlignment: String = 'Top'`.
- `TabNavigation: String = 'Once'` — forwarded to the inner `ItemsView`.
- `IsTabStop: Boolean|String = false`.
- `IsEnabled: Boolean|String = true`.
- `FlowDirection: String = 'LeftToRight'` — `'RightToLeft'` sets `dir="rtl"`.

### v-model

- `v-model:SelectedItem` — reads `update:SelectedItem`; the value is the **item control object**
  (read `.Text`, `.Tag`, `.IsSelected`), not your data object.

### Events

| Event | `args` |
| --- | --- |
| `SelectionChanged` | `Object.freeze({})` — deliberately empty (`SelectorBarSelectionChangedEventArgs` has no fields). Read `sender.SelectedItem`. |
| `update:SelectedItem` | the item control object (or `null`) |

### Slots

- **default** — `SelectorBarItem` children. Only nodes whose component name is exactly
  `SelectorBarItem` are collected (fragments are flattened); anything else is ignored.
- Property element: `SelectorBar.Items`.
- **No slot props.**

### Gotchas

- **Children must be the real `SelectorBarItem` component** (name check), so a wrapper component or
  an aliased re-export will not be picked up. `Items` must be *prop objects*, not VNodes:
  `:Items="[{ Text: 'Recent', Icon: 'Clock' }, …]"`.
- **`SelectedItem` must be a member of `Items`** — assigning anything else throws
  `TypeError: SelectedItem must be an element of Items.`
- Initial selection: the bound `SelectedItem` wins; otherwise the first item with
  `IsSelected="True"`, otherwise nothing. When focus enters the bar with no selection, the bar
  selects the current/first enabled item.
- `SelectionChanged` carries no payload by design; use `sender.SelectedItem`.
- Exposed API: `Style`, `Items` (array plus `Count`, `Size`, `GetAt`, `IndexOf`, `Add`/`Append`,
  `InsertAt`, `RemoveAt`, `Clear`), `SelectedItem`, `IsEnabled`, `FlowDirection`.
- There are **no per-item events**; the bar reports every selection change.
- Token styling: `Style="{StaticResource TokenViewSelectorBarStyle}"` (items need the matching
  `TokenViewSelectorBarItemStyle`).

### Minimal SFC

```vue
<template>
  <SelectorBar @SelectionChanged="onSelectionChanged">
    <SelectorBarItem Text="Recent" Icon="Clock" :IsSelected="true" />
    <SelectorBarItem Text="Shared" Icon="Share" />
    <SelectorBarItem Text="Favorites" Icon="Favorite" />
  </SelectorBar>
  <TextBlock :Text="current" />
</template>

<script setup>
import { ref } from 'vue'
import SelectorBar from '../../components/SelectorBar.vue'
import SelectorBarItem from '../../components/SelectorBarItem.vue'
import TextBlock from '../../components/TextBlock.vue'

const current = ref('Recent')

function onSelectionChanged (sender) {
  current.value = sender.SelectedItem?.Text ?? ''
}
</script>
```

---

## SelectorBarItem

**Import:** `import SelectorBarItem from '../../components/SelectorBarItem.vue'`

**Purpose:** One segment of a `SelectorBar`: icon + text (or custom `Child`), selection pill,
pointer/keyboard handling and automation (`role="option"`, `aria-selected`).

### Props

- `Style: String|Object = null` — `Key === 'TokenViewSelectorBarItemStyle'` switches visuals.
- `Text: String|Number = ''` — label text; empty hides the text block.
- `Tag: String|Number = ''` — free-form identifier for your handlers.
- `Icon: String|Object = null` — a symbol name string (`'Clock'` → `SymbolIcon`), an icon-source
  object, or an element node.
- `Child: unknown = null` — custom content instead of icon/text.
- `IsSelected: Boolean|String = false` — seed/override selection.
- `IsEnabled: Boolean|String = true`.
- `IsTabStop: Boolean|String = true`.
- `IsHitTestVisible: Boolean|String = true` — `false` blocks pointer/keyboard invocation.
- `Visibility: String = 'Visible'` — `'Collapsed'` hides and disqualifies the item.
- `Padding: String|Number = '12,10,12,7'` — content margin.
- `Width: String|Number = ''`, `Height: String|Number = ''`.
- `MinWidth: String|Number = 0`, `MinHeight: String|Number = 0`.
- `MaxWidth: String|Number = ''`, `MaxHeight: String|Number = ''`.
- `Margin: String|Number = 0`, `Opacity: String|Number = 1`.
- `BackgroundSizing: String = 'OuterBorderEdge'` — `'InnerBorderEdge'` clips the background to padding.
- `Background: String = 'Transparent'`.
- `Foreground: String = '{ThemeResource SelectorBarItemForeground}'`.
- `BorderBrush: String = '{ThemeResource SelectorBarItemBorderBrush}'`, `BorderThickness: String|Number = 1`.
- `CornerRadius: String|Number = '{ThemeResource ControlCornerRadius}'`.
- `HorizontalAlignment: String = 'Left'`, `VerticalAlignment: String = 'Center'`.
- `HorizontalContentAlignment: String = 'Left'`, `VerticalContentAlignment: String = 'Top'`.
- `FontFamily: String = '{ThemeResource ContentControlThemeFontFamily}'`.
- `FontSize: String|Number = 14`, `FontWeight: String = 'Normal'`.
- `FocusVisualMargin: String|Number = -2`, `UseSystemFocusVisuals: Boolean|String = true`.

### v-model

None — `SelectorBarItem` declares no `emits`. Selection is owned by `SelectorBar`; `IsSelected` is
only an initial/override value.

### Events

None.

### Slots

- **default** — content; a non-property node becomes `Child` when no `Child` prop is set.
- Property elements: `SelectorBarItem.Icon`, `SelectorBarItem.Child`.
- **No slot props.**

### Gotchas

- **No item events.** Clicking/Enter/Space selects through the parent, which raises
  `SelectorBar.SelectionChanged`. To react per item, read `sender.SelectedItem.Text`/`.Tag`.
- Inside a bar the selected state comes from the `ItemsView` controller; writing `IsSelected` later
  is applied to the item model but the bar's `SelectedItem` remains authoritative — drive selection
  with `SelectorBar.SelectedItem`.
- `Icon` strings are converted to `SymbolIcon` (`Icon="Clock"`); an `IconSource`-style object is
  accepted too.
- Selection commits on `PointerReleased` (mouse down/up must stay inside), and a >3 px touch/pen
  movement cancels the press (scroll panning wins).
- `tabindex` comes from the items-view roving controller (`itemContext.tabIndex()`), so only one
  item is in the tab order at a time.

### Minimal SFC

```vue
<template>
  <SelectorBar @SelectionChanged="(sender) => picked = sender.SelectedItem?.Text ?? ''">
    <SelectorBarItem Text="Photos">
      <SelectorBarItem.Icon><SymbolIcon Symbol="Pictures" /></SelectorBarItem.Icon>
    </SelectorBarItem>
    <SelectorBarItem Text="Videos" Icon="Video" />
    <SelectorBarItem Text="Disabled" IsEnabled="False" />
  </SelectorBar>
  <TextBlock :Text="picked" />
</template>

<script setup>
import { ref } from 'vue'
import SelectorBar from '../../components/SelectorBar.vue'
import SelectorBarItem from '../../components/SelectorBarItem.vue'
import SymbolIcon from '../../components/SymbolIcon.vue'
import TextBlock from '../../components/TextBlock.vue'

const picked = ref('')
</script>
```

> The first emitter argument is the sender, so the inline arrow receives it as `$event`; with a
> named method write `function onSelectionChanged(sender, args) {}` and read
> `sender.SelectedItem`.

---

## Pivot

**Import:** `import Pivot from '../../components/Pivot.vue'`

**Purpose:** Classic pivot/tab headers with an animated `PivotItem` presenter: selected-header
carousel, physics-ish fly-in/out transitions, header overflow with previous/next buttons, swipe
selection for touch/pen, and roving header focus.

### Props

- `Title: unknown = null` — title text above the headers.
- `TitleTemplate: unknown = null`.
- `HeaderTemplate: unknown = null` — header template for every item.
- `LeftHeader: unknown = null`, `LeftHeaderTemplate: unknown = null` — left of the header strip.
- `RightHeader: unknown = null`, `RightHeaderTemplate: unknown = null`.
- `ItemsSource: unknown = null` — data array; each entry becomes a `PivotItem` with `Header`/`Content`
  set to the entry.
- `ItemTemplate: unknown = null` — template for `ItemsSource` items.
- `ItemsPanel: unknown = null` — property element is parsed but layout is fixed by the template grid.
- `SelectedIndex: unknown = undefined` — index; `-1` when empty.
- `SelectedItem: unknown = undefined` — item object or container.
- `IsLocked: unknown = false` — blocks user selection (programmatic still works).
- `IsHeaderItemsCarouselEnabled: unknown = true` — `false` gives static headers + nav buttons.
- `HeaderFocusVisualPlacement: unknown = 'ItemHeaders'` — `'ItemHeaders'` or `'SelectedItemHeader'`.
- `IsEnabled: unknown = true`, `IsTabStop: unknown = false` (**declared, unused** — headers compute
  their own roving `tabindex`), `Visibility: unknown = 'Visible'`.
- `Background: unknown = '{ThemeResource PivotBackground}'`, `Foreground: unknown = ''`.
- `Margin: unknown = 0`, `Padding: unknown = 0`.
- `Width/Height/MinWidth/MinHeight/MaxWidth/MaxHeight: unknown = ''`.
- `HorizontalAlignment: unknown = 'Stretch'`, `VerticalAlignment: unknown = 'Stretch'`.
- `FlowDirection: unknown = ''` — `'RightToLeft'` mirrors headers/swipe.
- `RequestedTheme: unknown = 'Default'`, `Opacity: unknown = 1`, `IsHitTestVisible: unknown = true`.

### v-model

- `v-model:SelectedIndex` — reads `update:SelectedIndex`.
- `v-model:SelectedItem` — reads `update:SelectedItem`.

### Events

| Event | `args` |
| --- | --- |
| `SelectionChanged` | `Object.freeze({ RemovedItems: unknown[], AddedItems: unknown[] })` |
| `PivotItemLoading` | `Object.freeze({ Item })` |
| `PivotItemLoaded` | `Object.freeze({ Item })` |
| `PivotItemUnloading` | `Object.freeze({ Item })` |
| `PivotItemUnloaded` | `Object.freeze({ Item })` |

`Loaded`/`Unloaded` are raised immediately after the corresponding `…ing` events (there is no async
work between them in this implementation).

### Slots

- **default** — `PivotItem` children (any other node is ignored).
- Property elements: `Pivot.Items`, `Pivot.ItemTemplate`, `Pivot.ItemsPanel`, `Pivot.Title`,
  `Pivot.TitleTemplate`, `Pivot.HeaderTemplate`, `Pivot.LeftHeader`, `Pivot.LeftHeaderTemplate`,
  `Pivot.RightHeader`, `Pivot.RightHeaderTemplate`.
- **No slot props.**

### Gotchas

- **Items are `PivotItem` children or `ItemsSource`.** A bare non-`PivotItem` child is dropped
  (only nodes typed `PivotItem` are collected when the default slot is used).
- **A `PivotItem`'s content is only mounted after its first selection** (`isLoaded`); the others
  stay unmounted, unlike `TabView` which keeps realized panels alive.
- User selection is blocked when `IsLocked = true` or `PivotItem.IsEnabled = false`; disabled items
  are skipped by keyboard/swipe.
- Swipe selection works for touch/pen only (>8 px horizontal, vertical movement cancels); mouse drag
  does not change selection.
- Keyboard: `ArrowLeft/Right`, `Home`, `End` on a header; `Ctrl+PageUp/PageDown` and
  `Ctrl+Tab/Shift+Tab` at the Pivot root.
- `SelectedIndex` is `-1` until items exist; the first enabled item is selected when items appear.
- Exposed API: `SelectedIndex`, `SelectedItem`, `Items`, `IsLocked`, `IsHeaderItemsCarouselEnabled`,
  `ActualWidth/Height`, `ContainerFromIndex`, `IndexFromContainer`, `Focus()`, plus writable props.
- `HeaderFocusVisualPlacement="SelectedItemHeader"` uses a separate focus-follower outline element.
- `Pivot` does not virtualize; large item counts mean large header DOM.

### Minimal SFC

```vue
<template>
  <Pivot v-model:SelectedIndex="index" Title="Mail" MinHeight="300">
    <PivotItem Header="All">
      <TextBlock Text="All messages" />
    </PivotItem>
    <PivotItem Header="Unread">
      <TextBlock Text="Unread messages" />
    </PivotItem>
    <PivotItem Header="Flagged" :IsEnabled="false">
      <TextBlock Text="Flagged messages" />
    </PivotItem>
  </Pivot>
</template>

<script setup>
import { ref } from 'vue'
import Pivot from '../../components/Pivot.vue'
import PivotItem from '../../components/PivotItem.vue'
import TextBlock from '../../components/TextBlock.vue'

const index = ref(0)
</script>
```

---

## PivotItem

**Import:** `import PivotItem from '../../components/PivotItem.vue'`

**Purpose:** One pivot page: participates in the header strip (via `Header`) and hosts the content
panel that the parent `Pivot` shows/hides.

### Props

- `Header: unknown = null` — header content; also `<PivotItem.Header>`.
- `Content: unknown = null` — panel content; otherwise the default slot.
- `ContentTemplate: unknown = null` — template for `Content`.
- `Background: unknown = '{ThemeResource PivotItemBackground}'`.
- `Foreground: unknown = ''`.
- `Margin: unknown = '{ThemeResource PivotItemMargin}'`, `Padding: unknown = 0`.
- `HorizontalContentAlignment: unknown = 'Stretch'`, `VerticalContentAlignment: unknown = 'Stretch'`.
- `IsEnabled: unknown = true` — disabled items are skipped and cannot be selected by the user.
- `IsTabStop: unknown = false` — makes the item root focusable.
- `Visibility: unknown = 'Visible'` — `'Collapsed'` hides the content host.
- `Width/Height/MinWidth/MinHeight/MaxWidth/MaxHeight: unknown = ''`.
- `HorizontalAlignment: unknown = 'Stretch'`, `VerticalAlignment: unknown = 'Stretch'`.
- `Opacity: unknown = 1`, `IsHitTestVisible: unknown = true`.
- `AccessKey: unknown = ''` — exposed through the header button's `accesskey`.

### v-model

None (no emits). Writes are routed to the parent through `owner.setProperty`, so
`item.Header = 'New'` / `item.IsEnabled = false` work from a handler for `Header`, `IsEnabled` and
`AccessKey`.

### Events

None.

### Slots

- **default** — the item content.
- Property elements: `PivotItem.Header`, `PivotItem.Content`, `PivotItem.ContentTemplate`.
- **No slot props.**

### Gotchas

- Only `Header`, `IsEnabled` and `AccessKey` overrides propagate back to the parent's header
  (`setProperty` ignores anything else).
- Content renders **only after the item has been selected at least once**; before that
  `ContentOutlet` returns `null`.
- The item is re-keyed/cloned by `Pivot`, so do not rely on its own DOM position; the parent owns
  the panel wrapper (`role="tabpanel"`, `aria-labelledby`).
- `IsEnabled="False"` removes the item from keyboard/swipe traversal without removing its header.
- Exposed: all props, `ActualWidth/Height`, `Focus()`, `InvokeAccessKey()`.

### Minimal SFC

```vue
<template>
  <Pivot>
    <PivotItem>
      <PivotItem.Header>Inbox</PivotItem.Header>
      <TextBlock Text="Inbox content" />
    </PivotItem>
    <PivotItem Header="Archive" Content="Archived messages" />
  </Pivot>
</template>

<script setup>
import Pivot from '../../components/Pivot.vue'
import PivotItem from '../../components/PivotItem.vue'
import TextBlock from '../../components/TextBlock.vue'
</script>
```

---

## BreadcrumbBar

**Import:** `import BreadcrumbBar from '../../components/BreadcrumbBar.vue'`

**Purpose:** Navigation breadcrumb that measures items, collapses the overflow into an ellipsis
button (index `-1`) and presents the hidden ancestors in a bottom-anchored `Flyout` in reverse
order. Emits `ItemClicked` for the clicked ancestor.

### Props

- `ItemsSource: String|Array|Object = null` — array, iterable, or collection exposing
  `Count`/`GetAt`; **the only item source**.
- `ItemTemplate: String|Object|Function = undefined` — DataTemplate / VNode / component used per
  item; typically `<BreadcrumbBar.ItemTemplate>`.
- `IsEnabled: String|Boolean = true`.
- `FlowDirection: String = ''` — `'LeftToRight'`/`'RightToLeft'`; empty inherits the measured
  parent direction.
- `Width: String|Number = ''`, `Height: String|Number = ''`.
- `MinWidth: String|Number = 0`, `MinHeight: String|Number = 0`.
- `MaxWidth: String|Number = ''`, `MaxHeight: String|Number = ''`.
- `Margin: String|Number = ''`.
- `HorizontalAlignment: String = 'Stretch'`, `VerticalAlignment: String = 'Stretch'`.
- `Visibility: String = 'Visible'`.

### v-model

`update:ItemsSource`, `update:ItemTemplate`, `update:IsEnabled`, `update:FlowDirection` — emitted
when you assign through the exposed API. Mutating the bound array in place does **not** emit; the
component deep-watches `Items` for rendering.

### Events

| Event | `args` |
| --- | --- |
| `ItemClicked` | `Object.freeze({ Item, Index })` — `Index` is the index in `ItemsSource` (dropdown entries keep their original index). |
| `update:ItemsSource` etc. | the assigned value |

The **last** item is the current page: it renders as static text and does not raise `ItemClicked`.
Clicking the ellipsis opens the flyout instead of raising an event.

### Slots

- **default** — not used for items; only an `<BreadcrumbBar.ItemTemplate>` marker is read from it.
- Property element: `BreadcrumbBar.ItemTemplate`.
- **No slot props.**

### Gotchas

- **Items must come from `ItemsSource`.** Children rendered directly in the default slot are ignored
  (that slot is only scanned for the `ItemTemplate` marker). A plain **string** is iterable, so it
  would be expanded one crumb per character — always pass an array/collection.
- The overflow ellipsis (`index === -1`) is automatic and only rendered when the measured total width
  exceeds the available width; the hidden items are shown in a `Flyout` at `Placement="Bottom"` with
  `ShouldConstrainToRootBounds="False"`, reversed, and reuse the same template/`ItemClicked`.
- The typical handler mutates the array in place to "navigate":
  `for (let i = items.length - 1; i >= args.Index + 1; i--) items.splice(i, 1)`
  (exactly `BreadcrumbBarPage.vue`), because `sender.ItemsSource` is your own array.
- Measurement runs through a `ResizeObserver` + `requestAnimationFrame`; it also re-measures on
  `document.fonts.ready`, so the first paint can show all items before the ellipsis appears.
- Focus is roving across items and the ellipsis; `ArrowLeft`/`ArrowRight` follow the flow direction;
  in the flyout `ArrowUp/Down/Home/End` move between entries.
- Exposed API: `Element`, `ItemsSource`, `ItemTemplate`, `IsEnabled`, `FlowDirection`, `Focus()`.

### Minimal SFC

```vue
<template>
  <BreadcrumbBar :ItemsSource="folders" @ItemClicked="onItemClicked">
    <BreadcrumbBar.ItemTemplate>
      <DataTemplate>
        <BreadcrumbBarItem Content="{x:Bind Name, Mode=OneWay}" />
      </DataTemplate>
    </BreadcrumbBar.ItemTemplate>
  </BreadcrumbBar>
</template>

<script setup>
import { ref } from 'vue'
import BreadcrumbBar from '../../components/BreadcrumbBar.vue'
import BreadcrumbBarItem from '../../components/BreadcrumbBarItem.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const folders = ref([
  { Name: 'Home' },
  { Name: 'Documents' },
  { Name: 'Design' },
  { Name: 'Northwind' }
])

function onItemClicked (sender, args) {
  // Last item is the current page (no event); trim everything after the clicked ancestor.
  for (let index = folders.value.length - 1; index >= args.Index + 1; index -= 1) folders.value.splice(index, 1)
}
</script>
```

---

## BreadcrumbBarItem

**Import:** `import BreadcrumbBarItem from '../../components/BreadcrumbBarItem.vue'`

**Purpose:** One crumb inside a `BreadcrumbBar.ItemTemplate`. Its behaviour is driven by the
parent's injected context — `Inline`, `LastItem` (current page), `Ellipsis` (`…` button) or
`EllipsisDropDown` (entry inside the overflow flyout). Renders a real `Button` plus a chevron.

### Props

- `Content: unknown = undefined` — crumb content (string → `TextBlock`).
- `ContentTemplate: unknown = undefined` — template for `Content`.
- `IsEnabled: Boolean|String = true`.
- `FlowDirection: String = ''` — `'RightToLeft'` mirrors the chevron.
- `Background: String|Object = ''`.
- `BorderBrush: String|Object = ''`, `BorderThickness: String|Number = 0`.
- `Foreground: String|Object = ''`.
- `FontFamily: String = ''`, `FontSize: String|Number = ''`, `FontWeight: String|Number = 'Normal'`.
- `CornerRadius: String|Number = ''`.
- `HorizontalAlignment: String = 'Stretch'`, `VerticalAlignment: String = 'Center'`.
- `HorizontalContentAlignment: String = 'Stretch'`, `VerticalContentAlignment: String = 'Center'`.
- `Width: String|Number = ''`, `Height: String|Number = ''`.
- `MinWidth: String|Number = 0`, `MinHeight: String|Number = 0`.
- `MaxWidth: String|Number = ''`, `MaxHeight: String|Number = ''`.
- `Margin: String|Number = ''`, `Visibility: String = 'Visible'`.
- `IsTabStop: Boolean|String = true` — roving tabindex participation.

### v-model

`update:Content`, `update:ContentTemplate`, `update:IsEnabled`, `update:FlowDirection`.

### Events

| Event | `args` |
| --- | --- |
| `GotFocus` | `(sender, FocusEvent)` |
| `KeyDown` | `(sender, KeyboardEvent)` |

> `GotFocus`/`KeyDown` pass the raw DOM event as the second argument (not a XAML args object).
> Activation itself is not an event here — the parent `BreadcrumbBar` raises `ItemClicked`.

### Slots

- **default** — content (or `<BreadcrumbBarItem.ContentTemplate>`).
- Property element: `BreadcrumbBarItem.ContentTemplate`.
- **No slot props.**

### Gotchas

- **Only meaningful inside a `BreadcrumbBar.ItemTemplate`.** Without the injected context it renders
  with `type === undefined` (no chevron, no activation) and clicking does nothing.
- The parent decides everything visual-state-related: current item ⇒ static `ContentPresenter`
  (no button), ellipsis ⇒ `…` glyph (`E712`), dropdown ⇒ stretched flyout row.
- `IsTabStop="False"` only removes it from the roving tabindex; the root stays a `role="button"`
  div.
- Hover/press visuals are applied only for `EllipsisDropDown` items; inline crumbs rely on the
  inner `Button`.
- `ContentTemplate` accepts a `DataTemplate` (typical), a VNode array, or a resource-reference
  string such as `'{StaticResource MyTemplate}'` (a bare key string is not resolved).
- Exposed: `Element`, `Content`, `ContentTemplate`, `IsEnabled`, `FlowDirection`, `Focus()`.

### Minimal SFC

```vue
<template>
  <BreadcrumbBar :ItemsSource="folders" @ItemClicked="onItemClicked">
    <BreadcrumbBar.ItemTemplate>
      <DataTemplate>
        <BreadcrumbBarItem>
          <BreadcrumbBarItem.ContentTemplate>
            <DataTemplate>
              <TextBlock Text="{x:Bind Name, Mode=OneWay}" />
            </DataTemplate>
          </BreadcrumbBarItem.ContentTemplate>
        </BreadcrumbBarItem>
      </DataTemplate>
    </BreadcrumbBar.ItemTemplate>
  </BreadcrumbBar>
</template>

<script setup>
import { ref } from 'vue'
import BreadcrumbBar from '../../components/BreadcrumbBar.vue'
import BreadcrumbBarItem from '../../components/BreadcrumbBarItem.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const folders = ref([{ Name: 'Home' }, { Name: 'Documents' }, { Name: 'Images' }])
const onItemClicked = (sender, args) => { console.log(args.Index, args.Item) }
</script>
```

---

## Cross-control cheat sheet

| Need | Use |
| --- | --- |
| Tabbed documents, user can add/close/drag | `TabView` + `TabViewItem` (`AddTabButtonClick`, `TabCloseRequested`, `TabItemsChanged`) |
| Segmented "page switcher" with pill indicator | `SelectorBar` + `SelectorBarItem` (`SelectionChanged`, no item events) |
| Large touch-friendly tabs with swipe | `Pivot` + `PivotItem` (`SelectionChanged`, `PivotItemLoaded`) |
| Command bar with overflow | `CommandBar` (+ `AppBarButton`/`AppBarToggleButton`/`AppBarSeparator`) |
| Context/command menu on a target | `CommandBarFlyout.ShowAt(target, { ShowMode })` |
| Classic menu bar | `MenuBar` + `MenuBarItem` (hosts an internal `MenuFlyout`) |
| Dropdown menu on a button | `MenuFlyout` inside `<Button.Flyout>` / `<AppBarButton.Flyout>`, or `ShowAt` |
| Arbitrary lightweight popup / confirm dialog | `Flyout` inside `<Button.Flyout>`, or `ShowAt` |
| Breadcrumb path with overflow ellipsis | `BreadcrumbBar` (+ `BreadcrumbBarItem` in `ItemTemplate`) |

### Shared flyout infrastructure

- `Button` and `RichEditBox` `provide('buttonFlyoutAnchor', …)` and
  `provide('buttonFlyoutController', …)`; `Flyout`, `MenuFlyout` and `CommandBarFlyout` inject them,
  bind the anchor's `click` and publish their API back into the button's `Flyout` property.
- `AppBarButton` resolves its `Flyout` property node, advertises a chevron / `aria-haspopup` and
  **toggles** on click.
- All flyouts register with `registerFlyoutInputRegion` and broadcast `winui-flyout-opening` on
  `window`, which is how opening one closes another while nested submenus stay open.
- `resolvePopupElement` accepts an `HTMLElement`, a component ref exposing `$el`/`Element`, or a
  plain `{ value }` wrapper — so `flyout.ShowAt(anyControlRef)` works for every control in this file.
