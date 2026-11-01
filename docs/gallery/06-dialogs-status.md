# 06 — Dialogs & status (WinUIonWeb)

Precise reference for twelve WinUIonWeb components, derived from their source and from the Gallery pages that demo them.

**Controls covered (and nothing else):** `ContentDialog`, `TeachingTip`, `ToolTip`, `ToolTipService`, `Popup`, `InfoBar`, `InfoBarPanel`, `InfoBadge`, `ProgressBar`, `ProgressRing`, `Expander`, `AnimatedIcon`.

**Sources read**

| Control | Component source | Gallery page |
| --- | --- | --- |
| ContentDialog | `src/components/ContentDialog.vue` (+ `contentDialogRuntime.ts`) | `src/gallery/pages/ContentDialogPage.vue` |
| TeachingTip | `src/components/TeachingTip.vue` (+ `TeachingTipProperties.ts`, `teachingTipPlacement.ts`) | `src/gallery/pages/TeachingTipPage.vue` |
| ToolTip | `src/components/ToolTip.vue` (+ `ToolTipServiceProperties.ts`, `toolTipRuntime.ts`) | `src/gallery/pages/ToolTipPage.vue` |
| ToolTipService | `src/components/ToolTipService.vue` | `src/gallery/App.vue` (`<ToolTipService />`), `src/gallery/pages/ToolTipPage.vue` |
| Popup | `src/components/Popup.vue` (+ `popupRuntime.ts`) | `src/gallery/pages/PopupPage.vue` |
| InfoBar | `src/components/InfoBar.vue` (+ `InfoBarProperties.ts`) | `src/gallery/pages/InfoBarPage.vue` |
| InfoBarPanel | `src/components/InfoBarPanel.vue` | used inside `InfoBar.vue` (no standalone page) |
| InfoBadge | `src/components/InfoBadge.vue` (+ `IconSource.ts`) | `src/gallery/pages/InfoBadgePage.vue` |
| ProgressBar | `src/components/ProgressBar.vue` (+ `progressRuntime.ts`) | `src/gallery/pages/ProgressBarPage.vue` |
| ProgressRing | `src/components/ProgressRing.vue` (+ `progressRuntime.ts`) | `src/gallery/pages/ProgressRingPage.vue` |
| Expander | `src/components/Expander.vue` (+ `ExpanderBase.vue`, `ExpanderProperties.ts`) | `src/gallery/pages/ExpanderPage.vue` |
| AnimatedIcon | `src/components/AnimatedIcon.vue` (+ `animatedIconRuntime.ts`, `animatedIconVisuals.ts`) | `src/gallery/pages/AnimatedIconPage.vue` |

---

## 0. Conventions that apply to every control below

1. **Prop casing is XAML casing, verbatim.** `IsOpen`, `PrimaryButtonText`, `IsIndeterminate`, `PreferredPlacement`, `HorizontalOrientationPadding`. Names are case-sensitive as written in the source. Do not "Vueify" them (`:is-open` is **not** the prop `IsOpen`; Vue will treat it as a fallthrough attribute).
2. **Import paths.** All twelve are named exports of the package entry (`src/index.ts`), e.g. `import { InfoBar } from 'winuionweb'` (package `winuionweb`, v0.2.0). Gallery pages import the SFC directly with a relative path (`import InfoBar from '../../components/InfoBar.vue'`). Snippets below use `@/components/…`, which is `src/components/…`.
3. **Global registration.** `WinUIOnWeb.install(app)` / `registerWinUIComponents(app)` registers both the control tag and its XAML **property-element tags** (`InfoBar.ActionButton`, `TeachingTip.HeroContent`, `Expander.Header`, `Popup.Child`, `AnimatedIcon.Source`, `ContentDialog.Title`, `ToolTipService.ToolTip`, …) plus the animated-visual source tags. With local `import`s, `<InfoBar.ActionButton>` resolves through the default export's member (`export default { ActionButton: … }`), which also works.
4. **String-valued XAML properties.** Colour/brush/corner/thickness props take XAML-ish strings and accept theme-resource tokens such as `'{ThemeResource ControlCornerRadius}'`; the renderer resolves them, so both `'#C42B1C'` and `'{ThemeResource …}'` are valid.
5. **Event naming.** These controls dispatch several XAML events by reading `instance.vnode.props['on' + Name]` (and, secondarily, a same-named attribute resolved in page scope) instead of `emit()`. **Write the listener with the exact PascalCase source name** (`@PrimaryButtonClick`, `@CloseButtonClick`, `@Closing`, `@Opened`, `@Expanding`). Handlers receive `(sender, args)` — never a bare payload.
6. **`update:*` events are real `emit()`s**; `v-model:PropName` therefore works wherever a control emits `update:…`. Which props support it is listed per control.
7. **Teleporting controls.** `ContentDialog` (placement `Popup`), `TeachingTip`, `ToolTip`, `Popup` render into a portal at `document.body` (or the fullscreen element). They are positioned in viewport coordinates and are not clipped by the declaring layout.
8. **XAML value resolution.** Every prop value passes through `resolveXamlValue`, so a raw string that looks like `'{x:Bind Foo}'` / `'{ThemeResource X}'` is resolved against the surrounding page scope. Use plain values in ordinary Vue code.

---

## 1. ContentDialog

Import name: **`ContentDialog`** (`src/components/ContentDialog.vue`, `defineOptions({ name: 'ContentDialog' })`).

### Is it declarative or imperative?

**Imperative.** There is **no `IsOpen` prop and no `v-model:isOpen`** for `ContentDialog` in this implementation. You open it by calling the exposed **`ShowAsync()`** method on a template ref (or on the `sender` handed to `@Loaded`), and it resolves with the dialog result:

```ts
ShowAsync(value: 'Popup' | 'InPlace' | 'UnconstrainedPopup' = 'Popup'): Promise<'Primary' | 'Secondary' | 'None'>
Hide(): void   // closes with result 'None'
```

`'Popup'` (default) covers the viewport with a smoke layer; `'InPlace'` renders inline inside the host's parent with no smoke layer; `'UnconstrainedPopup'` is accepted as a placement and behaves like Popup for bounds purposes.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Title` | `String \| Number \| Object` | `''` | Dialog title. Rich content goes in `<ContentDialog.Title>`. |
| `Content` | `String \| Number \| Object` | `''` | Body. Strings render as wrapping `TextBlock`. |
| `TitleTemplate` | `String \| Object \| Function` | `undefined` | `DataTemplate`/function/component rendering `Title`. |
| `ContentTemplate` | `String \| Object \| Function` | `undefined` | `DataTemplate`/function/component rendering `Content`. |
| `PrimaryButtonText` | `String \| Number` | `''` | Text of the primary button; empty ⇒ button not rendered. |
| `SecondaryButtonText` | `String \| Number` | `''` | Text of the secondary button; empty ⇒ not rendered. |
| `CloseButtonText` | `String \| Number` | `''` | Text of the close button; empty ⇒ not rendered. |
| `PrimaryButtonStyle` | `String \| Object` | `'{ThemeResource DefaultButtonStyle}'` | Button style; overridden to `AccentButtonStyle` while this is the `DefaultButton` and not focused. |
| `SecondaryButtonStyle` | `String \| Object` | `'{ThemeResource DefaultButtonStyle}'` | Same rule. |
| `CloseButtonStyle` | `String \| Object` | `'{ThemeResource DefaultButtonStyle}'` | Same rule. |
| `PrimaryButtonCommand` | `Object \| Function \| String` | `undefined` | `ICommand`/function run after the click event, before closing. `CanExecute` gates the button. |
| `SecondaryButtonCommand` | `Object \| Function \| String` | `undefined` | Same. |
| `CloseButtonCommand` | `Object \| Function \| String` | `undefined` | Same. |
| `PrimaryButtonCommandParameter` | `null` (any) | `undefined` | Parameter passed to the command. |
| `SecondaryButtonCommandParameter` | `null` (any) | `undefined` | Same. |
| `CloseButtonCommandParameter` | `null` (any) | `undefined` | Same. |
| `DefaultButton` | `String` | `'None'` | Which button is default: `'Primary'`, `'Secondary'`, `'Close'`, `'None'`. Gets the accent style; focused first when there is no focusable content; `Enter` invokes it. |
| `IsEnabled` | `Boolean \| String` | `true` | Disables body (`inert`) and all buttons. |
| `IsPrimaryButtonEnabled` | `Boolean \| String` | `true` | Combined with `IsEnabled` and the command's `CanExecute`. |
| `IsSecondaryButtonEnabled` | `Boolean \| String` | `true` | Same. |
| `FullSizeDesired` | `Boolean \| String` | `false` | Stretches the dialog to the full max height (756px cap). |
| `RequestedTheme` | `String` | `'Default'` | `'Light'` / `'Dark'` / `'Default'` (inherits surrounding theme). |
| `XamlRoot` | `Object \| String` | `undefined` | Element (or object with `$el`/`Content`) used as the root for bounds, focus isolation and the one-dialog-per-root rule. |
| `Style` | `String \| Object` | `'{StaticResource DefaultContentDialogStyle}'` | Declared for parity; the DOM renderer does not consume it (chrome comes from CSS variables). |
| `Foreground` | `String` | `'{ThemeResource ContentDialogForeground}'` | Text colour. |
| `Background` | `String` | `'{ThemeResource ContentDialogBackground}'` | Dialog surface colour. |
| `BorderBrush` | `String` | `'{ThemeResource ContentDialogBorderBrush}'` | Border colour. |
| `BorderThickness` | `String \| Number` | `'{ThemeResource ContentDialogBorderWidth}'` | Border thickness. |
| `CornerRadius` | `String \| Number` | `'{ThemeResource OverlayCornerRadius}'` | Corner radius. |
| `FlowDirection` | `String` | `'LeftToRight'` | `'RightToLeft'` sets `dir="rtl"` on the container. |

