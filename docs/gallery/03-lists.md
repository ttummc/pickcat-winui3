# 03 — Lists, Items & Scrolling

Reference for the list / item-host / scroller family of **WinUIonWeb**.
Everything below is transcribed from the component sources, not from WinUI docs.
Prop casing is **exactly** the casing in the source (`ItemsSource`, `ItemTemplate`,
`SelectedIndex`, …); Vue templates must use those exact names (`:ItemsSource="…"`, not `items-source`).

Sources read for this page:

| Control | Source |
| --- | --- |
| ListView | `src/components/ListView.vue` |
| GridView | `src/components/GridView.vue` |
| ItemsRepeater | `src/components/ItemsRepeater.vue` |
| ItemsControl | `src/components/ItemsControl.vue` |
| ItemContainer | `src/components/ItemContainer.vue` |
| ListBox | `src/components/ListBox.vue` |
| ScrollView | `src/components/ScrollView.vue` |
| ScrollViewer | `src/components/ScrollViewer.vue` |
| RefreshContainer | `src/components/RefreshContainer.vue` + `src/components/refreshRuntime.ts` |
| RefreshVisualizer | `src/components/RefreshVisualizer.vue` |
| PipsPager | `src/components/PipsPager.vue` |
| FlipView | `src/components/FlipView.vue` |
| VariableSizedWrapGrid | `src/components/VariableSizedWrapGrid.vue` |

Gallery demos: `src/gallery/pages/ListViewPage.vue`, `GridViewPage.vue`,
`ItemsRepeaterPage.vue`, `ListBoxPage.vue`, `ScrollViewPage.vue`,
`ScrollViewerPage.vue`, `PullToRefreshPage.vue`, `PipsPagerPage.vue`,
`FlipViewPage.vue`, `VariableSizedWrapGridPage.vue`, `ItemsViewPage.vue`.

---

## 0. Read this first — how items and item templates actually work

This library is a **XAML renderer on Vue**. It does *not* expose a Vue scoped item
slot. Five facts drive every snippet below.

### 0.1 Item sources are plain arrays

`ItemsSource` accepts a plain JS array of anything (objects, strings, numbers).
Every list control reduces the source to an array before rendering:

* `ListView` / `GridView` / `ListBox` / `FlipView` / `ItemsRepeater`: `Array.isArray(source) ? source : …`
* An **object** source is *not* iterated. `ListView`/`GridView` only additionally
  understand a `CollectionGroups` / `Groups` shape for grouping.
* **The array must be reactive** (`ref`/`reactive`). Every control either iterates it
  during render (`v-for`) or slices it in a watcher, so `push` / `splice` / reassignment
  all update a reactive array. A plain module-level array is rendered once and never
  updates again.
* `ListView` is the only control with a **deep** watcher (`watch(items, …, { deep: true })`,
  used for its insert/remove position animations), so it also re-syncs when an item's
  own properties change. For the others, prefer replacing the array
  (`rows.value = [...rows.value, x]`) or the item (`rows.value[0] = { ...row, Name: 'x' }`).

### 0.2 There is **no** scoped item slot — the item template is a *property element*

`ListView`, `GridView`, `ListView.ItemTemplate`-style markup is the XAML property
element form. `<ListView.ItemTemplate>` and `<DataTemplate>` are **not** Vue slots
with slot props; the collection control pulls the VNodes out of its default slot
(`getCollectionProperty()` → `itemTemplate`), then re-clones that VNode tree **once
per item** with the item as data context (`materializeXamlVNode`).

Consequence: **there is no `#item="{ item }"` slot anywhere in this library.**

### 0.3 How you read an item in the template: `{x:Bind PropName}` (no destructuring)

When a template is materialized for an item, `xamlRuntime.ts` builds the binding scope:

```js
const itemScope = { item, Item: item }
Object.assign(itemScope, item)        // ← the item's own property names
```

So inside `<DataTemplate>` **all of the item's own property names are top-level
identifiers**:

| Write this | Resolves to |
| --- | --- |
| `Text="{x:Bind Name}"` | `item.Name` |
| `Text="{x:Bind item.Name}"` | `item.Name` |
| `Text="{x:Bind Item}"` | the item object itself |
| `Text="{x:Bind}"` (empty path, `x:DataType="x:String"`) | the item itself (e.g. a string) |
| `Text="{x:Bind Num.ToString()}"` | `String(item.Num)` |
| `Source="{x:Bind ImageLocation}"` | `item.ImageLocation` |
| `Click="deleteItem"` | a handler resolved from the *page* scope, called with `(sender, args)`; `sender.DataContext` is the item |

There is no `v-slot` destructuring to do — `{x:Bind Title}` **is** the destructuring.
Deep paths work (`{x:Bind Owner.Name}`), as do `{Binding …}` and the binding
modifiers `Mode=OneWay|TwoWay`, `Path=`, converters, and `({x:Bind x})`-style casts.

### 0.4 Two ways to feed page-level values into these props

| Form | Works when |
| --- | --- |
| `:ItemsSource="rows"` (Vue binding) | **always** — preferred, and the only reliable form in a component that is not named `…Page` |
| `ItemsSource="{x:Bind rows, Mode=OneWay}"` (XAML string) | only when the owning component's `__name` ends in `Page` (or is one of `GalleryItemsGrid`, `HomeHeaderTile`, `PageHeader`, `TabContentSampleControl`). That is the `isGalleryScope()` filter in `xamlRuntime.ts`; **a component's own setup state is never a binding scope for itself.** |

A bare string without braces is a **literal**, not a binding:
`ItemsSource="rows"` renders the string `"rows"`, i.e. an empty list.

### 0.5 Virtualization / sizing at a glance

| Control | Virtualizes | Needs an explicit `Height`? |
| --- | --- | --- |
| **ListView** | ❌ no — `v-for` over every item | ✅ yes to scroll internally; `height:100%` + auto-height parent = grows to content |
| **GridView** | ❌ no | ✅ yes; default CSS is `height:auto` (content-sized) |
| **ListBox** | ❌ no | ✅ yes |
| **FlipView** | ❌ no (all pages in a translated track) | ✅ yes — `min-height:1px`, collapses to content without it |
| **ItemsRepeater** | ✅ **yes, only when `ItemsSource.length > 120`** (`VIRTUALIZE_THRESHOLD`) | ❌ no — sizes itself to the layout extent |
| **ItemsControl** | ❌ no | ❌ (no scroller at all) |
| **ItemContainer** | n/a | ❌ |
| **VariableSizedWrapGrid** | ❌ no | ❌ but `Height`/`MaximumRowsOrColumns` bound the rows |
| **ScrollView / ScrollViewer** | ❌ no (they host, don't virtualize) | ✅ yes (`Height` or `MaxHeight`) or they grow |

---

## ListView

**Import** — `import ListView from '../../components/ListView.vue'` (package: `import { ListView } from 'winuionweb'`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `unknown[] \| string` | `[]` | Data array. Objects/strings/numbers. |
| `ItemTemplate` | `unknown` | `undefined` | `"{StaticResource Key}"`, a `DataTemplate` VNode, or an `<ListView.ItemTemplate>` property element. **Render functions are not supported.** |
| `SelectionMode` | `'None' \| 'Single' \| 'Multiple' \| 'Extended' \| string` | `'Single'` | `Multiple` shows per-row checkboxes; `Extended` adds ctrl/shift range selection; `None` disables selection. |
| `SelectedIndex` | `number \| string` | `undefined` | Selected row index; `-1` clears. Read back reactively, so `v-model:SelectedIndex` works. |
| `SelectedItem` | `unknown \| string` | `undefined` | Selected object. Takes precedence over `SelectedIndex` when both are set. |
| `SelectedItems` | `unknown[] \| string` | `undefined` | Multi-selection array. |
| `IsItemClickEnabled` | `boolean \| string` | `false` | Required for `ItemClick` to fire. |
| `IsGrouped` | `boolean \| string` | `undefined` | Force grouping. Auto-detects when every item has an `Items` array. |
| `AreStickyGroupHeadersEnabled` | `boolean \| string` | `false` | Sticky group headers (also settable on `<ItemsStackPanel>` inside `<ListView.ItemsPanel>`). |
| `CanDrag` | `boolean \| string` | `false` | Alias that also enables item dragging. |
| `CanDragItems` | `boolean \| string` | `false` | Items can be dragged out. |
| `CanReorderItems` | `boolean \| string` | `false` | Items can be reordered in place. |
| `AllowDrop` | `boolean \| string` | `false` | Accept drops from another list. |
| `ItemContainerStyle` | `ListViewItemStyle \| string` | `{}` | Object of `Height/MinHeight/Width/MinWidth/Margin/Padding/Background/BorderBrush/BorderThickness/CornerRadius/HorizontalContentAlignment/VerticalContentAlignment`; also `<ListView.ItemContainerStyle>` with `<Style TargetType="ListViewItem"><Setter …/></Style>`. |
| `IsEnabled` | `boolean \| string` | `true` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` | Numbers become `px`. |
| `Margin` `Padding` | `string \| number` | `''` | XAML thickness strings (`"1,2,3,4"` = left,top,right,bottom). |
| `Background` | `string \| object` | `''` | Brush colour or acrylic object. |
| `BorderBrush` | `string` | `''` | |
| `BorderThickness` | `string \| number` | `''` | Set this (e.g. `1`) to get a border. |
| `CornerRadius` | `string \| number` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `undefined` | `Left/Center/Right/Stretch`, `Top/Center/Bottom/Stretch`. |

### v-model

`v-model:SelectedIndex`, `v-model:SelectedItem`, `v-model:SelectedItems`, and
`v-model:ItemsSource` (the last one updates after an internal reorder).

### Slots & slot props

| Slot | Props | Notes |
| --- | --- | --- |
| default | none | Holds XAML property elements only. Non-property children are ignored by the list. |
| `<ListView.ItemTemplate>` | — | The item template. Body scope = item's own property names + `item` / `Item` (§0.3). |
| `<ListView.Header>` | — | One header rendered above all groups. |
| `<ListView.GroupStyle>` → `<GroupStyle.HeaderTemplate>` | — | Group header template; scope = the group (`{x:Bind Key}`). |
| `<ListView.ItemsPanel>` → `<ItemsPanelTemplate><ItemsStackPanel …/></ItemsPanelTemplate>` | — | Read for `VerticalAlignment="Bottom"`, `ItemsUpdatingScrollMode="KeepLastItemInView"`, `AreStickyGroupHeadersEnabled`. |
| `<ListView.ItemContainerStyle>` | — | `<Style TargetType="ListViewItem"><Setter Property="…" Value="…"/></Style>` |
| `<ListView.Resources>` | — | Local resource dictionary (`x:Key` accessible to siblings). |

### Events

All handlers are called as **`(sender, args)`**. `sender` is the list's public API:
`Element` (HTMLElement), `ItemsSource` (array, writable), `SelectedIndex`
(number, writable), `ItemTemplate`, plus the semantic-zoom view members
(`SemanticZoomOwner`, `IsActiveView`, `IsZoomedInView`, `MakeVisible(location)`,
`InitializeViewChange`, `StartViewChangeFrom`, `StartViewChangeTo`,
`CompleteViewChangeFrom`, `CompleteViewChangeTo`, `CompleteViewChange`,
`CanHorizontallyScroll`, `CanVerticallyScroll`). There is no `ScrollIntoView` on the
ListView sender (GridView's sender additionally exposes `ScrollIntoGroup`). Note
`sender.SelectedItems` is **not** exposed — use the event args.

| Event | Payload `args` |
| --- | --- |
| `SelectionChanged` | `{ AddedItems, RemovedItems, SelectedItems }` (no `SelectedIndex`/`SelectedItem` keys) |
| `ItemClick` | `{ ClickedItem, OriginalSource }` — only when `IsItemClickEnabled` |
| `ContainerContentChanging` | `{ Item, ItemIndex, ItemContainer, InRecycleQueue: false, Phase: 0, Handled: false }` — raised as each container is created; `ItemContainer` has `Element`, `Content`, `DataContext`, `ItemIndex`, `IsSelected` (settable), `ContextFlyout` |
| `DragItemsStarting` | `{ Items, OriginalSource }` |
| `DragOver` | `{ DataTransfer: null, AcceptedOperation: 'Move', OriginalSource }` |
| `Drop` | `{ DataTransfer: null, AcceptedOperation: 'Move', InsertIndex, Items, OriginalSource }` |
| `DragItemsCompleted` | `{ Items, DropResult, OriginalSource }` |
| `update:SelectedIndex` / `update:SelectedItem` / `update:SelectedItems` / `update:ItemsSource` | the new value |

`Loaded` is declared in `defineEmits` but never raised by the implementation.

### Gotchas

1. **No virtualization.** Every item is a `.win-list-item` in the DOM.
2. **Set `Height`.** `.win-list-view` is `height:100%`; with an auto-height parent it
   grows to fit all rows and only the page scrolls. `Height="400"` gives an internal
   ScrollViewer; `MaxHeight` also works.
3. Rows have `min-height: var(--ListViewItemMinHeight, 40px)` and `4px` horizontal
   content margin — templates that look cramped are being inset by the presenter, not clipped.
4. Item identity for DOM reuse comes from `item.Key ?? item.Id ?? object identity`
   (`keysForItems`). Give objects a stable `Key`/`Id` if you reorder or filter, or
   rows will be recreated.
5. With **no `ItemTemplate`** an object item renders as `String(item)` → `[object Object]`.
6. Selection commits on **pointer-up inside the row** (pressing and dragging away
   does not select). With `SelectionMode="Extended"` the modifier rules are
   ctrl/shift as in WinUI; `Multiple` toggles per click and shows a checkbox.
7. Only arrays are accepted — a `CollectionViewSource`-like object or an
   `ObservableVector` is not iterated.
8. `ItemTemplate` given as a string must be a `{StaticResource Key}` marker or a
   `{Binding …}`/`{x:Bind …}` expression, never a bare path.

### Minimal working SFC

```vue
<template>
  <ListView
    :ItemsSource="rows"
    SelectionMode="Single"
    Height="320"
    BorderThickness="1"
    BorderBrush="var(--ctrl-border)"
    v-model:SelectedIndex="picked"
    @SelectionChanged="(sender, args) => console.log(sender.SelectedIndex, args.SelectedItems)"
  >
    <ListView.ItemTemplate>
      <DataTemplate>
        <StackPanel Padding="8">
          <TextBlock Text="{x:Bind Name}" />
          <TextBlock Text="{x:Bind Company}" Foreground="var(--text-secondary)" />
        </StackPanel>
      </DataTemplate>
    </ListView.ItemTemplate>
  </ListView>
</template>

<script setup>
import { ref } from 'vue'
import ListView from '../../components/ListView.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const rows = ref([
  { Key: 1, Name: 'Kendall Collins', Company: 'Adatum Corporation' },
  { Key: 2, Name: 'Henry Ross', Company: 'Adventure Works Cycles' }
])
const picked = ref(0)
</script>
```

> `DataTemplate` (and `StackLayout`, `UniformGridLayout`, `ItemsWrapGrid`,
> `X.ItemTemplate`, `X.ItemsPanel`, …) are registered globally by
> `app.use(WinUIonWeb)`. If you only import components individually, also import
> `DataTemplate` from `src/components/CollectionProperties` — that is exactly what
> `ListBoxPage.vue` and `PipsPagerPage.vue` do.

---

## GridView

**Import** — `import GridView from '../../components/GridView.vue'` (package: `{ GridView }`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `string \| Array \| Object` | `null` | Data array (or `{ Groups: [...] }`). |
| `ItemTemplate` | `string \| Object` | `''` | `"{StaticResource Key}"`, a `DataTemplate` VNode, or `<GridView.ItemTemplate>`. |
| `SelectionMode` | `string` | `undefined` (treated as `'Single'`) | `None/Single/Multiple/Extended`. |
| `SelectedIndex` | `number \| string` | `undefined` | |
| `SelectedItem` | `unknown` | `undefined` | |
| `SelectedItems` | `string \| Array` | `undefined` | |
| `IsItemClickEnabled` | `boolean \| string` | `undefined` | Needed for `ItemClick`. |
| `IsGrouped` | `boolean \| string` | `undefined` | |
| `CanDragItems` | `boolean \| string` | `undefined` | |
| `CanReorderItems` | `boolean \| string` | `undefined` | |
| `AllowDrop` | `boolean \| string` | `undefined` | |
| `FlowDirection` | `string` | `'LeftToRight'` | `RightToLeft` reverses cell order. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` | |
| `Margin` `Padding` | `string \| number` | `''` | Padding defaults to `0 0 10px` when empty. |
| `Background` | `string \| object` | `''` | |
| `BorderBrush` | `string` | `''` | |
| `BorderThickness` | `string \| number` | `''` | |
| `CornerRadius` | `string \| number` | `''` | |
| `ScrollViewer.IsHorizontalScrollChainingEnabled` | `boolean \| string` | `true` | Passed through to the inner ScrollViewer. |

**There is no `ItemWidth` / `ItemHeight` prop on GridView.** Cell size comes from
the `ItemsWrapGrid` inside `<GridView.ItemsPanel>` (see below), or from the
template's own `Width`/`Height`, or from `ItemContainerStyle` margins.

### Cell sizing / item-width props (the real answer)

```vue
<GridView.ItemsPanel>
  <ItemsPanelTemplate>
    <ItemsWrapGrid
      Orientation="Horizontal"
      ItemWidth="200"
      ItemHeight="140"
      MaximumRowsOrColumns="4"
    />
  </ItemsPanelTemplate>
</GridView.ItemsPanel>
```

`ItemsWrapGrid` is read by `GridView.vue` for:

* `ItemWidth` / `ItemHeight` → fixed cell box (`--GridViewItemWidth` / `--GridViewItemHeight`;
  default `max-content`/`auto`, i.e. content-sized).
* `MaximumRowsOrColumns` → when `> 0` the panel becomes a CSS grid with exactly that
  many tracks; otherwise it is a wrapping flex line.