There is **no `IsCloseButtonEnabled`** prop; the close button is enabled iff `IsEnabled` and `CloseButtonCommand.CanExecute` allow it.

### v-model

None. Exposed API (template ref): `ShowAsync`, `Hide`, and every prop as a writable ref (`dialog.value.PrimaryButtonText = 'Delete'` works and re-renders).

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Dialog body content (anything not a property element). |
| `<ContentDialog.Title>` | Rich title content; replaces `Title`. Title text is clamped to 2 lines, 20px/SemiBold. |
| `<ContentDialog.Content>` | Rich body content; replaces `Content`. |
| `<ContentDialog.TitleTemplate>` | Template applied to `Title`. |
| `<ContentDialog.ContentTemplate>` | Template applied to `Content`. |

No slot props. Property elements produce **no** extra layout box (they are unboxed into the corresponding outlet).

### Events

All are `(sender, args)`.

| Event | Args |
| --- | --- |
| `PrimaryButtonClick` | `{ Cancel: boolean, GetDeferral() }` (no `Result`) |
| `SecondaryButtonClick` | `{ Cancel: boolean, GetDeferral() }` |
| `CloseButtonClick` | `{ Cancel: boolean, GetDeferral() }` |
| `Closing` | `{ Cancel: boolean, Result: 'Primary' \| 'Secondary' \| 'None', GetDeferral() }` |
| `Closed` | `{ Result }` |
| `Opened` | `{}` |
| `Loaded` | `{ OriginalSource: sender }` — fires on mount, before the dialog is shown. Gallery uses this to capture the sender for `ShowAsync`. |

`args.Cancel = true` vetoes the close in that button's event and in `Closing`. `GetDeferral()` keeps the event alive until `Complete()`.

### Gotchas

- **No declarative open/close.** `:IsOpen` does nothing (there is no such prop); until `ShowAsync()` runs the component only renders a hidden `<span>` host and no dialog surface at all. Don't reach for `v-model:isOpen`.
- **`ShowAsync` rejects** (not resolves) when: the placement string is invalid, an operation is already pending on that instance, or the component's host is not connected to the document. The promise **resolves `'None'`** for Escape/Hide, not reject.
- **One dialog per root**: `acquireContentDialog` throws `'Only one ContentDialog may be open in a XamlRoot at a time.'` — a second `ShowAsync` while another dialog is open on the same root rejects.
- Results: `'Primary'` / `'Secondary'` from those buttons; **`'None'`** for the close button, `Hide()` and Escape (Escape clicks the close button when `CloseButtonText` is set, otherwise hides).
- Body/buttons are inside a fixed overlay at `z-index: 10000`; the rest of the page is set `inert` while open, and focus is trapped (Tab cycles, Escape closes, Enter activates `DefaultButton` unless focus is in a button/textarea/contenteditable).
- Defaults that surprise people: `DefaultButton` is `'None'` (no accent button, Escape still closes), and all three button texts default to `''` (no buttons at all).
- If you rely on `@Loaded` for the sender, remember the sender object is the same shape as the template ref (`ShowAsync`, `Hide`, props as refs).
- Unmounting while open resolves the pending promise with `'None'` and releases the root lock.

### Minimal working SFC — "delete post?" confirmation

```vue
<template>
  <Button Content="Delete post" @Click="askDelete" />

  <ContentDialog
    ref="dialog"
    Title="Delete post?"
    PrimaryButtonText="Delete"
    SecondaryButtonText="Keep"
    CloseButtonText="Cancel"
    DefaultButton="Secondary"
    @PrimaryButtonClick="onPrimaryClick">
    <TextBlock Text="This post and its photos will be permanently removed. This can't be undone." TextWrapping="Wrap" />
  </ContentDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/Button.vue'
import ContentDialog from '@/components/ContentDialog.vue'
import TextBlock from '@/components/TextBlock.vue'

type DialogResult = 'Primary' | 'Secondary' | 'None'
const dialog = ref<{ ShowAsync: () => Promise<DialogResult> } | null>(null)
const deleted = ref(0)

const onPrimaryClick = (_sender: unknown, args: { Cancel: boolean }) => {
  // args.Cancel = true would keep the dialog open
}

const askDelete = async () => {
  const result = await dialog.value!.ShowAsync()   // 'Popup' placement
  if (result === 'Primary') deleted.value += 1     // 'Secondary' | 'None' => no-op
}
</script>
```

---

## 2. TeachingTip

Import name: **`TeachingTip`** (`defineOptions({ name: 'TeachingTip' })`).

### How it targets an element

`Target` (`Object | String`, default `null`) is resolved by `resolvePopupElement()`, which accepts:

- a real **`HTMLElement`**;
- any object exposing **`$el`**, **`Element`** or **`value`** that is an `HTMLElement` — so a **template ref to a component** (`<Button ref="btn">` → `:Target="btn"`) or to a plain element works;
- as a **gallery/XAML convenience only**: the string form `'{x:Bind Name}'`, which is looked up as `[data-xaml-ref="Name"]` inside the closest `.example-display`.

A plain CSS selector string (`'#my-button'`) is **not** supported — `Target` stays unresolved and the tip falls back to an unanchored tip.