* `Orientation` → `Horizontal` (default, fills rows first) or `Vertical` (fills columns first).

Spacing: the default item container margin is `0 4px 4px 0`; override it with
`<GridView.ItemContainerStyle><Style TargetType="GridViewItem"><Setter Property="Margin" Value="0 12 12 0"/></Style></GridView.ItemContainerStyle>`.
Do **not** also set a panel gap — the panel has `column-gap/row-gap: 0` on purpose.

### v-model

`v-model:SelectedIndex`, `v-model:SelectedItem`, `v-model:SelectedItems`, `v-model:ItemsSource`.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | property elements only |
| `<GridView.ItemTemplate>` | item template; item scope per §0.3 |
| `<GridView.ItemsPanel>` → `<ItemsPanelTemplate><ItemsWrapGrid/></ItemsPanelTemplate>` | sizing/wrapping |
| `<GridView.ItemContainerStyle>` | `<Style TargetType="GridViewItem"><Setter Property="Margin" Value="…"/></Style>` |
| `<GridView.GroupStyle>` / `<GridView.Items>` / `<GridView.Resources>` | grouping, inline items, local resources |

### Events

`(sender, args)`, `sender` = component public proxy (`ScrollIntoGroup(index)` plus the
semantic-zoom view members; it does not expose `SelectedItems`).

| Event | Payload `args` |
| --- | --- |
| `SelectionChanged` | `{ AddedItems, RemovedItems, SelectedItems, SelectedItem, SelectedIndex, OriginalSource }` |
| `ItemClick` | `{ ClickedItem, OriginalSource }` |
| `DragItemsStarting` | `{ Items, OriginalSource }` |
| `DragOver` | `{ DataTransfer: null, AcceptedOperation: 'Move', OriginalSource }` |
| `Drop` | `{ DataTransfer: null, AcceptedOperation: 'Move', InsertIndex, Items, OriginalSource }` |
| `DragItemsCompleted` | `{ Items, DropResult, OriginalSource }` |
| `update:SelectedIndex` / `update:SelectedItem` / `update:SelectedItems` / `update:ItemsSource` | new value |

No `Loaded` / `ContainerContentChanging` on GridView.

### Gotchas

1. **No virtualization** — all cells are rendered.
2. `height: auto` by default: give `Height` (or a `*`-sized grid row) to get an
   internal scroller; otherwise the GridView expands and the page scrolls.
3. **Pass a reactive array.** `ItemsSource` is copied into an internal `internalItems`
   through `watch(() => items.value.slice())`; a non-reactive array renders once and
   never updates. `push`/reassignment on a `ref` array both work.
4. Items without a template render `String(item)`.
5. Default container margin is `0 4px 4px 0`; the last column therefore looks
   "short" unless you account for it or override it. There is **no
   `ItemContainerStyle` prop** on GridView — spacing/box changes go through the
   `<GridView.ItemContainerStyle>` property element.
6. `ItemTemplate` accepts only `string | Object` — a function is ignored.
7. `IsItemClickEnabled` gates `ItemClick`; selection still works without it.

### Minimal working SFC

```vue
<template>
  <GridView :ItemsSource="tiles" Height="360" SelectionMode="Multiple" IsItemClickEnabled="True"
            v-model:SelectedItems="picked" @ItemClick="(s, a) => log = a.ClickedItem.Title">
    <GridView.ItemTemplate>
      <DataTemplate>
        <Grid Width="96" Height="96" Background="var(--accent-base)">
          <TextBlock Text="{x:Bind Title}" HorizontalAlignment="Center" VerticalAlignment="Center" />
        </Grid>
      </DataTemplate>
    </GridView.ItemTemplate>
    <GridView.ItemsPanel>
      <ItemsPanelTemplate>
        <ItemsWrapGrid Orientation="Horizontal" ItemWidth="112" ItemHeight="112" MaximumRowsOrColumns="4" />
      </ItemsPanelTemplate>
    </GridView.ItemsPanel>
  </GridView>
</template>

<script setup>
import { ref } from 'vue'
import GridView from '../../components/GridView.vue'
import Grid from '../../components/Grid.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate, ItemsPanelTemplate, ItemsWrapGrid } from '../../components/CollectionProperties'

const tiles = ref([{ Title: 'One' }, { Title: 'Two' }, { Title: 'Three' }])
const picked = ref([])
const log = ref('')
</script>
```

---

## ItemsRepeater

**Import** — `import ItemsRepeater from '../../components/ItemsRepeater.vue'` (package: `{ ItemsRepeater }`).

The only control here that **actually virtualizes**.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `string \| Array \| Object` | `null` | Array, iterable, or `{ Count, GetAt }` shaped object. |
| `ItemTemplate` | `string \| Object \| Function` | `undefined` | `"{StaticResource Key}"`, `DataTemplateSelector` name, a `DataTemplate` VNode, or `<ItemsRepeater.ItemTemplate>`. (A function is accepted by the type but not invoked — use the template forms.) |
| `Layout` | `string \| Object` | `{ Type: 'StackLayout' }` | `"{StaticResource Key}"` or `<ItemsRepeater.Layout><StackLayout/></ItemsRepeater.Layout>`. |
| `HorizontalCacheLength` | `string \| number` | `2` | Viewport multiples cached horizontally (virtualization buffer). |
| `VerticalCacheLength` | `string \| number` | `2` | Viewport multiples cached vertically. |
| `Background` | `string \| object` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |
| `Margin` | `string \| number` | `''` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `undefined` | Usually omitted — the repeater sizes to the layout extent. |
| `Visibility` | `string` | `'Visible'` | |

Layout objects and their props (from `repeaterLayouts.ts`):

| Layout | Props |
| --- | --- |
| `StackLayout` | `Orientation` (`Vertical` default / `Horizontal`), `Spacing` |
| `UniformGridLayout` | `Orientation` (`Horizontal` default), `MinItemWidth`, `MinItemHeight`, `MinRowSpacing`, `MinColumnSpacing`, `MaximumRowsOrColumns`, `ItemsJustification` (`Start` default) |
| `ActivityFeedLayout` | `MinItemSize` (`"80, 108"`), `RowSpacing`, `ColumnSpacing` |
| `LinedFlowLayout`, `VariedImageSizeLayout` | see `repeaterLayouts.ts` |

### v-model

None.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | property elements (`ItemTemplate`, `Layout`) |
| `<ItemsRepeater.ItemTemplate>` | item template, item scope per §0.3 |
| `<ItemsRepeater.Layout>` | layout object element |

### Events — **single argument**, not `(sender, args)`

`dispatch(name, args)` → `emit(name, args)`.

| Event | Payload |
| --- | --- |
| `ElementPrepared` | `{ Element, Index }` (HTMLElement) |
| `ElementClearing` | `{ Element }` |
| `ElementIndexChanged` | `{ Element, OldIndex, NewIndex }` |
| `GettingFocus` | `{ OldFocusedElement, NewFocusedElement, OriginalSource }` (settable `NewFocusedElement`) |
| `KeyDown` | `{ Key, Handled, OriginalSource, NativeEvent }` (set `Handled = true` to consume) |

### Exposed API (`ref` on the component)

`ItemsSourceView`, `ItemsSource`, `ItemTemplate`, `Layout`, `MaxWidth`,
`GetElementIndex(element)`, `TryGetElement(index)`, `GetOrCreateElement(index)`
(throws `RangeError` when out of range).

### Gotchas

1. **Virtualization only kicks in above 120 items** (`VIRTUALIZE_THRESHOLD`). Below
   that every item is realized.
2. The realization window comes from the **nearest scrolling ancestor**
   (`.win-scroll-viewer-viewport` / `.win-scroll-presenter`). A repeater outside a
   scroller realizes only the first 120 items.
3. It sets its own `height` to the layout extent — do **not** wrap it in a fixed-height
   box unless you also give the scroller the height.
4. Two measure passes + a `ResizeObserver` settle pass run on every template/layout
   change; templates whose size changes later (nested repeaters) settle one frame late.
5. Primitive items are keyed `index:value` — duplicate strings still produce distinct
   wrappers. Object items are keyed by identity (or by `KeyFromIndex` when the source
   provides it).
6. Inside an item template, a nested collection control's own bindings are resolved
   against the current item (`ItemsSource="{x:Bind CategoryItems}"` works — see
   `ItemsRepeaterPage.vue`).

### Minimal working SFC

```vue
<template>
  <ScrollViewer Height="320" VerticalScrollBarVisibility="Auto" VerticalScrollMode="Auto">
    <ItemsRepeater :ItemsSource="numbers" @ElementPrepared="(a) => console.log('prepared', a.Index)">
      <ItemsRepeater.Layout>
        <StackLayout Orientation="Vertical" Spacing="4" />
      </ItemsRepeater.Layout>
      <ItemsRepeater.ItemTemplate>
        <DataTemplate>
          <Border Height="32" Background="var(--subtle-fill-secondary)">
            <TextBlock Text="{x:Bind}" VerticalAlignment="Center" />
          </Border>
        </DataTemplate>
      </ItemsRepeater.ItemTemplate>
    </ItemsRepeater>
  </ScrollViewer>
</template>

<script setup>
import { ref } from 'vue'
import ItemsRepeater from '../../components/ItemsRepeater.vue'
import ScrollViewer from '../../components/ScrollViewer.vue'
import Border from '../../components/Border.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate, StackLayout } from '../../components/CollectionProperties'

const numbers = ref(Array.from({ length: 500 }, (_, i) => i + 1))   // > 120 → virtualized
</script>
```