With a target: the tail points at the target centre, `PreferredPlacement` decides the side, and the tip re-positions on scroll/resize/target resize. Without a target: the tip is placed inside the root bounds (or viewport) by `PreferredPlacement`, centred by default, and `TailVisibility` collapses the tail.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsOpen` | `Boolean \| String` | `undefined` | Open state. `undefined` means "not supplied" (starts closed, still controlled internally). |
| `Target` | `Object \| String` | `null` | Anchor element (see above). |
| `Title` | `String` | `''` | Bold title line. |
| `Subtitle` | `String` | `''` | Secondary line under the title. |
| `Content` | `String \| Number \| Object` | `null` | Main content; strings render as an inline text span. |
| `HeroContent` | `String \| Number \| Object` | `null` | Hero area (image/etc.) above/below the content, per `HeroContentPlacement`. |
| `ActionButtonContent` | `String \| Number \| Object` | `null` | Text/content of the action button; `null` ⇒ no action button. |
| `CloseButtonContent` | `String \| Number \| Object` | `null` | Text/content of the close button; `null` ⇒ no close button (a subtle ✕ "alternate close" appears instead unless light dismiss is on). |
| `ActionButtonStyle` | `String \| Object` | `'{ThemeResource DefaultButtonStyle}'` | Action button style. |
| `CloseButtonStyle` | `String \| Object` | `'{ThemeResource DefaultButtonStyle}'` | Close button style. |
| `ActionButtonCommand` | `Function \| Object \| String` | `null` | Runs before `ActionButtonClick`; `CanExecute` respected. |
| `ActionButtonCommandParameter` | any | `null` | Command parameter. |
| `CloseButtonCommand` | `Function \| Object \| String` | `null` | Runs before `CloseButtonClick`. |
| `CloseButtonCommandParameter` | any | `null` | Command parameter. |
| `IconSource` | `String \| Object` | `null` | Icon source; `{ Symbol: 'Refresh' }` or a bare string renders a `SymbolIcon`. |
| `TailVisibility` | `String` | `'Auto'` | `'Auto'` (tail when there is a target), `'Visible'` (always), `'Collapsed'` (never). |
| `PreferredPlacement` | `String` | `'Auto'` | `Top`, `Bottom`, `Left`, `Right`, `TopLeft`, `TopRight`, `BottomLeft`, `BottomRight`, `LeftTop`, `LeftBottom`, `RightTop`, `RightBottom`, `Center`. Invalid/`'Auto'` ⇒ `Top` with a target, `Bottom` without. |
| `PlacementMargin` | `String \| Number \| Object` | `0` | Gap between target and tip (Thickness: number, `'h,v'`, `'l,t,r,b'`, or `{Left,Top,Right,Bottom}`). |
| `ShouldConstrainToRootBounds` | `Boolean \| String` | `true` | Clamp inside the nearest `[data-xaml-root]` (viewport if absent). |
| `IsLightDismissEnabled` | `Boolean \| String` | `false` | Adds a full-screen transparent dismiss surface, moves focus into the tip, closes on outside pointerdown / Escape. |
| `HeroContentPlacement` | `String` | `'Auto'` | `'Top'` / `'Bottom'` / `'Auto'` (depends on tail side). |
| `RequestedTheme` | `String` | `'Default'` | Light/Dark override. |
| `Background` | `String` | `'{ThemeResource TeachingTipBackgroundBrush}'` | Surface brush (replaced by `TeachingTipTransientBackground` when light dismiss is enabled). |
| `Foreground` | `String` | `'{ThemeResource TeachingTipForegroundBrush}'` | Text brush. |
| `BorderBrush` | `String` | `'{ThemeResource TeachingTipBorderBrush}'` | Border brush (also strokes the tail). |
| `BorderThickness` | `String \| Number` | `1` | Border thickness. |
| `CornerRadius` | `String \| Number` | `'{ThemeResource OverlayCornerRadius}'` | Corner radius. |

### v-model

`v-model:IsOpen` — supported (`emit('update:IsOpen', value)` on every open/close, including internal light-dismiss and close-button closes).

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Main content (equivalent to `Content`). |
| `<TeachingTip.Content>` | Main content. |
| `<TeachingTip.HeroContent>` | Hero content. |
| `<TeachingTip.IconSource>` | Icon source element (e.g. `<SymbolIconSource Symbol="Refresh" />`). |
| `<TeachingTip.ActionButtonContent>` | Action button content. |
| `<TeachingTip.CloseButtonContent>` | Close button content. |

No slot props.

### Events

`(sender, args)`; `sender` is the public API object.

| Event | Args |
| --- | --- |
| `ActionButtonClick` | `null` |
| `CloseButtonClick` | `null` |
| `Closing` | `{ Reason: 'CloseButton' \| 'LightDismiss' \| 'Programmatic', Cancel: boolean, GetDeferral() }` |
| `Closed` | `{ Reason }` |
| `Opened` | `{}` |
| `update:IsOpen` | `boolean` |

### Gotchas

- `Closing` runs **before** the close animation; set `args.Cancel = true` (optionally after `GetDeferral().Complete()`) to abort. The tip then re-opens itself.
- Always paired with `v-model:IsOpen`. A one-way `:IsOpen="true"` that is never updated by the parent will not reopen after the user closes it (the component writes `false` back through the XAML binding only).
- The tip is a `position: fixed` portal with `z-index: 2147483646`; the light-dismiss surface sits one z-index below. While it is up, clicks outside are swallowed — that is intentional (WinUI transient behaviour).
- `IsLightDismissEnabled` also focuses the first focusable inside the tip and restores focus on close; F6 toggles between tip and the previously focused element.
- Content taller than the available space scrolls inside the tip (`TeachingTipMaxHeight`, 520px cap by default).
- The alternate ✕ close button only exists when there is no `CloseButtonContent` **and** light dismiss is off.
- The gallery opens tips by assigning to a name-scope object (`names.TestButton1TeachingTip.IsOpen = true`) — that is the x:Bind emulation, not the recommended plain-Vue pattern.

### Minimal working SFC — targeting a button

```vue
<template>
  <Button ref="anchor" Content="Show tip" @Click="open = true" />

  <TeachingTip
    v-model:IsOpen="open"
    :Target="anchor"
    Title="Sync your files"
    Subtitle="Keep every device up to date"
    IconSource="Refresh"
    PreferredPlacement="Bottom"
    PlacementMargin="8"
    ActionButtonContent="Sync now"
    CloseButtonContent="Dismiss"
    @ActionButtonClick="sync"
    @CloseButtonClick="open = false">
    <TextBlock Text="Syncing uploads changes from this device only." TextWrapping="Wrap" />
  </TeachingTip>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/Button.vue'
import TeachingTip from '@/components/TeachingTip.vue'
import TextBlock from '@/components/TextBlock.vue'

const open = ref(false)
const anchor = ref<unknown>(null)          // component ref: resolves through $el
const sync = () => { open.value = false }
</script>
```

---

## 3. ToolTip

Import name: **`ToolTip`**. Also available as `ToolTip.Content`, `ToolTip.ContentTemplate`, `ToolTip.ContentTransitions` property elements.

### How it attaches to a child

Two supported ways, both requiring the **`ToolTipService` host** (see §4) for automatic hover/focus behaviour:

1. **Attached string property** — `ToolTipService.ToolTip="text"` on any element/component. The renderer ends up with a `tooltipservice.tooltip` attribute on the owner element; the service finds the owner by walking up from the event target to the nearest such attribute, then shows either the owner's registered `ToolTip` object or its own fallback `ToolTip`.
2. **Attached object property element** — put a full `<ToolTip …>` inside `<ToolTipService.ToolTip>` as a child of the owner:

```vue
<TextBlock Text="Hover me">
  <ToolTipService.ToolTip>
    <ToolTip Content="Long text" Placement="Right" VerticalOffset="-8" />
  </ToolTipService.ToolTip>
</TextBlock>
```

The `ToolTipService.ToolTip` wrapper finds the nearest ancestor component's root element, publishes it to the `ToolTip` (via provide/inject), and renders nothing of its own — so the owner's layout is untouched. Components that hoist XAML property elements (e.g. `Button`) keep the wrapper out of their content slot.

A standalone `<ToolTip IsOpen PlacementTarget=…>` works too, but **needs a target**: with neither an attached owner nor `PlacementTarget`, positioning never runs and the popup stays `visibility: hidden`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `String \| Number \| Object` | `''` | Tooltip content; strings render as a wrapping `TextBlock`. |
| `ContentTemplate` | `String \| Object \| Function` | `null` | Template for `Content` (DataTemplate/function/component or resource key). |
| `ContentTransitions` | `String \| Object \| Array` | `null` | Accepted for parity; no transition collection support. |
| `IsOpen` | `Boolean \| String` | `false` | Open state (also driven by the service). |
| `IsEnabled` | `Boolean \| String` | `true` | When false the tip can never open. |
| `Placement` | `String` | `'Top'` | `Top`, `Bottom`, `Left`, `Right`, `Mouse`. Falls back to the opposite side when it does not fit. |
| `PlacementTarget` | `Object \| String` | `null` | Explicit target element (element, object with `$el`/`Element`/`value`, `data-xaml-ref` name, or CSS selector). Overrides the attached owner. |
| `PlacementRect` | `Object \| String` | `null` | Sub-rectangle of the target to point at: `'x,y,w,h'` or `{ X, Y, Width, Height }`. |
| `HorizontalOffset` | `String \| Number` | `undefined` | Horizontal offset. `undefined` ⇒ auto per input mode (mouse 20, touch 44, keyboard 12). |
| `VerticalOffset` | `String \| Number` | `undefined` | Vertical offset, same auto rule. |
| `Background` | `String \| Object` | `'{ThemeResource ToolTipBackgroundBrush}'` | Surface brush (acrylic pipeline). |
| `Foreground` | `String \| Object` | `'{ThemeResource ToolTipForegroundBrush}'` | Text brush. |
| `BorderBrush` | `String \| Object` | `'{ThemeResource ToolTipBorderBrush}'` | Border brush. |
| `BorderThickness` | `String \| Number` | `1` | Border thickness. |
| `Padding` | `String \| Number` | `'9,6,9,8'` | Padding (XAML Thickness). |
| `FontFamily` | `String` | `'{ThemeResource ContentControlThemeFontFamily}'` | Font family. |
| `FontSize` | `String \| Number` | `12` | Font size. |
| `MaxWidth` | `String \| Number` | `320` | Max width, also clamped to the viewport. |
| `MaxHeight` | `String \| Number` | `''` | Max height; empty ⇒ viewport height. |
| `Width` / `Height` | `String \| Number` | `''` | Explicit size. |
| `CornerRadius` | `String \| Number` | `'{ThemeResource ControlCornerRadius}'` | Corner radius. |
| `BackgroundSizing` | `String` | `'InnerBorderEdge'` | `'InnerBorderEdge'` ⇒ `background-clip: padding-box`, otherwise `border-box`. |
| `HorizontalContentAlignment` | `String` | `'Left'` | Content alignment (Left/Center/Right/Stretch). |
| `VerticalContentAlignment` | `String` | `'Top'` | Content alignment (Top/Center/Bottom/Stretch). |
| `RequestedTheme` | `String` | `'Default'` | Light/Dark override. |

### v-model

`v-model:IsOpen` — supported (`update:IsOpen`).

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Tooltip content (rendered instead of `Content`). |
| `<ToolTip.Content>` | Tooltip content. |
| `<ToolTip.ContentTemplate>` | Content template. |
| `<ToolTip.ContentTransitions>` | Accepted, unused. |

No slot props.

### Events

| Event | Args |
| --- | --- |
| `Opened` | `(sender, {})` |
| `Closed` | `(sender, {})` |
| `update:IsOpen` | `boolean` |

### Exposed API

`Controller` (the service contract: `Open(mode, point)`, `Close()`, `IsOpen()`, `IsEnabled()`, `Element()`, `UpdatePosition()`), `IsOpen`, `TemplateSettings`, `show()`, `hide()`, `updatePosition()`.

### Gotchas

- **Needs `ToolTipService` mounted** (once, near the app root) for hover/focus opening and for `ToolTipService.ToolTip` strings. Without it, only an explicitly controlled `IsOpen` with a `PlacementTarget` shows anything.
- The tooltip is rendered in the **top layer** (`popover="manual"`) and is `pointer-events: none`, so it never blocks its owner.
- Service timing (from `ToolTipService_Partial`): first hover ≈800 ms (2×400), reshow after a recent close ≈600 ms, keyboard focus ≈800 ms, close delay 167 ms, touch auto-close 5000 ms, "between shows" 200 ms.
- It **removes the owner's `title` attribute** while attached (restored on unmount) and adds `aria-describedby` while open — don't also set `title`, it will be stripped.
- Unresolved binding text is ignored: values matching `{x:Bind …}`/`{Binding …}` or `[object Object]` are treated as "no tooltip" and the owner is skipped.
- Disabled owners (`:disabled`, `[aria-disabled="true"]`, or containing a disabled element) never show a service tooltip.
- Over-long text is clamped to `MaxWidth` (320 px default) and the viewport; `MaxHeight` empty means "as tall as the viewport".
- `Placement="Mouse"` follows the pointer (offset `+11px` vertically).

### Minimal working SFC

```vue
<template>
  <Button Content="Save" ToolTipService.ToolTip="Save the document (Ctrl+S)" />
  <Button Content="Share" ToolTipService.ToolTip="Invite people to edit" />

  <TextBlock Text="Offset tooltip target" VerticalAlignment="Center">
    <ToolTipService.ToolTip>
      <ToolTip Content="Offset ToolTip." Placement="Top" VerticalOffset="-80" />
    </ToolTipService.ToolTip>
  </TextBlock>
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import TextBlock from '@/components/TextBlock.vue'
import ToolTip from '@/components/ToolTip.vue'
// <ToolTipService /> must be mounted once by the app shell (see §4).
</script>
```

---

## 4. ToolTipService

Import name: **`ToolTipService`** (`src/components/ToolTipService.vue`).

It is **not a wrapper control**: it renders a hidden `<span>` plus one fallback `<ToolTip>`, and installs document-level pointer/keyboard/focus/MutationObserver listeners that implement WinUI's service behaviour for every element carrying a `tooltipservice.tooltip` attribute.

### Props

**None.** The component declares zero props; anything passed becomes a fallthrough attribute on the hidden host span.

### v-model

None.

### Slots / property elements

| Tag | Behaviour |
| --- | --- |
| `<ToolTipService.ToolTip>` | Attached-property wrapper (`ToolTipServiceProperties.ts`). Renders its default slot into a `Fragment` (no element), publishes the nearest ancestor component's root element to a nested `<ToolTip>`, and marks the owner so its tooltip is registered. This is also a registered global tag (`app.component('ToolTipService.ToolTip', …)`); with local imports use `import { ToolTipServiceToolTip } from '@/components/ToolTipServiceProperties'`. |

No slot props.

### Events

None emitted. (`ToolTip` raises `Opened`/`Closed`.)

### Gotchas

- Mount **exactly one** `<ToolTipService />` per document/window, in the app shell. Gallery does it in `src/gallery/App.vue`; `TitleBarWindow.vue`/`TitleBarDragRegionsWindow.vue` mount their own for secondary windows.
- It observes `document.body` for `tooltipservice.tooltip`, `tooltipservice.placement`, `tooltipservice.placementtarget`, `class`, `disabled`, `aria-disabled`, plus subtree childList changes — elements added later are picked up automatically, and `title` attributes are stripped/synced.
- Third attribute form: `tooltipservice.placement="Bottom"` on the owner overrides `Placement`; `tooltipservice.placementtarget` overrides the target.
- It suppresses tooltips for disabled owners and for event targets inside a currently open tooltip except within the "safe zone" convex hull (so the pointer can travel from owner to popup without flicker).
- Because it listens on the document, tooltips work for content inside portals/dialogs too.
- No styling surface: colours/sizes come from the `ToolTip` instance it drives (fallback uses `Content` from the attribute value).

### Minimal working SFC

```vue
<template>
  <ToolTipService />                          <!-- once, in the app shell -->
  <Button Content="Hover for a tip" ToolTipService.ToolTip="From the service" />
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import ToolTipService from '@/components/ToolTipService.vue'
</script>
```

---

## 5. Popup

Import name: **`Popup`**. Property elements: `Popup.Child`, `Popup.Shadow`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsOpen` | `Boolean \| String` | `undefined` | Open state. `undefined` ⇒ closed until the exposed `IsOpen` is set; a supplied value is mirrored into internal state. |
| `Child` | `Object \| String` | `undefined` | The single child UIElement. When omitted, the default slot / `<Popup.Child>` supplies it. |
| `Shadow` | `Object \| String` | `null` | `ThemeShadow` cast by the popup (delegated to a shadow host beside the child). |
| `Translation` | `Object \| String` | `{ X: 0, Y: 0, Z: 0 }` | Translation applied to the popup root (`{X,Y,Z}` or `'x,y,z'`). |
| `HorizontalOffset` | `Number \| String` | `0` | Offset from the declaring layout origin (or from the placement target). |
| `VerticalOffset` | `Number \| String` | `0` | Same, vertical. |
| `IsLightDismissEnabled` | `Boolean \| String` | `false` | Dismiss on outside pointerdown / Escape. |
| `LightDismissOverlayMode` | `String` | `'Off'` | `'On'` also paints a smoke overlay while light dismiss is enabled. |
| `ShouldConstrainToRootBounds` | `Boolean \| String` | `true` | Clamp to the nearest `[data-xaml-root]` (else viewport). |
| `PlacementTarget` | `Object \| String` | `null` | Anchor element; with a non-`Auto` `DesiredPlacement` the popup is placed against it. |
| `DesiredPlacement` | `String` | `'Auto'` | `Auto`, `Top`, `Bottom`, `Left`, `Right`, `Full`, and `…Left`/`…Right`/`…Top`/`…Bottom` variants. Ignored unless `PlacementTarget` is set. |
| `RequestedTheme` | `String` | `'Default'` | Light/Dark override. |
| `FlowDirection` | `String` | `'LeftToRight'` | `RightToLeft` mirrors placement and sets `dir="rtl"`. |

### v-model

- `v-model:IsOpen` (primary), plus `v-model:Child`, `v-model:Shadow`, `v-model:Translation` (`update:*` are emitted).

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | The popup's child content (rendered inside the portal). |
| `<Popup.Child>` | Same, as a property element. |
| `<Popup.Shadow>` | `ThemeShadow` resource/object for the popup. |

No slot props. Attached layout attributes on the declaring `<Popup>` (`Grid.Row`, `Canvas.Left`, `Margin`, `HorizontalAlignment`, `VerticalAlignment`, `data-xaml-ref`) are kept on a zero-sized origin marker so the popup inherits the declaration's transform.

### Events

| Event | Args |
| --- | --- |
| `Opened` | `(sender, {})` |
| `Closed` | `(sender, {})` |
| `ActualPlacementChanged` | `(sender, {})` |
| `update:IsOpen` / `update:Child` / `update:Shadow` / `update:Translation` | new value |

### Exposed API

`IsOpen`, `ActualPlacement`, `Child`, `Shadow`, `Translation`, `HorizontalOffset`, `VerticalOffset`, `PlacementTarget`, `DesiredPlacement`, `IsLightDismissEnabled`, `LightDismissOverlayMode`, `RequestedTheme`, `FlowDirection`, `ShouldConstrainToRootBounds`, `IsConstrainedToRootBounds`, `Element`.

### Gotchas

- Content is teleported to `document.body` but **positioned at the declaring element's origin + offsets** — it is not auto-anchored to the click point. Use `PlacementTarget` + `DesiredPlacement` for anchored placement.
- The popup root is `position: fixed; z-index: 2147483646`; the light-dismiss overlay is `2147483645`.
- While closed the content is kept in a hidden storage element (`display: none`, `inert`, `aria-hidden`) so bindings stay alive — child components are not unmounted.
- With light dismiss on, focus moves into the popup on open and is restored on close, Tab is trapped, Escape closes.
- `Shadow` is ignored when the child already casts its own `ThemeShadow`.
- Only `update:IsOpen`, `update:Child`, `update:Shadow` and `update:Translation` are emitted. `HorizontalOffset` / `VerticalOffset` / `LightDismissOverlayMode` / `DesiredPlacement` are writable through the exposed refs (`popup.value.HorizontalOffset = 40`) or the prop, but they are **not** v-model-able.

### Minimal working SFC

```vue
<template>
  <Button Content="Show popup" @Click="open = true" />

  <Popup v-model:IsOpen="open" :HorizontalOffset="200" :VerticalOffset="0" IsLightDismissEnabled>
    <Border Padding="16" Background="{ThemeResource AcrylicBackgroundFillColorDefaultBrush}" CornerRadius="{StaticResource OverlayCornerRadius}">
      <StackPanel Spacing="8">
        <TextBlock FontSize="16" Text="Simple Popup" />
        <Button Content="Close" @Click="open = false" />
      </StackPanel>
    </Border>
  </Popup>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Border from '@/components/Border.vue'
import Button from '@/components/Button.vue'
import Popup from '@/components/Popup.vue'
import StackPanel from '@/components/StackPanel.vue'
import TextBlock from '@/components/TextBlock.vue'

const open = ref(false)
</script>
```

---

## 6. InfoBar