---

## ItemsControl

**Import** — `import ItemsControl from '../../components/ItemsControl.vue'` (package: `{ ItemsControl }`).
The plainest items host: a `StackPanel` of ContentPresenters. **No selection, no scrolling,
no events, no virtualization.**

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `string \| Array \| Object` | `null` | Array / iterable / `{ Count, GetAt }`. When `null`, the default-slot children become the items. |
| `ItemTemplate` | `unknown` | `undefined` | `DataTemplate` VNode, `{StaticResource Key}`, **or a render function `(item) => VNode`** (the one Vue-native escape hatch — `ContentPresenter` calls `template(content)`). |
| `ItemTemplateSelector` | `unknown` | `undefined` | Object with `SelectTemplate(item)` / `SelectTemplateCore(item)`. |
| `ItemsPanel` | `unknown` | `undefined` | `<ItemsPanelTemplate>` content; defaults to a vertical `StackPanel`. |
| `IsEnabled` | `string \| boolean` | `true` | Disables every child (clones them with `IsEnabled: false`). |
| `IsTabStop` | `string \| boolean` | `true` | Sets `tabindex=0` on the host. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` / `0` | |
| `Margin` `Padding` | `string \| number` | `''` | |
| `Background` | `string \| object` | `''` | |
| `BorderBrush` | `string` | `''` | |
| `BorderThickness` | `string \| number` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |
| `Visibility` | `string` | `'Visible'` | |

### v-model

None.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | items (when no `ItemsSource`) and/or `<ItemsControl.Items>` |
| `<ItemsControl.ItemTemplate>` | item template, item scope per §0.3 |
| `<ItemsControl.ItemsPanel>` | panel definition |
| `<ItemsControl.Resources>` | local resource dictionary |

No slot props.

### Events

None (`defineEmits` is never called). Use `ref` + exposed `Items`/`ItemsSource`.

Exposed: `Element`, `Name`, `Items` (computed array), `ItemsSource` (writable),
`ItemTemplate`, `ItemTemplateSelector`, `ItemsPanel`, `IsEnabled`, `IsTabStop`.

### Gotchas

1. **No scroll container.** Put it inside a `ScrollViewer` if the content can overflow.
2. No selection, no keyboard handling, no item-click event — use `ListView`/`ListBox` for those.
3. With `ItemsSource` unset, the default-slot children become the items; if you also
   supply an `ItemTemplate` it is applied to each child as its content, so normally use
   one or the other.
4. Prefixing item children with `<ItemsControl.Items>` works and is otherwise optional.
5. `ItemTemplate` as a **function** is genuinely supported here
   (`h(ContentPresenter, { ContentTemplate: fn })` → `fn(item)`). It needs
   `import { h } from 'vue'` in `<script setup>`:

```vue
<ItemsControl :ItemsSource="rows" :ItemTemplate="item => h(TextBlock, { Text: item.Name })" />
```

### Minimal working SFC

```vue
<template>
  <ScrollViewer MaxHeight="280" VerticalScrollBarVisibility="Auto">
    <ItemsControl :ItemsSource="rows">
      <ItemsControl.ItemTemplate>
        <DataTemplate>
          <Border Padding="8,4" Background="var(--subtle-fill-secondary)">
            <TextBlock Text="{x:Bind Name}" />
          </Border>
        </DataTemplate>
      </ItemsControl.ItemTemplate>
    </ItemsControl>
  </ScrollViewer>
</template>

<script setup>
import { ref } from 'vue'
import ItemsControl from '../../components/ItemsControl.vue'
import ScrollViewer from '../../components/ScrollViewer.vue'
import Border from '../../components/Border.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const rows = ref([{ Name: 'alpha' }, { Name: 'beta' }])
</script>
```

---

## ItemContainer

**Import** — `import ItemContainer from '../../components/ItemContainer.vue'` (package: `{ ItemContainer }`).

WinUI's `ItemContainer` wrapper: paints hover/pressed/selected chrome, the 3px accent
selection frame and (in multi-select mode) a checkbox. Intended to be the root of an
**`ItemsView`** item template; it also works standalone with an explicit `IsSelected`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsSelected` | `boolean \| string` | `false` | Selected state. Ignored when an `ItemsView` controller is injected (the controller owns selection). |
| `IsEnabled` | `boolean \| string` | `true` | Disabled dims to `--ItemContainerDisabledOpacity` (`.3`) and collapses the selection visual. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `undefined` | Box; a `LinedFlowLayout` parent can override `width`/`height` per item. |
| `Margin` | `string \| number` | `''` | |
| `Background` | `string \| object` | `''` | |
| `CornerRadius` | `string \| number` | `''` | Defaults to `var(--ControlCornerRadius, 4px)`. |

### v-model

None.

### Slots & slot props

| Slot | Props | Notes |
| --- | --- | --- |
| default | **none** | Single child (any content). No item-scope props are provided. |

### Events

None of its own. Item invocation is routed through the injected `ItemsView`
controller (`ItemInvoked` on the ItemsView with trigger
`'Tap' | 'DoubleTap' | 'PointerReleased' | 'EnterKey' | 'SpaceKey'`).

Exposed: `IsSelected`.

### Gotchas

1. Standalone it does **nothing** on click unless `IsSelected` changes — it has no
   selection state of its own.
2. Real class set: `SelectedNormal|SelectedPointerOver|SelectedPressed|UnselectedNormal|UnselectedPointerOver|UnselectedPressed` plus `multi-select` / `disabled`;
   style through the `--ItemContainer*` custom properties.
3. The checkbox only appears when the owning `ItemsView` is in `Multiple`/`Extended`
   multi-select mode (`MultiSelectStates`).
4. Give it a size (`Width`/`Height`) or put sized content inside; its root is `display:block`
   with `overflow:hidden`.

### Minimal working SFC

```vue
<template>
  <ItemContainer :IsSelected="selected" Width="200" Height="120" @click="toggle">
    <Grid Background="var(--accent-base)">
      <TextBlock Text="ItemContainer" HorizontalAlignment="Center" VerticalAlignment="Center" />
    </Grid>
  </ItemContainer>
</template>

<script setup>
import { ref } from 'vue'
import ItemContainer from '../../components/ItemContainer.vue'
import Grid from '../../components/Grid.vue'
import TextBlock from '../../components/TextBlock.vue'

const selected = ref(true)
const toggle = () => { selected.value = !selected.value }
</script>
```

> For a real ItemsView integration, the container is the root of the DataTemplate:
> `<DataTemplate><ItemContainer Width="200" Height="140"><Image Source="{x:Bind ImageLocation}" /></ItemContainer></DataTemplate>`
> (see `ItemsViewPage.vue`).

---

## ListBox

**Import** — `import ListBox from '../../components/ListBox.vue'` (package: `{ ListBox }`).

The lightweight selector: a `ScrollViewer` of `role="option"` rows. No drag/drop, no
grouping, no item-click event, no virtualization.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `Array \| string \| Object` | `[]` | **Array only** — anything else renders zero rows. |
| `ItemTemplate` | `string \| Object \| Function` | `undefined` | `"{StaticResource Key}"`, a `DataTemplate` VNode, or `<ListBox.ItemTemplate>`. Without it each item renders as a `TextBlock` of `String(item)`. |
| `SelectionMode` | `string` | `'Single'` | `None`, `Single`, `Multiple` (and `Extended`, treated as multi-toggle). |
| `SelectedIndex` | `number \| string` | `undefined` | |
| `SelectedItem` | `unknown` | `undefined` | |
| `SelectedItems` | `Array \| string` | `undefined` | |
| `IsEnabled` | `boolean \| string` | `true` | |
| `Padding` | `string \| number` | `0` | |
| `Width` `Height` | `string \| number` | `''` | |

No `BorderBrush`/`BorderThickness`/`Margin` props: the frame comes from
`--ListBoxBorder` / `--ListBoxBorderThemeThickness` CSS variables.

### v-model

`v-model:SelectedIndex`, `v-model:SelectedItem`, `v-model:SelectedItems`.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | only `<ListBox.ItemTemplate>` is consumed |
| `<ListBox.ItemTemplate>` | item template, item scope per §0.3 |

No slot props.

### Events — `(sender, args)`

`sender` = `{ SelectedIndex, SelectedItem, SelectedItems }` getters.

| Event | Payload `args` |
| --- | --- |
| `SelectionChanged` | single: `{ AddedItems, RemovedItems, SelectedIndex, SelectedItem }`; multiple: `{ AddedItems, RemovedItems, SelectedItems }` |
| `update:SelectedIndex` / `update:SelectedItem` / `update:SelectedItems` | new value |

### Gotchas

1. **`ItemsSource` must be a real `Array`** — `Array.isArray(source) ? source : []`.
   An `ObservableVector` or `CollectionViewSource` yields an empty list.
2. Keyboard: ↑/↓/Home/End move focus and re-select in `Single` mode; Enter/Space
   activate the focused row.
3. Row chrome: `8px 12px` padding, selection = accent background
   (`--ListBoxItemBackgroundSelected`) — not the 3px ListView indicator.
4. Needs `Height` to scroll internally (same reason as ListView).
5. Selection ignores a click on the already-selected row (no deselect in `Single`).
6. `SelectedItems` requires `SelectionMode="Multiple"`, otherwise it is recomputed
   from `SelectedIndex`.

### Minimal working SFC

```vue
<template>
  <ListBox :ItemsSource="colors" Width="200" Height="180" v-model:SelectedIndex="index">
    <ListBox.ItemTemplate>
      <DataTemplate>
        <TextBlock Text="{x:Bind Label}" />
      </DataTemplate>
    </ListBox.ItemTemplate>
  </ListBox>
</template>

<script setup>
import { ref } from 'vue'
import ListBox from '../../components/ListBox.vue'
import TextBlock from '../../components/TextBlock.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const colors = ref([{ Label: 'Blue' }, { Label: 'Green' }, { Label: 'Red' }])
const index = ref(0)
</script>
```

---

## ScrollView

**Import** — `import ScrollView from '../../components/ScrollView.vue'` (package: `{ ScrollView }`).

The newer WinUI 3 scroller (`ScrollPresenter` based). Use this when you want
`ScrollTo`/velocity APIs and `ViewChanged` per-frame scroll reporting.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `undefined` | Declared in the prop list but **not rendered** — ScrollView only renders its default slot. |
| `ContentOrientation` | `string` | `'Vertical'` | `Vertical` / `Horizontal` / `Both` / `None`. |
| `HorizontalScrollBarVisibility` | `string` | `'Auto'` | `Auto/Visible/Hidden/Disabled`. |
| `VerticalScrollBarVisibility` | `string` | `'Auto'` | |
| `HorizontalScrollMode` | `string` | `'Auto'` | `Auto/Enabled/Disabled`. |
| `VerticalScrollMode` | `string` | `'Auto'` | |
| `HorizontalScrollChainMode` | `string` | `'Auto'` | `Auto/Never/Always`. |
| `VerticalScrollChainMode` | `string` | `'Auto'` | |
| `ZoomChainMode` | `string` | `'Auto'` | |
| `HorizontalScrollRailMode` | `string` | `'Enabled'` | |
| `VerticalScrollRailMode` | `string` | `'Enabled'` | |
| `ZoomMode` | `string` | `'Disabled'` | `Enabled` turns on ctrl+wheel / pinch zoom. |
| `IgnoredInputKinds` | `string \| number` | `'None'` | `Touch`, `Pen`, `MouseWheel`, `Keyboard`, `All`. |
| `MinZoomFactor` | `number \| string` | `0.1` | |
| `MaxZoomFactor` | `number \| string` | `10` | |
| `HorizontalAnchorRatio` | `number \| string` | `0` | |
| `VerticalAnchorRatio` | `number \| string` | `0` | |
| `IsTabStop` | `boolean \| string` | `false` | |
| `IsEnabled` | `boolean \| string` | `true` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `number \| string` | `''` / `0` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |
| `Background` | `string \| object` | `'Transparent'` | |
| `BorderBrush` | `string` | `''` | |
| `BorderThickness` | `number \| string` | `0` | |
| `CornerRadius` | `number \| string` | `'{ThemeResource ControlCornerRadius}'` | |
| `Padding` `Margin` | `number \| string` | `0` | |

### v-model

None.

### Slots & slot props

`default` → content of the `ScrollPresenter`. No slot props, any node tree.

### Events — `(sender, args)`; **`sender` carries the offsets**

`event(name, args)` → `emit(name, publicSender, args)`, where `publicSender` is a proxy
whose properties unwrap the exposed refs, so you read **live numbers** from `sender`.

| Event | Payload `args` | Notes |
| --- | --- | --- |
| `ViewChanged` | **`{}` (empty object)** | Fires on every native scroll frame *and* on programmatic scrolling/zooming. **Read `sender.VerticalOffset`.** Also fires during zoom. |
| `ScrollStarting` | `{ CorrelationId, HorizontalOffset, VerticalOffset }` | `ScrollTo`/`ScrollBy` began. |
| `ScrollAnimationStarting` | `{ CorrelationId, StartPosition: {x,y}, EndPosition: {x,y}, Animation }` | `Animation` = `{ Duration, KeyFrames, InsertKeyFrame(progress, value, easing) }`; mutating `Animation` retimes it. |
| `ScrollCompleted` | `{ CorrelationId }` | |
| `ZoomStarting` | `{ CorrelationId, ZoomFactor, CenterPoint: {x,y} }` | |
| `ZoomAnimationStarting` | `{ CorrelationId, CenterPoint, StartZoomFactor, EndZoomFactor, Animation }` | |
| `ZoomCompleted` | `{ CorrelationId }` | |
| `ExtentChanged` | `{}` | Content size changed. |
| `StateChanged` | `{}` | `sender.State` → `Idle / Interaction / Inertia / Animation`. |
| `AnchorRequested` | `{ AnchorCandidates, AnchorElement }` | Assign `AnchorElement` to override. |
| `BringingIntoView` | `{ TargetElement, Cancel, HorizontalOffset, VerticalOffset }` | Focus brought a child into view. |
| `Loaded` | `{}` | |

`sender` properties (all live): `HorizontalOffset`, `VerticalOffset`, `ViewportWidth`,
`ViewportHeight`, `ExtentWidth`, `ExtentHeight`, `ScrollableWidth`, `ScrollableHeight`,
`ZoomFactor`, `State`, `CurrentAnchor`, `ComputedHorizontalScrollMode`,
`ComputedVerticalScrollMode`, `ComputedHorizontalScrollBarVisibility`,
`ComputedVerticalScrollBarVisibility`, `ScrollPresenter`, `ExpressionAnimationSources`.

### Methods (via `ref`)

`ScrollTo(horizontal, vertical, options?)`, `ScrollBy(dx, dy, options?)`,
`ZoomTo(factor, center?, options?)`, `ZoomBy(delta, center?, options?)`,
`AddScrollVelocity(offsetsVelocity, inertiaDecayRate?)`,
`AddZoomVelocity(velocity, center?, inertiaDecayRate?)`,
`RegisterAnchorCandidate(element)`, `UnregisterAnchorCandidate(element)`.
`options = { AnimationMode: 'Auto' | 'Enabled' | 'Disabled', SnapPointsMode: 'Default' | 'Ignore' }`;
`AnimationMode: 'Disabled'` scrolls instantly.

### Gotchas

1. **`ViewChanged` has an empty `args`.** `scrollTop` lives on the **sender**
   (`sender.VerticalOffset`); nothing is in `args`.
2. Give it `Height` or `MaxHeight`; `.win-scroll-view` is a `*`/`Auto` grid that
   otherwise grows with content.
3. Rendering is `transform`-based for zoom; do not wrap the content in your own
   `overflow:auto` box — use the ScrollView.
4. It is **not** a virtualizer: whatever you put inside is in the DOM.
5. `ScrollTo` returns a `CorrelationId` (or `-1` on invalid input); animations respect
   `prefers-reduced-motion`.
6. `ScrollAnimationStarting` gives you `args.Animation` to mutate — the gallery uses
   this to override easing/duration.

### Minimal working SFC — reading scrollTop for infinite loading

```vue
<template>
  <ScrollView
    Height="360"
    @ViewChanged="(sender) => onScroll(sender.VerticalOffset, sender.ScrollableHeight)"
  >
    <StackPanel>
      <Border v-for="row in rows" :key="row.Key" Height="40" Background="var(--subtle-fill-secondary)">
        <TextBlock :Text="row.Name" />
      </Border>
      <TextBlock Text="Loading…" />
    </StackPanel>
  </ScrollView>
</template>

<script setup>
import { ref } from 'vue'
import ScrollView from '../../components/ScrollView.vue'
import StackPanel from '../../components/StackPanel.vue'
import Border from '../../components/Border.vue'
import TextBlock from '../../components/TextBlock.vue'

const rows = ref(Array.from({ length: 50 }, (_, i) => ({ Key: i, Name: `Row ${i}` })))
let busy = false
const onScroll = (scrollTop, scrollableHeight) => {
  if (busy || scrollableHeight - scrollTop > 200) return
  busy = true
  // fetch next page, then:
  rows.value = [...rows.value, ...Array.from({ length: 20 }, (_, i) => ({ Key: rows.value.length + i, Name: `Row ${rows.value.length + i}` }))]
  busy = false
}
</script>
```

---

## ScrollViewer

**Import** — `import ScrollViewer from '../../components/ScrollViewer.vue'` (package: `{ ScrollViewer }`).