Import name: **`InfoBar`**. Property elements: `InfoBar.ActionButton`, `InfoBar.Content`, `InfoBar.ContentTemplate`, `InfoBar.IconSource`.

### Severity values

`Severity: String | Number = 'Informational'`. Accepted strings: **`'Informational'`, `'Success'`, `'Warning'`, `'Error'`** (anything else coerces to `'Informational'`). Accepted numbers map positionally: `0 → Informational`, `1 → Success`, `2 → Warning`, `3 → Error`. Each severity selects `--InfoBar<Severity>SeverityBackgroundBrush`, icon background/foreground, and a Segoe glyph (Informational `\uF13F`, Success `\uF13E`, Warning `\uF13C`, Error `\uF13D`). `Error`/`Warning` also make the live region `aria-live="assertive"` (others `polite`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsOpen` | `Boolean \| String` | `false` | Visibility of the bar; false ⇒ `display: none` + `aria-hidden`. |
| `Title` | `String` | `''` | Title line. |
| `Message` | `String` | `''` | Message line. |
| `Severity` | `String \| Number` | `'Informational'` | See above. |
| `IconSource` | `null` (any) | `null` | Custom icon (`FontIcon`/`SymbolIcon`/`PathIcon`/image object or VNode); replaces the severity glyph. |
| `IsIconVisible` | `Boolean \| String` | `true` | Hides the icon column entirely when false. |
| `IsClosable` | `Boolean \| String` | `true` | Shows the ✕ close button. |
| `CloseButtonStyle` | `String \| Object` | `'{StaticResource InfoBarCloseButtonStyle}'` | Close button style (style setters are honoured for size/margins/brushes). |
| `CloseButtonCommand` | `null` (any) | `null` | Runs after closing; `CanExecute` disables the ✕. |
| `CloseButtonCommandParameter` | `null` (any) | `null` | Command parameter. |
| `ActionButton` | `null` (any) | `null` | Action control (e.g. a `Button` or `HyperlinkButton` VNode) rendered inline after the message. |
| `Content` | `null` (any) | `null` | Extra content rendered in the row below title/message/action. |
| `ContentTemplate` | `null` (any) | `null` | Template for `Content`. |
| `Background` | `String` | `'Transparent'` | Inner background (severity colour shows through the outer border). |
| `Foreground` | `String` | `''` | Overrides title and message foreground when non-empty. |
| `BorderBrush` | `String` | `'{ThemeResource InfoBarBorderBrush}'` | Border brush. |
| `BorderThickness` | `String \| Number` | `'{ThemeResource InfoBarBorderThickness}'` | Border thickness. |
| `CornerRadius` | `String \| Number` | `'{ThemeResource ControlCornerRadius}'` | Corner radius. |
| `Width` / `Height` | `String \| Number` | `''` | Explicit size. |
| `MinWidth` / `MinHeight` | `String \| Number` | `0` | Minimums (layout height floors at `InfoBarMinHeight`). |
| `MaxWidth` / `MaxHeight` | `String \| Number` | `''` | Maximums. |
| `Margin` | `String \| Number` | `0` | Outer margin. |
| `HorizontalAlignment` | `String` | `'Stretch'` | Maps to `justify-self`. |
| `VerticalAlignment` | `String` | `'Top'` | Maps to `align-self`. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` hides; `'Hidden'` reserves space with `visibility: hidden`. |
| `RequestedTheme` | `String` | `'Default'` | `'Light'`/`'Dark'` override. |
| `IsEnabled` | `Boolean \| String` | `true` | Disables the action and close controls. |

### v-model

`v-model:IsOpen` — supported; `update:IsOpen` is emitted on open, close-button close, and programmatic changes.

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Anything that is not a property element becomes `Content` (row below title/message). |
| `<InfoBar.ActionButton>` | Action control (button/hyperlink) — the "actionable content" slot. |
| `<InfoBar.Content>` | Extra content (same target as the default slot). |
| `<InfoBar.ContentTemplate>` | Template for `Content`. |
| `<InfoBar.IconSource>` | Custom icon source element. |

No slot props. Title/message/badge rows are internal; there is no slot for replacing the close button.

### Events

`(sender, args)`; `sender` is the public API object.

| Event | Args |
| --- | --- |
| `CloseButtonClick` | `null` — fired **before** the bar closes and before the command runs |
| `Closing` | `{ Reason: 'CloseButton' \| 'Programmatic', Cancel: boolean }` |
| `Closed` | `{ Reason }` |
| `Opened` | `{}` |
| `update:IsOpen` | `boolean` |

### Exposed API

`IsOpen`, `Title`, `Message`, `Severity`, `IsIconVisible`, `IsClosable`, `IsEnabled`, `RequestedTheme`, `ActionButton`, `IconSource`, `Content`, `ContentTemplate`, `TemplateSettings`, `Background`, `Foreground`, `BorderBrush`, `BorderThickness`, `CornerRadius`, `CloseButtonStyle`, `CloseButtonCommand`, `CloseButtonCommandParameter`, `Element`.

### Gotchas

- `Title`/`Message` are `String`-only; anything richer must go through `Content` / `InfoBar.Content` (rendered under the title/message block) — it is not a replacement for the title.
- `CloseButtonClick` payload is literally `null`, not an args object. If you need `Cancel`, listen to `Closing`.
- Closing is synchronous: `Closing` fires, then `IsOpen` flips and `update:IsOpen`/`Closed` follow. Setting `args.Cancel = true` re-opens the bar with reason `'Programmatic'`.
- The action control is disabled automatically when `IsEnabled` is false (cloned with `IsEnabled: false`).
- `IsOpen` starts **false** — an `InfoBar` with no `IsOpen` is invisible, unlike most Vue boolean props you might expect to default true.
- It does not remount to change severity: severity only swaps CSS variables and the glyph.
- `Severity` with a numeric value must be 0–3; other numbers coerce to `Informational`.

### Minimal working SFC

```vue
<template>
  <InfoBar
    v-model:IsOpen="isOpen"
    Severity="Warning"
    Title="Storage almost full"
    Message="You've used 98% of your plan. Remove files to keep syncing."
    @CloseButtonClick="onClose"
    @Closing="onClosing">
    <InfoBar.ActionButton>
      <HyperlinkButton Content="Manage storage" @Click="manage" />
    </InfoBar.ActionButton>
  </InfoBar>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HyperlinkButton from '@/components/HyperlinkButton.vue'
import InfoBar from '@/components/InfoBar.vue'

const isOpen = ref(true)
const onClose = () => { /* fires before the bar hides; payload is null */ }
const onClosing = (_sender: unknown, args: { Reason: string; Cancel: boolean }) => { /* args.Cancel = true vetoes */ }
const manage = () => { isOpen.value = false }
</script>
```

---

## 7. InfoBarPanel

Import name: **`InfoBarPanel`** (`src/components/InfoBarPanel.vue`). This is the panel `InfoBar` uses to lay out title / message / action; it is exported and usable standalone.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `HorizontalOrientationPadding` | `String \| Number` | `0` | Panel padding used while the panel is horizontal (Thickness). |
| `VerticalOrientationPadding` | `String \| Number` | `0` | Panel padding used while the panel is vertical (Thickness). |
| `Margin` | `String \| Number` | `0` | Outer margin (Thickness). |

### v-model

None.

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Children. Each child may carry the attached properties `InfoBarPanel.HorizontalOrientationMargin` and `InfoBarPanel.VerticalOrientationMargin` (`'l,t,r,b'` / `'h,v'` / single number), which become the child's margin in that orientation. |

No slot props. Children are cloned with their refs preserved; their margins/width/flex are then written directly by the measurement pass, so avoid styling the same properties yourself.

### Events

None.

### Exposed API

None (`defineOptions({ name: 'InfoBarPanel' })`, no `defineExpose`).

### Gotchas

- Orientation is **measured, not declared**: it clones each visible child into an off-screen probe, sums widths, and switches to `flex-direction: column` when a single child, overflow, or the parent's `min-height` forces it. It therefore needs a laid-out parent with a non-zero width; inside a `display: none` container it stays in its initial `is-vertical` state.
- It writes `margin`, `width`, `flex`, `min-width`, `max-width` styles onto its children — inline styles you set on the same properties will be overwritten.
- Re-measures on resize, DOM mutations, character data, `hidden`/`class` changes, font load, and every update.
- In `InfoBar` it is fed `InfoBarPanelHorizontalOrientationPadding` / `InfoBarPanelVerticalOrientationPadding` and per-child `InfoBarPanel.*OrientationMargin` resources.
- Attached-property names are matched **case-insensitively** against the child element's attributes, so they work on any component that forwards attributes to a DOM element.

### Minimal working SFC

```vue
<template>
  <InfoBarPanel
    HorizontalOrientationPadding="16,8,16,8"
    VerticalOrientationPadding="16,12,16,12">
    <TextBlock Text="Title"
      InfoBarPanel.HorizontalOrientationMargin="0,0,8,0"
      InfoBarPanel.VerticalOrientationMargin="0,0,0,4" />
    <TextBlock Text="Message that wraps when the panel goes vertical"
      InfoBarPanel.HorizontalOrientationMargin="0,0,8,0"
      InfoBarPanel.VerticalOrientationMargin="0,0,0,4" />
    <Button Content="Action" />
  </InfoBarPanel>
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import InfoBarPanel from '@/components/InfoBarPanel.vue'
import TextBlock from '@/components/TextBlock.vue'
</script>
```

---

## 8. InfoBadge

Import name: **`InfoBadge`**. Property element: `InfoBadge.IconSource`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Value` | `Number \| String` | `-1` | Integer badge value. `-1` ⇒ dot (or icon if `IconSource` is set); `>= 0` ⇒ value text. Must be ≥ −1, else a `RangeError` is thrown. |
| `IconSource` | `Object \| String` | `null` | Icon shown when `Value` is `-1` (FontIcon/SymbolIcon/PathIcon/Image). |
| `Style` | `Object \| String` | `''` | Style resource name; the severity is parsed from `…(Dot|Value|Icon)InfoBadgeStyle`. |
| `Background` | `String` | `''` | Fill; empty ⇒ style severity brush, else the accent brush. |
| `Foreground` | `String` | `''` | Text/icon colour; empty ⇒ `--InfoBadgeForeground` / on-accent brush. |
| `IsEnabled` | `Boolean \| String` | `true` | Disabled visual state. |
| `IsTabStop` | `Boolean \| String` | `false` | Makes the badge focusable (`tabindex="0"`). |
| `Visibility` | `String` | `'Visible'` | Visibility. |
| `Opacity` | `Number \| String` | `1` | Opacity. |
| `RequestedTheme` | `String` | `'Default'` | `'Light'`/`'Dark'`. |
| `Padding` | `String \| Number` | `''` | Overrides the style-derived padding. |
| `CornerRadius` | `String \| Number` | `''` | Empty ⇒ fully rounded (corner radius = height/2). |
| `HorizontalAlignment` | `String` | `'Stretch'` | Alignment. |
| `VerticalAlignment` | `String` | `'Stretch'` | Alignment. |
| `Width` / `Height` | `String \| Number` | `''` | Explicit size; height otherwise derives from content (4–16 px range unless overridden). |
| `MinWidth` / `MinHeight` | `String \| Number` | `''` | Minimums (min width is at least the height). |
| `MaxWidth` / `MaxHeight` | `String \| Number` | `''` | Maximums. |
| `Margin` | `String \| Number` | `''` | Margin. |

### v-model

`v-model:Value`, `v-model:Style`, `v-model:IconSource`, `v-model:RequestedTheme` — all emit `update:*`.

### Slots / property elements

| Tag | Contents |
| --- | --- |
| `<InfoBadge.IconSource>` | Icon source element, e.g. `<FontIconSource Glyph="&#xF13C;" />`. |
| default slot | Only inspected for an `<InfoBadge.IconSource>` child; free content is not rendered. |

No slot props.

### Events

None besides the `update:*` v-model events. No click/closed events.

### Exposed API

`Value`, `Style`, `IconSource`, `RequestedTheme`, `TemplateSettings`, `Element`.

### Gotchas

- **Display mode is derived, not a prop**: `Value >= 0` → value text; else an icon if one is available; else dot. Use `Value = -1` for dot/icon.
- Style names must match `^(Attention|Informational|Success|Caution|Critical)(Dot|Value|Icon)InfoBadgeStyle$` for severity colours/icons, e.g. `'{StaticResource CriticalIconInfoBadgeStyle}'`. An `…Icon…` style with no `IconSource` injects the severity glyph (Attention/Informational FontIcon, Success/Caution/Critical SymbolIcon).
- The style string may be `'{StaticResource Name}'`, `'{ThemeResource Name}'`, `var(--Name)`, or a bare `Name`.
- `Background` and `Foreground` always win over the style's brushes.
- `Value` is coerced with `Math.trunc`; out-of-range values (−2, > 2 147 483 647) throw `RangeError: InfoBadge.Value must be an Int32 equal to or greater than -1.`
- Height is clamped to roughly 4–16 px; `CornerRadius` empty means a pill (height/2), and `min-width` never goes below the height.
- Accessibility name is generated (from `AutomationProperties.Name`, else "value N"/"dot"/"icon" strings) — set `AutomationProperties.Name` for meaningful output.

### Minimal working SFC

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="20">
    <InfoBadge Value="5" />
    <InfoBadge Value="-1" Style="{StaticResource CriticalDotInfoBadgeStyle}" />
    <InfoBadge Value="-1" Style="{StaticResource CautionIconInfoBadgeStyle}" />
    <InfoBadge Background="#C42B1C" HorizontalAlignment="Right" VerticalAlignment="Top">
      <InfoBadge.IconSource>
        <FontIconSource FontFamily="{StaticResource SymbolThemeFontFamily}" Glyph="&#xF13C;" />
      </InfoBadge.IconSource>
    </InfoBadge>
  </StackPanel>
</template>

<script setup lang="ts">
import { FontIconSource } from '@/components/IconSource'
import InfoBadge from '@/components/InfoBadge.vue'
import StackPanel from '@/components/StackPanel.vue'
</script>
```

---

## 9. ProgressBar

Import name: **`ProgressBar`**.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Value` | `Number \| String` | `0` | Current value, clamped into `[Minimum, Maximum]`. |
| `Minimum` | `Number \| String` | `0` | Range start. |
| `Maximum` | `Number \| String` | `100` | Range end (coerced up to `Minimum` if smaller). |
| `IsIndeterminate` | `Boolean \| String` | `false` | Marquee mode; ignores `Value`. |
| `ShowError` | `Boolean \| String` | `false` | Error colour / error visual state. |
| `ShowPaused` | `Boolean \| String` | `false` | Paused colour / paused visual state. |
| `Width` | `Number \| String` | `''` | Width; empty ⇒ `100%` while `HorizontalAlignment` is `Stretch`. |
| `Height` | `Number \| String` | `''` | Height; empty ⇒ natural (min height + padding + border). |
| `MinWidth` | `Number \| String` | `0` | Minimum width. |
| `MinHeight` | `Number \| String` | `3` | Bar thickness (drives the track height). |
| `MaxWidth` / `MaxHeight` | `Number \| String` | `''` | Maximums. |
| `Margin` | `Number \| String` | `''` | Outer margin. |
| `Padding` | `Number \| String` | `0` | Padding (Thickness). |
| `BorderThickness` | `Number \| String` | `0` | Border thickness. |
| `BorderBrush` | `String \| Object` | `'{ThemeResource ProgressBarBorderBrush}'` | Border brush. |
| `Background` | `String \| Object` | `'{ThemeResource ProgressBarBackground}'` | Track brush. |
| `Foreground` | `String \| Object` | `'{ThemeResource ProgressBarForeground}'` | Fill brush. |
| `CornerRadius` | `Number \| String` | `1.5` | Corner radius of fill/track container. |
| `HorizontalAlignment` | `String` | `'Stretch'` | Maps to `justify-self`. |
| `VerticalAlignment` | `String` | `'Center'` | Maps to `align-self`. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` also forces the determinate visual. |
| `IsEnabled` | `Boolean \| String` | `true` | Disabled state (`aria-disabled`). |
| `IsTabStop` | `Boolean \| String` | `false` | Focusable when enabled. |
| `IsHitTestVisible` | `Boolean \| String` | `true` | False ⇒ `pointer-events: none`. |

### v-model

`v-model:Value`, `v-model:Minimum`, `v-model:Maximum`, `v-model:IsIndeterminate`, `v-model:ShowError`, `v-model:ShowPaused`, `v-model:Background`, `v-model:Foreground` — all emit `update:*`.

### Slots / property elements

**None** (fully template-less control; there is no `ProgressBar.*` property element and no slot).

### Events

| Event | Args |
| --- | --- |
| `ValueChanged` | `{ OldValue, NewValue }` (coerced value) — emitted whenever the clamped value changes |
| `update:*` | new value (see v-model) |

### Exposed API

`Value`, `Minimum`, `Maximum`, `IsIndeterminate`, `ShowError`, `ShowPaused`, `Background`, `Foreground`, `TemplateSettings`.

### Gotchas

- `Value` is clamped; assigning out-of-range values rewrites the value and emits `update:Value`/`ValueChanged` with the clamped value.
- `Minimum`/`Maximum` coerce each other (WinUI behaviour): raising `Minimum` above `Maximum` raises `Maximum`, and vice versa.
- `IsIndeterminate` is only honoured while `Visibility` is `'Visible'`; the two animated marquee elements are pure CSS/WAAPI and run forever (2 s cycle).
- Changing `Value` animates a 200 ms "reposition" on the determinate indicator; the transition is skipped in paused/indeterminate states.
- `ShowError`/`ShowPaused` change only the fill colour and the visual-state class (`state-IndeterminateError` etc.) — the bar keeps its geometry.
- `IsTabStop` defaults to false; there is no keyboard interaction.
- `Role` is `progressbar` with `aria-valuenow/min/max` (omitted while indeterminate, where `aria-busy="true"` is used).

### Minimal working SFC

```vue
<template>
  <StackPanel Spacing="16">
    <ProgressBar v-model:Value="value" Width="240" />
    <ProgressBar Width="240" IsIndeterminate />
    <ProgressBar Width="240" :Value="60" ShowError />
  </StackPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProgressBar from '@/components/ProgressBar.vue'
import StackPanel from '@/components/StackPanel.vue'

const value = ref(25)
</script>
```

---

## 10. ProgressRing

Import name: **`ProgressRing`**.

### `IsActive` / `IsIndeterminate` / size

- **`IsActive`** (`Boolean | String = true`) — runs the animation and shows the ring. When false the ring is fully transparent (`opacity: 0`, `aria-hidden="true"`) and the indeterminate loop stops.
- **`IsIndeterminate`** (`Boolean | String = true`) — `true` (default) shows the rotating double-arc; **`false` switches to determinate** and the ring is driven by `Value`/`Minimum`/`Maximum`.
- **Size**: `Width` and `Height` (`Number | String`, both default `32`) are real CSS sizes, floored by `MinWidth`/`MinHeight` (both default `16`) and capped by `MaxWidth`/`MaxHeight` (default `''`). Alignment defaults to **`Center`/`Center`** (not Stretch), so the ring does not fill its parent.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsActive` | `Boolean \| String` | `true` | Animate/visible. |
| `IsIndeterminate` | `Boolean \| String` | `true` | Indeterminate (true) vs determinate (false). |
| `DeterminateSource` | `Object` | `null` | Accepted for parity; not consumed by the web renderer. |
| `IndeterminateSource` | `Object` | `null` | Accepted for parity; not consumed by the web renderer. |
| `Value` | `Number \| String` | `0` | Determinate progress, clamped to `[Minimum, Maximum]`. |
| `Minimum` | `Number \| String` | `0` | Range start. |
| `Maximum` | `Number \| String` | `100` | Range end. |
| `Width` | `Number \| String` | `32` | Ring width. |
| `Height` | `Number \| String` | `32` | Ring height. |
| `MinWidth` | `Number \| String` | `16` | Minimum width. |
| `MinHeight` | `Number \| String` | `16` | Minimum height. |
| `MaxWidth` / `MaxHeight` | `Number \| String` | `''` | Maximums. |
| `Margin` | `Number \| String` | `''` | Outer margin. |
| `Foreground` | `String \| Object` | `'{ThemeResource ProgressRingForegroundThemeBrush}'` | Arc stroke. |
| `Background` | `String \| Object` | `'{ThemeResource ProgressRingBackgroundThemeBrush}'` | Track stroke. |
| `HorizontalAlignment` | `String` | `'Center'` | Maps to `justify-self`. |
| `VerticalAlignment` | `String` | `'Center'` | Maps to `align-self`. |
| `IsHitTestVisible` | `Boolean \| String` | `false` | False ⇒ `pointer-events: none`. |
| `IsTabStop` | `Boolean \| String` | `false` | Focusable when enabled and active. |
| `IsEnabled` | `Boolean \| String` | `true` | Disabled state. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` stops the animation loop and hides. |

### v-model

`v-model:Value`, `v-model:Minimum`, `v-model:Maximum`, `v-model:IsActive`, `v-model:IsIndeterminate`, `v-model:Background`, `v-model:Foreground`.

### Slots / property elements

**None.**

### Events

| Event | Args |
| --- | --- |
| `ValueChanged` | `{ OldValue, NewValue }` |
| `update:*` | new value |

### Exposed API

`Value`, `Minimum`, `Maximum`, `IsActive`, `IsIndeterminate`, `Background`, `Foreground`, `TemplateSettings`.

### Gotchas

- **`IsIndeterminate` defaults to `true`** — a bare `<ProgressRing Value="45" />` spins forever and ignores `Value`. Set `:IsIndeterminate="false"` for determinate.
- `IsActive` defaults to `true`; set `:IsActive="false"` (or hide it) instead of unmounting if you want to keep state.
- Determinate increases are animated (duration = Δfraction × 2000 ms); **decreases jump immediately**.
- A determinate value of ~0 is drawn fully transparent (the official source hides the first frame).
- `IsHitTestVisible` defaults to **false** — the ring does not receive pointer events or tooltips unless you opt in.
- The visual is an SVG with `viewBox="0 0 100 100"` and `preserveAspectRatio="none"`, so non-square widths/height stretch the ring; stroke widths are fixed in viewBox units.
- `Width`/`Height` are 32 px by default and `HorizontalAlignment` is `Center`, so in a stretch container it will not grow.
- Exposure of `role="progressbar"`, `aria-busy` only while active + indeterminate, `aria-hidden` while inactive.

### Minimal working SFC

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="24">
    <ProgressRing :IsActive="busy" Width="60" Height="60" />
    <ProgressRing :IsIndeterminate="false" :IsActive="true" :Value="percent" Width="60" Height="60" />
  </StackPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProgressRing from '@/components/ProgressRing.vue'
import StackPanel from '@/components/StackPanel.vue'

const busy = ref(true)
const percent = ref(35)
</script>
```

---

## 11. Expander

Import name: **`Expander`** (thin wrapper over `ExpanderBase`). Property elements: `Expander.Header`, `Expander.Content`, `Expander.Description`, `Expander.HeaderIcon`, `Expander.HeaderControls`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Header` | `String \| Number` | `''` | Header text. |
| `Content` | `String \| Number` | `''` | Body text. |
| `Description` | `String \| Number` | `''` | Secondary header line (12px, secondary colour). |
| `HeaderIcon` | `String` | `''` | Header icon; a glyph string or an HTML/markup string (`'<'` prefix ⇒ `v-html`). |
| `IsExpanded` | `Boolean \| String` | `false` | Expanded state. |
| `ExpandDirection` | `String \| Number` | `'Down'` | `'Down'` or `'Up'` (content above the header). |
| `Padding` | `String \| Number` | `'16'` | Content padding (Thickness). |
| `Background` | `String \| Object` | `'{ThemeResource ExpanderContentBackground}'` | Content background. |
| `BorderBrush` | `String \| Object` | `'{ThemeResource ExpanderContentBorderBrush}'` | Content border brush. |
| `BorderThickness` | `String \| Number` | `''` | Content border thickness (empty ⇒ theme default). |
| `CornerRadius` | `String \| Number` | `'{ThemeResource ControlCornerRadius}'` | Corner radius (header top / content bottom). |
| `IsEnabled` | `Boolean \| String` | `true` | Disabled state (header not clickable, `tabindex="-1"`). |
| `HorizontalContentAlignment` | `String` | `'Stretch'` | Content alignment (Left/Center/Right/Stretch). |
| `VerticalContentAlignment` | `String` | `'Stretch'` | Content alignment (Top/Center/Bottom/Stretch). |
| `Width` / `MinWidth` / `Height` / `MaxWidth` | `String \| Number` | `''` | Sizing. |
| `HorizontalAlignment` | `String` | `''` | Maps to `justify-self` when non-empty. |
| `VerticalAlignment` | `String` | `''` | Maps to `align-self` when non-empty. |

The base control also declares `HeaderTemplate` and `HeaderTemplateSelector` (both `null`) — they forward through `v-bind="$attrs"` but the base renderer does not consume them.

### v-model

`v-model:IsExpanded` — supported (`update:IsExpanded` is emitted by the base on every toggle). Also settable through the exposed `IsExpanded` accessor.

### Slots / property elements

| Tag | Contents |
| --- | --- |
| default slot | Body content (equivalent to `Content`). |
| `<Expander.Header>` / `#Header` | Rich header content (replaces `Header` text). |
| `<Expander.Description>` / `#Description` | Rich description content. |
| `<Expander.HeaderIcon>` / `#HeaderIcon` | Rich header icon. |
| `<Expander.HeaderControls>` / `#HeaderControls` | Controls placed at the trailing edge of the header (slot only — no prop). |

No slot props. Property elements take precedence over the matching string prop.

### Events

| Event | Args |
| --- | --- |
| `Expanding` | `(sender, null)` — fired **after** expanding starts |
| `Collapsed` | `(sender, null)` |
| `update:IsExpanded` | `boolean` |

### Exposed API

`IsExpanded` (getter/setter proxied to the base control).

### Gotchas

- `Header`/`Content`/`Description` props accept **strings/numbers only**; use the property elements or slots for `TextBlock`s, buttons, etc.
- `Expanding`/`Collapsed` carry `null` as args (no event-args object), and fire on any state flip including programmatic `IsExpanded` changes.
- Clicking an interactive element inside the header (button, link, input, `[role=button]`, `[tabindex]`, …) does **not** toggle the expander — deliberate, so header controls stay usable.
- The header is `role="button"` with `aria-expanded`; Enter/Space toggle; the chevron is a real `AnimatedIcon` driven by pointer/keyboard state.
- Collapsed content is kept in the DOM but `display: none` + `inert` + `aria-hidden`; expansion animates height by translating (333 ms expand / 167 ms collapse).
- `ExpandDirection="Up"` lays the header out visually **below** the content (`flex-direction: column-reverse`).
- There is no `Expander.Expanding`/cancel mechanism — the state has already changed when the event fires.

### Minimal working SFC

```vue
<template>
  <Expander
    v-model:IsExpanded="open"
    Header="Advanced settings"
    Description="Network, proxy and diagnostics"
    HeaderIcon="&#xE713;"
    ExpandDirection="Down"
    Padding="16">
    <StackPanel Spacing="8">
      <TextBlock Text="Content goes here." />
      <Button Content="Reset" />
    </StackPanel>
  </Expander>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/Button.vue'
import Expander from '@/components/Expander.vue'
import StackPanel from '@/components/StackPanel.vue'
import TextBlock from '@/components/TextBlock.vue'

const open = ref(false)
</script>
```

---

## 12. AnimatedIcon

Import name: **`AnimatedIcon`**. The SFC's default export also carries `Source`, `FallbackIconSource`, `SetState`, `GetState`; the runtime module exports the same pair (`import { AnimatedIcon, AnimatedIconState } from '@/components/animatedIconRuntime'` → `AnimatedIcon.SetState(el, 'PointerOver')`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Source` | any | `undefined` | Animated visual source: an object with `render()`, or a **source type name string**. Recognised names: `AnimatedAcceptVisualSource`, `AnimatedBackVisualSource`, `AnimatedChevronDownSmallVisualSource`, `AnimatedChevronRightDownSmallVisualSource`, `AnimatedChevronUpDownSmallVisualSource`, `AnimatedFindVisualSource`, `AnimatedGlobalNavigationButtonVisualSource`, `AnimatedSettingsVisualSource`. |
| `FallbackIconSource` | any | `undefined` | Icon source rendered when `Source` is missing/unsupported. Kind is inferred (`SymbolIcon`, `FontIcon`, `PathIcon`, `BitmapIcon`). |
| `Foreground` | `String` | `''` | Icon colour (empty ⇒ `currentColor`). |
| `MirroredWhenRightToLeft` | `Boolean \| String` | `false` | Mirrors the visual in RTL. |
| `FlowDirection` | `String` | `''` | `'LeftToRight'`/`'RightToLeft'`; empty ⇒ inherit from CSS. |
| `Width` / `Height` | `String \| Number` | `''` | Explicit size; when one is numeric and the other unset, the other is derived from the source aspect ratio. |
| `MinWidth` / `MinHeight` / `MaxWidth` / `MaxHeight` | `String \| Number` | `''` | Sizing limits. |
| `Margin` | `String \| Number` | `''` | Outer margin. |
| `HorizontalAlignment` | `String` | `'Stretch'` | Maps to `justify-self`. |
| `VerticalAlignment` | `String` | `'Stretch'` | Maps to `align-self`. |
| `Visibility` | `String` | `'Visible'` | Visibility. |
| `IsHitTestVisible` | `Boolean \| String` | `true` | False ⇒ `pointer-events: none`. |
| `Opacity` | `String \| Number` | `1` | Opacity. |

**Attached state property:** `AnimatedIcon.State="…"` as an attribute on the component (not a declared prop — it is read from `attrs` and stripped from the rendered element). If omitted, the icon inherits state from the nearest ancestor element with a state (that is how `Expander`'s chevron animates).

### v-model

`v-model:Source`, `v-model:FallbackIconSource`, `v-model:Foreground`, `v-model:MirroredWhenRightToLeft`.

### Slots / property elements

| Tag | Contents |
| --- | --- |
| `<AnimatedIcon.Source>` | Animated visual source element, e.g. `<animatedvisuals:AnimatedSettingsVisualSource />` (globally registered under both names). |
| `<AnimatedIcon.FallbackIconSource>` | Fallback icon source element, e.g. `<SymbolIconSource Symbol="Find" />`. |
| default slot | Parsed only for the two property elements above; it is not rendered as content. |

No slot props.

### Events

No XAML events. Only the `update:*` v-model events.

### Exposed API / helpers

`Source`, `FallbackIconSource`, `Foreground`, `MirroredWhenRightToLeft`, `Element`, `$el`; module-level `SetState(target, state)` and `GetState(target)` (target may be an element, a component ref, or an object with `$el`/`Element`/`value`).

Rendered as `data-animated-icon-state`, `data-animated-icon-progress`, `data-animated-icon-playing`, `data-animated-icon-source` on the host — handy for tests and debugging.

### Gotchas

- **State is not a prop.** Set it with the `AnimatedIcon.State` attribute or by calling `SetState(el, state)`; valid states are `Normal`, `PointerOver`, `Pressed`, `Disabled`, plus directional variants for chevrons (`NormalOn`, `NormalOff`, `PointerOverOn`, …). Unknown states are queued and fall back to the last compatible marker.
- Segment playback uses the source's markers (`<From>To<To>_Start` / `_End`); transitions with neither marker jump to 0, so a wrong state name silently resets the animation.
- Transitions shorter than 20 ms are skipped and `prefers-reduced-motion: reduce` jumps straight to the end state.
- Only the eight source names above are recognised from a string/type-name; anything else renders the fallback (or nothing when there is no fallback). Custom sources must be objects with `render(progress, foreground)` and `markers`/`duration`/`size`.
- A queued state list is capped at 4 while a transition is playing (oldest dropped).
- The host is `display: inline-grid` with `overflow: hidden`; if the source is present the rendered SVG is absolutely positioned and the host derives its aspect ratio from the source unless you give explicit sizes.
- Nothing is accessible: the host is `aria-hidden="true"`. Put the name on the owning control (`AutomationProperties.Name`) as the Gallery does.

### Minimal working SFC

```vue
<template>
  <Button
    AutomationProperties.Name="Search"
    @PointerEntered="hover(true)"
    @PointerExited="hover(false)"
    @PointerPressed="hover(true)">
    <AnimatedIcon
      ref="icon"
      Source="AnimatedFindVisualSource"
      AnimatedIcon.State="Normal"
      Width="20"
      Height="20">
      <AnimatedIcon.FallbackIconSource>
        <SymbolIconSource Symbol="Find" />
      </AnimatedIcon.FallbackIconSource>
    </AnimatedIcon>
  </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnimatedIcon from '@/components/AnimatedIcon.vue'
import Button from '@/components/Button.vue'
import { SymbolIconSource } from '@/components/IconSource'
import { AnimatedIcon as AnimatedIconApi } from '@/components/animatedIconRuntime'

const icon = ref<unknown>(null)
const hover = (on: boolean) => AnimatedIconApi.SetState(icon.value, on ? 'PointerOver' : 'Normal')
</script>
```

> The Gallery uses exactly this `getAnimatedIconVisualSource` / `SetState` route (`AnimatedIconApi.SetState(names.SearchAnimatedIcon, 'PointerOver')`). `SetState` also accepts a raw DOM element, and `GetState` reads the current state back. Only the eight listed source names resolve from a string; anything else keeps the fallback icon visible.

---

## 13. Cross-control cheat sheet

| Need | Use | Notes |
| --- | --- | --- |
| Blocking confirmation | `ContentDialog` + `await ref.ShowAsync()` | Imperative; no `v-model:IsOpen`; result `'Primary' \| 'Secondary' \| 'None'` |
| Inline status message | `InfoBar` with `v-model:IsOpen` | `IsOpen` defaults to `false`; severities Informational/Success/Warning/Error (or 0–3) |
| Hover hint | `ToolTipService.ToolTip="text"` (+ one `<ToolTipService />`) | Needs the service host; strips `title` |
| Rich tooltip with offsets | `<ToolTipService.ToolTip><ToolTip …/></ToolTipService.ToolTip>` | Placement/PlacementRect/offsets honoured |
| Contextual coach mark | `TeachingTip` + `v-model:IsOpen` + `:Target` | Target = element/component ref; no CSS-selector strings |
| Raw flyout surface | `Popup` + `v-model:IsOpen` | Teleported; offsets from declaring origin unless `PlacementTarget` + `DesiredPlacement` |
| Numeric badge | `InfoBadge Value="5"` | `-1` = dot |
| Severity badge | `InfoBadge Style="{StaticResource CriticalIconInfoBadgeStyle}"` | Style name drives colour/icon |
| Task progress | `ProgressBar` (`MinHeight` = thickness) | `ShowError`/`ShowPaused` for state colour |
| Spinner | `ProgressRing` (indeterminate by default) | `:IsIndeterminate="false"` + `Value` for determinate |
| Disclosure section | `Expander` + `v-model:IsExpanded` | Header/Content accept strings; use slots for rich content |
| Animated glyph | `AnimatedIcon Source="AnimatedFindVisualSource"` + `AnimatedIcon.State` | 8 built-in sources; `SetState` available |

### Boolean-string props

Most `Boolean` props are declared `[Boolean, String]` and coerce with a XAML-aware check that only treats `true` / `'True'` as true (`progressBoolean` also accepts `'true'`/`'True'` case-insensitively, and `boolValue` accepts `true/1/yes`). Prefer real booleans (`:IsOpen="flag"`) over `'True'`.

### Values that are "unknown"

Where the source declares a prop but the renderer never reads it, this document says so explicitly rather than inventing behaviour: `ContentDialog.Style`, `ToolTip.ContentTransitions`, `ProgressRing.DeterminateSource`, `ProgressRing.IndeterminateSource`, `Expander`'s inherited `HeaderTemplate` / `HeaderTemplateSelector`. No public API was guessed; anything not listed here does not exist on these components.