Classic WinUI ScrollViewer (custom scrollbars, zoom, deferred scrolling).
This is what every list control uses internally.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Template` | `string` | `undefined` | `<ScrollViewer.Template>` marker; content of the template is ignored. |
| `ZoomMode` | `'Disabled' \| 'Enabled' \| string` | `'Disabled'` | |
| `MinZoomFactor` | `number \| string` | `0.1` | |
| `MaxZoomFactor` | `number \| string` | `10.0` | |
| `HorizontalScrollMode` | `'Disabled' \| 'Enabled' \| 'Auto' \| string` | `'Auto'` | |
| `VerticalScrollMode` | `'Disabled' \| 'Enabled' \| 'Auto' \| string` | `'Auto'` | |
| `HorizontalScrollBarVisibility` | `'Disabled' \| 'Auto' \| 'Hidden' \| 'Visible' \| string` | `'Disabled'` | Note the asymmetric WinUI default. |
| `VerticalScrollBarVisibility` | `'Disabled' \| 'Auto' \| 'Hidden' \| 'Visible' \| string` | `'Visible'` | |
| `IsVerticalScrollChainingEnabled` | `boolean \| string` | `true` | |
| `IsHorizontalScrollChainingEnabled` | `boolean \| string` | `true` | |
| `IsHorizontalRailEnabled` | `boolean \| string` | `true` | |
| `IsVerticalRailEnabled` | `boolean \| string` | `true` | |
| `IsDeferredScrollingEnabled` | `boolean \| string` | `false` | Thumb drag only updates the bar until release. |
| `IsTabStop` | `boolean \| string` | `false` | |
| `IsEnabled` | `boolean \| string` | `true` | |
| `HorizontalContentAlignment` | `string` | `'Left'` | |
| `VerticalContentAlignment` | `string` | `'Top'` | |
| `Padding` | `string` | `'0'` | |
| `Background` `BorderBrush` `BorderThickness` `CornerRadius` | — | `'Transparent'`, `'Transparent'`, `0`, `0` | |
| `Width` `Height` | `number \| string` | `NaN` (= unset) | |
| `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` `Margin` | `number \| string` | `undefined` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |

### v-model

None.

### Slots & slot props

`default` → the scrolled content. `<ScrollViewer.Template>` children are dropped
(setting them only sets `hasTemplate`). No slot props.

### Events — `(sender, args)`

`sender` is a plain object built from the exposed properties (getters), so
`sender.VerticalOffset` etc. **are** readable — but `args` is the canonical place to
get the view.

| Event | Payload `args` |
| --- | --- |
| `ViewChanging` | `{ NextView: { HorizontalOffset, VerticalOffset, ZoomFactor }, FinalView: {…}, IsInertial: false }` — fired on **every** intermediate scroll (deduped by view key) |
| `ViewChanged` | `{ IsIntermediate: boolean }` — `true` on intermediate frames, `false` once scrolling settles (`handleScroll` → 150 ms quiet timer → final event) |
| `DirectManipulationStarted` | `{}` |
| `DirectManipulationCompleted` | `{}` |
| `Loaded` | `{ OriginalSource: sender }` |

`sender` properties: `HorizontalOffset`, `VerticalOffset`, `ViewportWidth`,
`ViewportHeight`, `ExtentWidth`, `ExtentHeight`, `ScrollableWidth`, `ScrollableHeight`,
`ZoomFactor`, `MinZoomFactor`, `MaxZoomFactor`, `IsDeferredScrollingEnabled`,
`ComputedHorizontalScrollBarVisibility`, `ComputedVerticalScrollBarVisibility`,
plus `ChangeView` and `ZoomToFactor`.

### Methods (via `ref`)

* `ChangeView(horizontalOffset?, verticalOffset?, zoomFactor?, disableAnimation = false) → boolean`
  (`null`/`undefined` keeps the current value). Animated by default over 300 ms.
* `ZoomToFactor(factor) → boolean` (`ChangeView(null, null, factor, true)`).
* `scrollViewerRef` (private viewport handle, for existing internals).

### Gotchas

1. **`scrollTop` is in `ViewChanging.args.NextView.VerticalOffset`** (every frame) or
   `sender.VerticalOffset` in either event. `ViewChanged.args` only tells you whether
   the event is intermediate.
2. Two event names, one meaning: `ViewChanging` = "moving", `ViewChanged` = "moved
   (or progressing)"; `IsIntermediate === true` on the frames, one final call with
   `false` after 150 ms of no scrolling.
3. `VerticalScrollBarVisibility` defaults to `Visible` while `HorizontalScrollBarVisibility`
   defaults to `Disabled` — this is intentional (it gives vertical content a finite
   width to measure against).
4. Needs `Height`/`MaxHeight` (or to sit in a `*` grid row) or it grows with content.
5. Custom scrollbars are 12 px overlays; `::-webkit-scrollbar` is hidden — don't
   style native scrollbars, use the `--ScrollViewer*` custom properties.
6. `ViewChanged` also fires for programmatic `ChangeView` animation frames.
7. Not a virtualizer; pair with `ItemsRepeater` for large collections.

### Minimal working SFC — `scrollTop` for infinite loading

```vue
<template>
  <ScrollViewer
    Height="360"
    VerticalScrollBarVisibility="Auto"
    VerticalScrollMode="Auto"
    @ViewChanging="(sender, args) => onScroll(args.NextView.VerticalOffset, args.FinalView.VerticalOffset)"
  >
    <StackPanel>
      <Border v-for="row in rows" :key="row.Key" Height="40">
        <TextBlock :Text="row.Name" />
      </Border>
    </StackPanel>
  </ScrollViewer>
</template>

<script setup>
import { ref } from 'vue'
import ScrollViewer from '../../components/ScrollViewer.vue'
import StackPanel from '../../components/StackPanel.vue'
import Border from '../../components/Border.vue'
import TextBlock from '../../components/TextBlock.vue'

const rows = ref(Array.from({ length: 50 }, (_, i) => ({ Key: i, Name: `Row ${i}` })))
let busy = false
const onScroll = (nextTop, finalTop) => {
  if (busy || nextTop < 800) return
  busy = true
  rows.value = [...rows.value, ...Array.from({ length: 20 }, (_, i) => ({ Key: rows.value.length + i, Name: `Row ${rows.value.length + i}` }))]
  busy = false
}
</script>
```

> Alternative without events: keep `const sv = ref()`, then
> `sv.value.ChangeView(null, 0, null, true)` to jump to the top, and read
> `sv.value.VerticalOffset` / `sv.value.ScrollableHeight` at any time.

---

## RefreshContainer (+ RefreshVisualizer) — the pull-to-refresh API

**Import** — `import RefreshContainer from '../../components/RefreshContainer.vue'`,
`import RefreshVisualizer from '../../components/RefreshVisualizer.vue'`
(package: `{ RefreshContainer, RefreshVisualizer }`).

`PullToRefreshPage.vue` is the reference: two containers around a `ListView`, a
`RefreshRequested` handler that takes a deferral and completes it when the work ends.

### RefreshContainer props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `PullDirection` | `string` | `'TopToBottom'` | `TopToBottom`, `BottomToTop`, `LeftToRight`, `RightToLeft`; anything else falls back to `TopToBottom`. |
| `Visualizer` | `string \| Object` | `''` | Visualizer VNode; otherwise the default `RefreshVisualizer` is rendered. |
| `Content` | `string \| number \| Object` | `''` | Alternative to the default slot. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` | |
| `Margin` `Padding` | `string \| number` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |
| `HorizontalContentAlignment` | `string` | `'Left'` | |
| `VerticalContentAlignment` | `string` | `'Top'` | |
| `Background` | `string` | `'{ThemeResource RefreshContainerBackgroundBrush}'` | |
| `Foreground` | `string` | `'{ThemeResource RefreshContainerForegroundBrush}'` | |
| `IsEnabled` | `boolean \| string` | `true` | |
| `Visibility` | `string` | `'Visible'` | |

### v-model

None.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | the scrolled content — **must contain a ScrollViewer/ListView/GridView**; the container never inserts one |
| `<RefreshContainer.Visualizer>` | a `<RefreshVisualizer>` (optionally with `<RefreshVisualizer.Content>`) |
| `<RefreshContainer.Content>` | explicit content property |

No slot props.

### Events

| Event | Signature / payload |
| --- | --- |
| `RefreshRequested` | `(sender, args)`; `sender = { RequestRefresh(), Visualizer }`; `args = { GetDeferral() → { Complete() } }` |

Methods: `RequestRefresh()` (also exposed, so `ref.value.RequestRefresh()` and the
gallery's `Click="rc.RequestRefresh"` both work). No-op while already `Refreshing`.

### The refresh protocol (exactly what `PullToRefreshPage.vue` does)

```js
const onRefreshRequested = (sender, args) => {
  const deferral = args.GetDeferral()   // keeps the spinner up
  setTimeout(() => {
    rows.value.unshift(newRow)          // do the work
    deferral.Complete()                 // REQUIRED — otherwise it spins forever
  }, 500)
}
```

Deferral accounting is `raiseRefreshRequested` in `refreshRuntime.ts`: the count starts
at 1, `GetDeferral()` increments, `Complete()` decrements exactly once, and the
visualizer returns to `Idle` only when the count reaches 0. A handler that takes no
deferral finishes the refresh as soon as the event returns — the indicator then blinks.

### RefreshVisualizer props

`Orientation` (`'Auto'` default; `Normal`, `Rotate90DegreesCounterclockwise`,
`Rotate270DegreesCounterclockwise`), `Content`, `Width/Height/MinWidth/MinHeight/MaxWidth/MaxHeight`,
`Margin`, `HorizontalAlignment`/`VerticalAlignment` (`'Stretch'`), `Background`
(`'{ThemeResource RefreshVisualizerBackground}'`), `Foreground`
(`'{ThemeResource RefreshVisualizerForeground}'`), `IsEnabled` (`true`), `Visibility` (`'Visible'`).

Events: `RefreshRequested` (`(sender, args)` with `GetDeferral`),
`RefreshStateChanged` (`(sender, { OldState, NewState })` where state is
`Idle | Peeking | Interacting | Pending | Refreshing`). Exposes only
`RequestRefresh`, `State`, `Content`.

### Gotchas

1. **Touch/pen only.** `onPointerDown` ignores `pointerType !== 'touch'`, so a mouse
   cannot pull — always expose a button that calls `RequestRefresh()` (the gallery does).
2. **The gesture starts only at the boundary** — `INITIAL_OFFSET_THRESHOLD = 1.0` px
   from the edge it refreshes from. Mid-list pulls do nothing.
3. The content must provide its own scroller (`ListView`, `GridView`, `ScrollViewer`,
   `ScrollView`); the container looks for `.win-scroll-viewer-viewport` or
   `.win-scroll-presenter` inside itself and also rewrites their `touch-action` /
   `overscroll-behavior` (restored on unmount).
4. `PullDirection` decides which edge and which sign; execution ratio is `0.8`
   (`DEFAULT_EXECUTION_RATIO`) and the default visualizer size is `100` px.
5. Wrap in a normal layout: the container is `display:grid` with `overflow:hidden`, so
   its height comes from the content (`<ListView Height="200" />` in the gallery).
6. `args.GetDeferral()` must be paired with exactly one `Complete()`; the runtime
   guards double-completion but not a missing completion.

### Minimal working SFC

```vue
<template>
  <StackPanel Spacing="12">
    <RefreshContainer ref="refresh" @RefreshRequested="onRefreshRequested">
      <ListView :ItemsSource="rows" Height="200" MinWidth="200" BorderThickness="1" />
    </RefreshContainer>
    <Button Content="Refresh" @click="() => refresh?.RequestRefresh()" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import RefreshContainer from '../../components/RefreshContainer.vue'
import ListView from '../../components/ListView.vue'
import StackPanel from '../../components/StackPanel.vue'
import Button from '../../components/Button.vue'

const refresh = ref(null)
const rows = ref(['Acrylic brush', 'ColorPicker', 'NavigationView'])
let count = 0
const onRefreshRequested = (_sender, args) => {
  const deferral = args.GetDeferral()
  setTimeout(() => {
    rows.value.unshift(`New item ${++count}`)
    deferral.Complete()
  }, 500)
}
</script>
```

---

## PipsPager

**Import** — `import PipsPager from '../../components/PipsPager.vue'` (package: `{ PipsPager }`).

Dot indicator for a paged view (typically paired with `FlipView`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `NumberOfPages` | `number \| string` | `-1` | `-1` = infinite (pips grow as the index advances); `0` = no pips; `> 0` = fixed count. |
| `SelectedPageIndex` | `number \| string` | `0` | Current page (clamped to `0 … NumberOfPages-1`). |
| `MaxVisiblePips` | `number \| string` | `5` | Pips rendered before the strip scrolls. |
| `Orientation` | `string` | `'Horizontal'` | `Vertical` otherwise. |
| `PreviousButtonVisibility` | `string` | `'Collapsed'` | `Visible`, `VisibleOnPointerOver`, `Collapsed`. |
| `NextButtonVisibility` | `string` | `'Collapsed'` | same values. |
| `PreviousButtonStyle` | `string \| Object` | `'{StaticResource PipsPagerPreviousPageButtonStyle}'` | |
| `NextButtonStyle` | `string \| Object` | `'{StaticResource PipsPagerNextPageButtonStyle}'` | |
| `SelectedPipStyle` | `string \| Object` | `'{StaticResource PipsPagerSelectedPipButtonStyle}'` | |
| `NormalPipStyle` | `string \| Object` | `'{StaticResource PipsPagerNormalPipButtonStyle}'` | |
| `WrapMode` | `string` | `'None'` | `'Wrap'` makes prev/next wrap around (needs `NumberOfPages > 1`). |
| `IsEnabled` | `boolean \| string` | `true` | |
| `IsTabStop` | `boolean \| string` | `false` | |
| `Background` | `string` | `'Transparent'` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `number \| string` | `''` | |
| `Margin` | `number \| string` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Left'` / `'Top'` | |
| `FlowDirection` | `string` | `'LeftToRight'` | `RightToLeft` mirrors arrow-key handling and order. |

### v-model

`v-model:SelectedPageIndex` (`update:SelectedPageIndex`).

### Slots & slot props

None (pips and navigation buttons come from the internal styles).

### Events — `(sender, args)`

| Event | Payload |
| --- | --- |
| `SelectedIndexChanged` | `(sender, args)`; **`args` is an empty frozen object `{}`** — read `sender.SelectedPageIndex` / `sender.NumberOfPages` |
| `update:SelectedPageIndex` | the new index |

`sender` exposes `NumberOfPages`, `SelectedPageIndex`, `MaxVisiblePips`, `Orientation`,
`PreviousButtonVisibility`, `NextButtonVisibility`, `PreviousButtonStyle`,
`NextButtonStyle`, `SelectedPipStyle`, `NormalPipStyle`, `WrapMode`, `IsEnabled`,
`TemplateSettings.PipsPagerItems`.

### Gotchas

1. **Default `NumberOfPages` is `-1` (infinite)** — with no `NumberOfPages` you get
   `MaxVisiblePips` dots that grow as you advance. Bind the real count
   (`:NumberOfPages="pictures.length"`) for a true page count.
2. `SelectedIndexChanged` carries **no useful args**; use `sender` or the `update:` event.
3. Pips are rendered through an internal `ItemsRepeater` + `ScrollViewer`; the strip
   auto-scrolls the selected pip into view.
4. Arrow keys **move focus** only; Space/Enter activate (WinUI behaviour).
5. `WrapMode="Wrap"` alone is not enough — it also needs `NumberOfPages > 1`.
6. Two-way binding a `FlipView` is done in the gallery as
   `SelectedPageIndex="{x:Bind Path=Gallery.SelectedIndex, Mode=TwoWay}"`; in a
   consumer component use `v-model:SelectedPageIndex="index"` and pass `:SelectedIndex="index"`
   to the `FlipView`.

### Minimal working SFC

```vue
<template>
  <StackPanel Spacing="12">
    <PipsPager
      :NumberOfPages="pictures.length"
      v-model:SelectedPageIndex="index"
      PreviousButtonVisibility="Visible"
      NextButtonVisibility="Visible"
      HorizontalAlignment="Center"
      @SelectedIndexChanged="(sender) => console.log(sender.SelectedPageIndex)"
    />
    <TextBlock :Text="`page ${index + 1} of ${pictures.length}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import PipsPager from '../../components/PipsPager.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const pictures = ref(['a.jpg', 'b.jpg', 'c.jpg'])
const index = ref(0)
</script>
```

---

## FlipView

**Import** — `import FlipView from '../../components/FlipView.vue'` (package: `{ FlipView }`).

Carousel with prev/next buttons, keyboard/wheel/touch paging. Renders **all** pages
in a translated track (no virtualization).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `string \| Array \| Object` | `null` | Array or iterable. If `null`, the default-slot children are the pages. |
| `ItemTemplate` | `string \| Object` | `undefined` | `"{StaticResource Key}"`, a `DataTemplate` VNode, or `<FlipView.ItemTemplate>`. |
| `SelectedIndex` | `number \| string` | `undefined` | Clamped to the item count. |
| `SelectedItem` | `Object \| string \| number \| boolean` | `undefined` | Matched by `Object.is` or by `id/Id/key/Key`. |
| `Orientation` | `string` | `undefined` (`'Horizontal'`) | Falls back to the `ItemsPanel`'s `Orientation`, then `Horizontal`. |
| `FlowDirection` | `string` | `undefined` (`'LeftToRight'`) | `RightToLeft` reverses the track. |
| `HorizontalContentAlignment` `VerticalContentAlignment` | `string` | `'Stretch'` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |
| `IsEnabled` | `boolean \| string` | `true` | |
| `IsTabStop` | `boolean \| string` | `false` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` | |
| `Margin` `Padding` | `string \| number` | `''` | |
| `Background` `BorderBrush` `BorderThickness` `CornerRadius` | | `''` | |

### v-model

`v-model:SelectedIndex`, `v-model:SelectedItem`.

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | `<FlipView.ItemTemplate>`, `<FlipView.ItemsPanel>`, or plain page children |
| `<FlipView.ItemTemplate>` | item template, item scope per §0.3 |

No slot props.

### Events — `(sender, args)`

| Event | Payload `args` |
| --- | --- |
| `SelectionChanged` | `{ AddedItems, RemovedItems, SelectedIndex, SelectedItem }` |
| `update:SelectedIndex` / `update:SelectedItem` | new value |

### Gotchas

1. **Set `Height`.** Root is `display:flex` with `min-height:1px`; the track and each
   page are `height:100%`, so with no height the view collapses to the tallest
   intrinsic child (often 1 px for bare images).
2. **No virtualization** — all pages stay mounted and are moved by `transform`.
3. Pages are paged with click, `←/→` (or `↑/↓` vertically), wheel (200 ms throttle)
   and touch swipe. At the ends the wheel is left unhandled so an outer scroller
   continues scrolling.
4. Without `ItemTemplate` and with `ItemsSource`, a page renders `String(item)`.
   Without `ItemsSource`, the default-slot children themselves become the pages.
5. Prev/next buttons appear on pointer-enter and auto-hide after 3 s
   (`showNavigationButtons`); each button is also hidden at its own end of the list
   (`selectedIndex > 0` / `selectedIndex < length - 1`), and both need `items.length >= 2`.
6. `ItemTemplate` accepts only `string | Object`.

### Minimal working SFC

```vue
<template>
  <StackPanel Spacing="12">
    <FlipView :ItemsSource="pictures" Height="270" MaxWidth="400" v-model:SelectedIndex="index">
      <FlipView.ItemTemplate>
        <DataTemplate>
          <Image Source="{x:Bind Url}" Stretch="UniformToFill" />
        </DataTemplate>
      </FlipView.ItemTemplate>
    </FlipView>
    <PipsPager :NumberOfPages="pictures.length" v-model:SelectedPageIndex="index" HorizontalAlignment="Center" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import FlipView from '../../components/FlipView.vue'
import PipsPager from '../../components/PipsPager.vue'
import Image from '../../components/Image.vue'
import StackPanel from '../../components/StackPanel.vue'
import { DataTemplate } from '../../components/CollectionProperties'

const pictures = ref([
  { Url: 'https://picsum.photos/id/10/800/450' },
  { Url: 'https://picsum.photos/id/20/800/450' }
])
const index = ref(0)
</script>
```

---

## VariableSizedWrapGrid

**Import** — `import VariableSizedWrapGrid from '../../components/VariableSizedWrapGrid.vue'` (package: `{ VariableSizedWrapGrid }`).

A **layout panel**, not an items control: it positions its direct children on a
CSS-grid occupancy map with per-child row/column spans. No `ItemsSource`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Orientation` | `string` | `'Vertical'` | `Vertical` fills columns first; `Horizontal` fills rows first. Also `v-model:Orientation`. |
| `ItemWidth` | `string \| number` | `NaN` (auto) | Cell width in px. Falls back to the **first child's** measured width. |
| `ItemHeight` | `string \| number` | `NaN` (auto) | Cell height in px; same fallback. |
| `MaximumRowsOrColumns` | `string \| number` | `-1` | Max tracks along the fill direction; `<= 0` = derive from available size. |
| `HorizontalChildrenAlignment` | `string` | `'Left'` | `Left`, `Center`, `Right`, `Stretch` (distributes gaps). |
| `VerticalChildrenAlignment` | `string` | `'Top'` | `Top`, `Center`, `Bottom`, `Stretch`. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `string \| number` | `''` / `0` | |
| `Background` | `string \| object` | `''` | |
| `Margin` | `string \| number` | `''` | |
| `HorizontalAlignment` `VerticalAlignment` | `string` | `'Stretch'` | |

Per-child attached properties (plain attributes on the child, case-insensitive):

```vue
<Rectangle Width="80" Height="80"
           VariableSizedWrapGrid.RowSpan="2"
           VariableSizedWrapGrid.ColumnSpan="2" />
```

### v-model

`v-model:Orientation` (`update:Orientation`).

### Slots & slot props

| Slot | Notes |
| --- | --- |
| default | the children — **they are the cells** |
| `<VariableSizedWrapGrid.Resources>` | `<Style TargetType="…"><Setter Property="…" Value="…"/></Style>` defaults applied to matching children |

No slot props.

### Events

`update:Orientation` only.

Exposed: `Orientation` (get/set).

### Gotchas

1. **Not an items control.** No `ItemsSource`, no `ItemTemplate` — write a `v-for` of
   children inside it.
2. **Give it a `Width` and/or `Height`** (or place it in a sized parent): the row/column
   count is derived from the available box ÷ `ItemWidth`/`ItemHeight`, so an
   unbounded box yields one big track.
3. `ItemWidth`/`ItemHeight` are px numbers (or `"44"`). With neither, the **first
   child's** measured size defines the cell for all children.
4. Spans are clamped to `MaximumRowsOrColumns`; the occupancy map is greedy and
   **does not backfill earlier gaps**.
5. Layout is recomputed from DOM measurement with a `ResizeObserver` on each child —
   children that resize cause a re-arrange.
6. Cells are absolutely-positioned by inline `grid-template-*`/transform styles; don't
   CSS-position the children yourself.

### Minimal working SFC

```vue
<template>
  <VariableSizedWrapGrid
    :Width="400"
    ItemWidth="44"
    ItemHeight="44"
    :MaximumRowsOrColumns="3"
    v-model:Orientation="orientation"
  >
    <Rectangle Fill="Red" />
    <Rectangle Height="80" Fill="Blue" VariableSizedWrapGrid.RowSpan="2" />
    <Rectangle Width="80" Fill="Green" VariableSizedWrapGrid.ColumnSpan="2" />
    <Rectangle Width="80" Height="80" Fill="Yellow"
               VariableSizedWrapGrid.RowSpan="2" VariableSizedWrapGrid.ColumnSpan="2" />
  </VariableSizedWrapGrid>
</template>

<script setup>
import { ref } from 'vue'
import VariableSizedWrapGrid from '../../components/VariableSizedWrapGrid.vue'
import Rectangle from '../../components/Rectangle.vue'

const orientation = ref('Vertical')
</script>
```

---

## Appendix A — Scrolling cheat-sheet

| Need | Use |
| --- | --- |
| `scrollTop` continuously while scrolling | `ScrollViewer` `@ViewChanging` → `args.NextView.VerticalOffset` (every frame) |
| `scrollTop` "settled" only | `ScrollViewer` `@ViewChanged` → `args.IsIntermediate === false`, read `sender.VerticalOffset` |
| `scrollTop` from `ScrollView` | `@ViewChanged="(sender) => sender.VerticalOffset"` — **`args` is `{}`** |
| `scrollHeight` | `sender.ExtentHeight`, `sender.ScrollableHeight`, `sender.ViewportHeight` |
| jump to top instantly | `ScrollViewer`: `ref.ChangeView(null, 0, null, true)`; `ScrollView`: `ref.ScrollTo(0, 0, { AnimationMode: 'Disabled' })` |
| animate a scroll | `ScrollViewer.ChangeView(h, v)`; `ScrollView.ScrollTo(h, v, { AnimationMode: 'Enabled' })` |
| let a list scroll internally | give the list `Height` (or `MaxHeight`) |

## Appendix B — Quick answers to the three "must nail" questions

1. **Plain array of objects + reading each item.** `:ItemsSource="rows"` (Vue binding);
   item body uses `{x:Bind PropName}` — the item's own property names, no slot props,
   no destructuring (`{x:Bind}` alone yields the whole item). The template is declared
   as a *property element*: `<X.ItemTemplate><DataTemplate>…</DataTemplate></X.ItemTemplate>`
   or `ItemTemplate="{StaticResource Key}"` with a `<Page.Resources>` `DataTemplate`.
2. **Selection.** `v-model:SelectedIndex` / `v-model:SelectedItem` /
   `v-model:SelectedItems` plus `@SelectionChanged`. `ListView` args =
   `{ AddedItems, RemovedItems, SelectedItems }`; `GridView` adds
   `SelectedItem`/`SelectedIndex`/`OriginalSource`; `FlipView` and `ListBox` include
   `SelectedIndex`/`SelectedItem`; `ItemsRepeater`, `ItemsControl`, `ItemContainer`
   and `VariableSizedWrapGrid` have **no** selection of their own.
3. **Scroll event + `scrollTop`.** Yes: `ScrollView` emits `ViewChanged` with an empty
   `args` (read `sender.VerticalOffset`); `ScrollViewer` emits `ViewChanging`
   (`args.NextView.VerticalOffset`, per frame) and `ViewChanged`
   (`args.IsIntermediate`, read the sender or the `ViewChanging` args).
   `GridView` item width/height is **not** a prop — it lives on
   `<ItemsWrapGrid ItemWidth ItemHeight MaximumRowsOrColumns Orientation>` inside
   `<GridView.ItemsPanel>`.
