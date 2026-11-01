# 04 — Text input controls

Precise API reference for the WinUIonWeb text-input family:

`TextBox`, `PasswordBox`, `RichEditBox`, `AutoSuggestBox`, `ComboBox`, `NumberBox`.

Everything below was read from the component sources and the Gallery pages in this repo
(`WinUIonWeb-master/WinUIonWeb/src/…`, read 2026-11-01). Prop names, casing, defaults and
event names are copied verbatim from `defineProps` / `withDefaults` / `defineEmits`.
If something could not be determined from source it is marked **unknown** — nothing here is inferred.

Sources:

| Control | Component source | Gallery page |
| --- | --- | --- |
| TextBox | `src/components/TextBox.vue` | `src/gallery/pages/TextBoxPage.vue` |
| PasswordBox | `src/components/PasswordBox.vue` | `src/gallery/pages/PasswordBoxPage.vue` |
| RichEditBox | `src/components/RichEditBox.vue` | `src/gallery/pages/RichEditBoxPage.vue` |
| AutoSuggestBox | `src/components/AutoSuggestBox.vue` | `src/gallery/pages/AutoSuggestBoxPage.vue` |
| ComboBox | `src/components/ComboBox.vue` | `src/gallery/pages/ComboBoxPage.vue` |
| NumberBox | `src/components/NumberBox.vue` | `src/gallery/pages/NumberBoxPage.vue` |

---

## 0. Conventions that apply to all six controls

These are not style preferences; they are how the components are implemented.

**0.1 Import.** The published package is `winuionweb` (v0.2.0, ESM). Either

```ts
// main.ts — global registration (also registers every `Control.Property` element)
import WinUIOnWeb from 'winuionweb'
import 'winuionweb/style.css'
createApp(App).use(WinUIOnWeb, { locale: 'en-US' }).mount('#app')
```

or local registration: `import { TextBox } from 'winuionweb'`. `style.css` is required either way.

**0.2 Props are PascalCase and must be written exactly.** Vue camelizes incoming keys
(`camelize('placeholder-text') === 'placeholderText'`), but these props are declared as
`PlaceholderText`, so neither `placeholder-text` nor `placeholderText` resolves — the value lands in
`$attrs` and is ignored. Write `PlaceholderText="…"` or `:PlaceholderText="…"`.

**0.3 `v-model` arguments are case-sensitive.** Verified by compiling
`v-model:Text="t"` and `v-model:text="t2"`:

```js
Text: _ctx.t,       "onUpdate:Text": $event => …   // ✅ matches prop `Text` + emit `update:Text`
text: _ctx.t2,      "onUpdate:text": $event => …   // ❌ no prop `text`, no listener for `update:Text`
```

Vue's `emit('update:Text', …)` looks up `onUpdate:Text` only, so **`v-model:Text` (capital T) is the
working form**. Lowercase never updates.

**0.4 Event names are PascalCase and are matched by exact `on<Name>` key.** Each control's `dispatch()`
does `instance.vnode.props['on' + name]` and calls the handler as `(sender, eventArgs)`.
Use `@TextChanged="fn"` — `@text-changed` produces `onText-changed` and is never called.

**0.5 Handlers receive `(sender, eventArgs)`, not a DOM event.** The first argument is the control's
API object (its exposed properties, e.g. `sender.Text`, `sender.ItemsSource`, `sender.Document`).
`eventArgs` is a plain mutable `{ … }` object, so `args.Cancel = true` / `args.Handled = true`
inside a handler actually cancels / consumes the action for the events documented as cancelable.

**0.6 The default slot is a XAML property-element channel, not a content slot.**
`<TextBox>hello</TextBox>` renders nothing. `<TextBox.Header>`, `<AutoSuggestBox.QueryIcon>`,
`<ComboBox.ItemTemplate>`, … are placeholder components that the parent finds in its default slot
and renders in a specific spot. They are registered globally by `WinUIOnWeb` /
`registerWinUIComponents(app)`, and each is also a static on the exported component, so local
registration works too:

```ts
import { TextBox } from 'winuionweb'
components: { 'TextBox.Header': TextBox.Header }   // static exists on the export (verified)
```

**0.7 Writing state from JS never mutates a Vue prop.** Controls call
`updateXamlBinding(props.X, value, instance)`, which only writes back when the prop value is a XAML
binding string (`{x:Bind foo, Mode=TwoWay}`); with ordinary Vue props that is a no-op. For the
properties that *do* have a model event (`Text`, `Password`, `Value`, `IsSuggestionListOpen`), a
`sender.X = …` write additionally re-emits `update:X`, so `v-model:X` stays in sync. Properties
without a model event (`ComboBox.SelectedIndex`, `AutoSuggestBox.ItemsSource`, …) are **not**
propagated — mirror them into your own `ref` from the event payload.

**0.8 Value / two-way summary.**

| Control | Value prop | Update event | Working v-model | Multiline by default |
| --- | --- | --- | --- | --- |
| TextBox | `Text` | `update:Text` (string) | `v-model:Text` | no (`AcceptsReturn = false`) |
| PasswordBox | `Password` | `update:Password` (string) | `v-model:Password` | no |
| RichEditBox | — none — | — none — | **no v-model** (`Document.*`) | yes (`AcceptsReturn = true`) |
| AutoSuggestBox | `Text` | `update:Text` (string) | `v-model:Text` (+ `v-model:IsSuggestionListOpen`) | no |
| ComboBox | `SelectedIndex` / `SelectedItem` / `SelectedValue` | — none (no `update:*`) | **no v-model** (`@SelectionChanged`) | no |
| NumberBox | `Value` (also `Text`) | `update:Value` (number), `update:Text` (string) | `v-model:Value` (and/or `v-model:Text`) | no |

---

## 1. TextBox

`import { TextBox } from 'winuionweb'` → `<TextBox>`

Registered property elements: `TextBox.Header`, `TextBox.HeaderTemplate`, `TextBox.Description`,
`TextBox.ContextFlyout`, `TextBox.SelectionFlyout`. `TextBox.Background` exists on the component
object (a `brushProperty('TextBox','Background')` placeholder) but is **not** registered by
`registerWinUIComponents`, so `<TextBox.Background>` needs manual local registration.

### Props (all 43)

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Text` | `string` | *undefined* | Field text. The two-way target (`update:Text`). Rendered as `''` when undefined. |
| `PlaceholderText` | `string` | `''` | Native placeholder, shown when empty. |
| `Header` | `unknown` | `''` | Content above the box, rendered through a `ContentPresenter` (any node works). Also the `aria-label` fallback. |
| `HeaderTemplate` | `unknown` | *undefined* | Template/resource key for `Header`. |
| `ContextFlyout` | `unknown` | *undefined* | Custom right-click flyout. `null` disables the built-in menu entirely. |
| `SelectionFlyout` | `unknown` | *undefined* | Custom touch/pen selection flyout. `null` disables. |
| `Description` | `string` | `''` | Helper text under the box. |
| `AcceptsReturn` | `boolean \| string` | `false` | Renders a `<textarea>`; when `false`, Enter is `preventDefault()`ed. |
| `IsReadOnly` | `boolean \| string` | `false` | Blocks editing, keeps selection/copy. |
| `IsEnabled` | `boolean \| string` | `true` | Enabled state (adds `is-disabled`). |
| `ShowDeleteButton` | `boolean \| string` | `true` | Permission for the trailing clear button (extra runtime conditions apply — see gotchas). |
| `MaxLength` | `number \| string` | `0` | Max characters; `0` = unlimited. |
| `TextWrapping` | `'NoWrap' \| 'Wrap' \| 'WrapWholeWords'` | `'NoWrap'` | Wrapping mode. **Only has a layout effect when `AcceptsReturn` is true.** |
| `TextAlignment` | `'Left' \| 'Center' \| 'Right' \| 'Justify'` | `'Left'` | `text-align` of the field. |
| `IsSpellCheckEnabled` | `boolean \| string` | `true` | Emits the `spellcheck` attribute. |
| `IsTextPredictionEnabled` | `boolean \| string` | `true` | Drives `autocomplete` / `autocapitalize` / `autocorrect`. |
| `InputScope` | `string` | `'Default'` | Mapped to `inputmode`: `Number`/`NumericPin`/`Digits`→numeric, `TelephoneNumber`→tel, `EmailNameOrAddress`/`EmailSmtpAddress`→email, `Url`→url, `Search`→search, `CurrencyAmount`/`CurrencyAmountAndSymbol`/`Decimal`→decimal, else text. |
| `CharacterCasing` | `'Normal' \| 'Lower' \| 'Upper'` | `'Normal'` | Forces case on typing and on programmatic writes. |
| `SelectionHighlightColor` | `string` | `''` | CSS color for the selection background. |
| `DesiredCandidateWindowAlignment` | `'Default' \| 'BottomEdge'` | `'Default'` | IME candidate-window hint; sends a `chrome.webview.postMessage` to the host, no browser-visible effect. |
| `IsColorFontEnabled` | `boolean \| string` | `true` | **Declared only — no code path reads it.** |
| `PreventKeyboardDisplayOnProgrammaticFocus` | `boolean \| string` | `false` | Passed as `focus({ preventScroll })`. |
| `FontFamily` | `string` | `''` | Font family. |
| `FontSize` | `number \| string` | `''` | Font size (CSS default 14px when empty). |
| `FontStyle` | `string` | `'Normal'` | Lowercased into `font-style`. |
| `FontWeight` | `number \| string` | `''` | `Normal/SemiBold/Bold/Light` → 400/600/700/300, else raw. |
| `Foreground` | `string` | `''` | Text color. |
| `Background` | `string` | `''` | Control fill (also available as a brush property element). |
| `BorderBrush` | `string` | `''` | Border color override (top+bottom). |
| `BorderThickness` | `number \| string` | `1` | XAML thickness (`1`, `"1"`, `"1,2,3,4"`). |
| `Padding` | `number \| string` | `''` | Field padding (XAML thickness). |
| `CornerRadius` | `number \| string` | `4` | Corner radius. |
| `PlaceholderForeground` | `string` | `''` | Placeholder color. |
| `CharacterSpacing` | `number \| string` | `0` | XAML units → `letter-spacing: value/1000 em`. |
| `Width` | `number \| string` | `''` | Explicit width. |
| `Height` | `number \| string` | `''` | Explicit height. |
| `Margin` | `number \| string` | `''` | Outer margin (XAML thickness). |
| `HorizontalAlignment` | `string` | `''` | → `justify-self`. |
| `VerticalAlignment` | `string` | `''` | → `align-self`. |
| `MinWidth` | `number \| string` | `''` | Min width; internal floor is `64px`. |
| `MaxWidth` | `number \| string` | `''` | Max width. |
| `MinHeight` | `number \| string` | `''` | Min height. |
| `MaxHeight` | `number \| string` | `''` | Max height. |

### v-model

- **Prop `Text`, event `update:Text` (single string argument).**
- `v-model:Text="value"`, or `:Text="value"` + `@update:Text="value = $event"`.
- The ref is also exposed imperatively: `ref.Text` (get/set).

### Slots

No content slot. The default slot is scanned for exactly these property elements:
`<TextBox.Header>`, `<TextBox.HeaderTemplate>`, `<TextBox.Description>`,
`<TextBox.ContextFlyout>`, `<TextBox.SelectionFlyout>`.
Anything else in the default slot is discarded.

### Events

All except `update:Text` are invoked as `(sender, args)`; `sender` is the exposed API object.

| Event | Payload (`args`) | Notes |
| --- | --- | --- |
| `update:Text` | `string` only | Not `(sender, args)`. Fired for typing, clearing, undo/redo, programmatic `Text`. |
| `BeforeTextChanging` | `{ NewText, Cancel }` | Fires before a user edit is applied; set `Cancel = true` to reject. |
| `TextChanging` | `{ IsContentChanging }` | Always `true` in practice. Fires before `update:Text`. |
| `TextChanged` | `{ OriginalSource, Handled }` | After the change has been applied. |
| `SelectionChanging` | `{ SelectionStart, SelectionLength, Cancel }` | Set `Cancel = true` to restore the previous selection. |
| `SelectionChanged` | `{ OriginalSource, Handled }` | No selection ranges in the payload — use `sender.SelectedText` / `SelectionStart` / `SelectionLength`. |
| `GotFocus` | `{ OriginalSource, Handled }` | |
| `LostFocus` | `{ OriginalSource, Handled }` | Deferred while the context menu is open. |
| `KeyDown` | `{ Key, OriginalSource, Handled }` | `Key` is the DOM `event.key` (e.g. `"Enter"`); set `Handled = true` to preventDefault. |
| `Paste` | `{ Handled }` | Set `Handled = true` to block the built-in paste. |
| `CuttingToClipboard` | `{ Handled }` | |
| `CopyingToClipboard` | `{ Handled }` | |
| `ContextMenuOpening` | `{ Handled, CursorLeft, CursorTop }` | Set `Handled = true` to suppress the built-in menu. |
| `TextCompositionStarted` / `TextCompositionChanged` / `TextCompositionEnded` | `{ OriginalSource, Handled }` | IME lifecycle. |
| `CandidateWindowBoundsChanged` | `{ Bounds }` | **Declared in `defineEmits` but never dispatched** — no code raises it. |

### Exposed API (via `ref`)

`Element`, `IsEnabled`, `IsReadOnly`, `AcceptsReturn`, `TextWrapping` (all get/set),
`Text` (get/set), `SelectedText` (get/set), `SelectionStart` / `SelectionLength` (get/set),
`CanUndo`, `CanRedo`, `ContextFlyout`, `SelectionFlyout`,
`Focus(options?)`, `SelectAll()`, `Select(start, length)`, `GetRectFromCharacterIndex(index, trailingEdge?)`,
`Undo()`, `Redo()`, `CopySelectionToClipboard()`, `CutSelectionToClipboard()`, `PasteFromClipboard()`.

### Gotchas

1. **There is no leading/trailing content slot and no icon prop.** The only built-in trailing
   affordance is the clear button. It renders only when *all* of these hold: `ShowDeleteButton`,
   the field is focused, it has text, `!AcceptsReturn`, `!IsReadOnly`, `IsEnabled`, and the surface is
   wider than `fontSize * 5`. (AutoSuggestBox/NumberBox add buttons by injecting into the control's
   private `textInputTemplateKey`; that channel is not public.)
2. `TextWrapping` alone does nothing — `white-space`/`overflow-wrap` are only applied when
   `AcceptsReturn` switched the field to a `<textarea>`.
3. **The control auto-sizes to its content.** Computed inline `min-width` is
   `min(max(MinWidth || 64px, naturalFieldWidth + borders + actions), 100%)`; `MaxLength`/text/placeholder
   all influence it. Set `Width` when you need a fixed size.
4. `MaxLength` is enforced twice (native `maxlength` + `normalizeInput`) and also applies to
   `SelectedText` replacement and programmatic `Text` sets. `0` disables the limit.
5. `IsColorFontEnabled` is inert; `CandidateWindowBoundsChanged` never fires; `DesiredCandidateWindowAlignment`
   only talks to a WebView2 host bridge.
6. Undo/redo is the control's own stack (not the browser's): Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y are
   intercepted when not read-only, and `Undo()` / `Redo()` are exposed.
7. `KeyDown` is dispatched *before* the built-in shortcuts, so `args.Handled = true`
   suppresses Ctrl+Z etc.
8. `Header` and `Description` do not occupy the field; the header uses
   `--TextBoxTopHeaderMargin` and the description sits below the border.
9. Selection events carry no ranges, unlike WinUI's `TextSelectionChangedEventArgs`.
10. Events fire for programmatic changes too: a parent writing `Text` triggers
    `TextChanging` → `update:Text` → `TextChanged` (echo). Guard your handlers if that matters.

### Minimal working SFC

```vue
<template>
  <TextBox
    Header="Name"
    PlaceholderText="Enter your name"
    :MaxLength="40"
    v-model:Text="name" />
</template>

<script setup>
import { ref } from 'vue'
import { TextBox } from 'winuionweb'

const name = ref('')
</script>
```

Multiline variant:

```vue
<TextBox
  Header="Notes"
  AcceptsReturn
  TextWrapping="Wrap"
  :MaxLength="500"
  MinWidth="400"
  v-model:Text="notes" />
```

---

## 2. PasswordBox

`import { PasswordBox } from 'winuionweb'` → `<PasswordBox>`

It is a thin wrapper that reuses `TextBox` for chrome (header, border, description, flyouts) and
injects its own `<input>` as the field. Registered property elements: `PasswordBox.Header`,
`PasswordBox.HeaderTemplate`, `PasswordBox.Description`, `PasswordBox.ContextFlyout`,
`PasswordBox.SelectionFlyout`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Password` | `string` | `''` | The password value. **This is the v-model prop** (not `value`, not `Text`). |
| `Header` | `string` | `''` | Header above the field. |
| `HeaderTemplate` | `unknown` | *undefined* | Template for `Header`. |
| `Description` | `string` | `''` | Helper text below. |
| `PlaceholderText` | `string` | `''` | Placeholder. |
| `ContextFlyout` | `unknown` | *undefined* | Custom context flyout; `null` disables the built-in one. |
| `SelectionFlyout` | `unknown` | *undefined* | Custom selection flyout; `null` disables. |
| `PasswordChar` | `string` | `'●'` (U+25CF) | Mask character. Must be exactly one non-null UTF-16 character or reading it throws `RangeError`. |
| `PasswordRevealMode` | `string` | `'Peek'` | `'Peek'` (eye button while focused) \| `'Visible'` (plain text, no button) \| `'Hidden'` (always masked, no button). Any other value behaves like `Hidden`/`Peek` per the two checks below. |
| `MaxLength` | `number \| string` | `0` | Max characters; `0` = unlimited. |
| `IsEnabled` | `boolean \| string` | `true` | Enabled state. |
| `InputScope` | `string` | `'Password'` | Only `'NumericPin'` has an effect (`inputmode="numeric"`); everything else is `text`. |
| `SelectionHighlightColor` | `string` | `''` | Selection color (forwarded to TextBox). |
| `PreventKeyboardDisplayOnProgrammaticFocus` | `boolean \| string` | *undefined* (falsy) | **No default is declared**, unlike TextBox. Used by `Focus()`. |
| `Width` | `number \| string` | `''` | Width. |
| `Height` | `number \| string` | `''` | Height. |
| `MinWidth` | `number \| string` | `64` | Min width. |
| `MaxWidth` | `number \| string` | `''` | Max width. |
| `Margin` | `number \| string` | `''` | Outer margin. |
| `Padding` | `number \| string` | `''` | Inner padding. |
| `HorizontalAlignment` | `string` | `''` | → `justify-self`. |
| `VerticalAlignment` | `string` | `''` | → `align-self`. |
| `Background` | `string` | `''` | Fill. |
| `BorderBrush` | `string` | `''` | Border color. |
| `BorderThickness` | `number \| string` | `1` | Border thickness. |
| `CornerRadius` | `number \| string` | `4` | Corner radius. |
| `FontFamily` | `string` | `''` | Font family. |
| `FontSize` | `number \| string` | `14` | Font size (a real number here, not `''`). |
| `FontWeight` | `number \| string` | `400` | Font weight. |
| `Foreground` | `string` | `''` | Text color. |

There is **no** `MinHeight`, `MaxHeight`, `AcceptsReturn`, `TextWrapping`, `IsReadOnly`,
`IsSpellCheckEnabled`, `ShowDeleteButton`, `CharacterCasing` or `Description`-template prop.

### v-model

- **Prop `Password`, event `update:Password` (single string argument).**
- `v-model:Password="pwd"`, or `:Password="pwd"` + `@update:Password="pwd = $event"`.
- Order inside the control on every edit: binding write → `emit('update:Password', next)` →
  `PasswordChanging` → `PasswordChanged`.

### Slots

No content slot. Default-slot property elements: `<PasswordBox.Header>`, `<PasswordBox.HeaderTemplate>`,
`<PasswordBox.Description>`, `<PasswordBox.ContextFlyout>`, `<PasswordBox.SelectionFlyout>`.

### Events

| Event | Payload (`args`) | Notes |
| --- | --- | --- |
| `update:Password` | `string` only | Not `(sender, args)`. |
| `PasswordChanging` | `{ IsContentChanging: true }` | **Not cancelable** (no `Cancel` field). |
| `PasswordChanged` | `{ OriginalSource, Handled }` | **Does not carry the password.** Read `sender.Password`. |
| `GotFocus` / `LostFocus` | `{ OriginalSource, Handled }` | |
| `KeyDown` | `{ Key, Handled, OriginalSource }` | Mutable `Handled`. |
| `Paste` | `{ Handled }` | |
| `ContextMenuOpening` | `{ Handled, CursorLeft, CursorTop }` | |

There is **no** `TextChanged`, no `SelectionChanged`, no `CopyingToClipboard`/`CuttingToClipboard`
(the control calls `preventDefault()` on copy/cut unconditionally).

### Exposed API

`Password` (get/set), `PasswordChar` (get/set), `PasswordRevealMode` (get/set), `IsEnabled` (get/set),
`Focus()`, `SelectAll()`, `PasteFromClipboard()`, `ContextFlyout`, `SelectionFlyout`, `Element`.

### Gotchas

1. **The v-model prop is `Password`.** `v-model` (no argument) does nothing; `v-model:Password` is correct.
2. **`PasswordChanged` has no value in its payload.** The Gallery does
   `PasswordBox_PasswordChanged = sender => { … sender.Password … }` and can reject input by writing
   `sender.Password = ''`. That write goes through the exposed setter → `applyPassword()` → it re-emits
   `update:Password`, so with `v-model:Password` your ref follows. Without a model listener, mirror it
   yourself (`pwd.value = sender.Password`).
3. **Reveal button** exists only for `PasswordRevealMode="Peek"`, and only while the field is focused,
   non-empty, enabled, wide enough (`width > fontSize * 5`) and "reveal eligible". It is a 30px
   trailing button that shows the plaintext **while the pointer/key is held down** (pointer capture),
   then re-masks. There is no `IsPasswordRevealed` prop and no event for reveal.
4. `'Visible'` renders the value as plain text and shows **no** button; `'Hidden'` always masks.
5. `PasswordChar` is validated lazily: `''`, `'\0'` or a 2+ char string throws
   `RangeError('PasswordBox.PasswordChar must be one non-null UTF-16 character.')`.
   A custom character other than `●` swaps in a mask layer (`-webkit-text-security` while composing).
6. The built-in clear button is always suppressed (`HideDeleteButton: true`), and autofill UI is hidden.
7. `InputScope` is nearly cosmetic — only `'NumericPin'` changes `inputmode`.
8. `PreventKeyboardDisplayOnProgrammaticFocus` has no default (undefined) even though TextBox's is `false`.
9. No `MinHeight`/`MaxHeight` — use a wrapping element if you need them.

### Minimal working SFC

```vue
<template>
  <PasswordBox
    Header="Password"
    PlaceholderText="Enter password"
    PasswordRevealMode="Peek"
    :MaxLength="64"
    v-model:Password="password"
    @PasswordChanged="onChanged" />
</template>

<script setup>
import { ref } from 'vue'
import { PasswordBox } from 'winuionweb'

const password = ref('')
const onChanged = (sender) => {
  // the event args carry no value — read it from the sender
  if (sender.Password === 'password') sender.Password = ''
}
</script>
```

---

## 3. RichEditBox

`import { RichEditBox } from 'winuionweb'` → `<RichEditBox>`

A `contenteditable` rich-text editor wrapped in a `TextBox` chrome. Registered property elements:
`RichEditBox.Header`, `RichEditBox.HeaderTemplate`, `RichEditBox.Description`,
`RichEditBox.Background`, `RichEditBox.ContextFlyout`, `RichEditBox.SelectionFlyout`
(note: `RichEditBox.Background` **is** registered, unlike `TextBox.Background`).

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `AcceptsReturn` | `boolean` | `true` | Allow paragraphs (multiline). When `false`, Enter/line-break input is blocked. |
| `CharacterCasing` | `'Normal' \| 'Lower' \| 'Upper'` | `'Normal'` | Forces case of typed text. |
| `ClipboardCopyFormat` | `'AllFormats' \| 'PlainText'` | `'AllFormats'` | `'PlainText'` strips formatting when copying/cutting. |
| `Description` | `string` | `''` | Helper text below. |
| `DesiredCandidateWindowAlignment` | `'Default' \| 'BottomEdge'` | `'Default'` | **Declared but unused — never forwarded to the inner TextBox nor read.** |
| `DisabledFormattingAccelerators` | `'None' \| 'Bold' \| 'Italic' \| 'Underline' \| 'All' \| string` | `'None'` | Hides matching buttons from the built-in command bar (substring match, case-insensitive). |
| `FontFamily` | `string` | `''` | Font family (`MathOnly` mode forces `Cambria Math, serif`). |
| `FontSize` | `number \| string` | `''` | Font size. |
| `FontWeight` | `number \| string` | `''` | Font weight. |
| `FontStyle` | `string` | `'Normal'` | Font style. |
| `Header` | `string` | `''` | Header above the editor. |
| `HeaderPlacement` | `'Top' \| 'Left'` | `'Top'` | **Declared but unused — no code path reads it; header is always on top.** |
| `HeaderTemplate` | `unknown \| null` | *undefined* | Header template. |
| `HorizontalTextAlignment` | `'Left' \| 'Center' \| 'Right' \| 'Justify'` | `'Left'` | Fallback text alignment. |
| `InputScope` | `string` | `'Default'` | Forwarded to the internal TextBox. |
| `IsColorFontEnabled` | `boolean` | `true` | **Declared but unused — never read or forwarded.** |
| `IsReadOnly` | `boolean` | `false` | `contenteditable = false`. |
| `IsEnabled` | `boolean` | `true` | Also controls `contenteditable` and `tabindex`. |
| `IsSpellCheckEnabled` | `boolean` | `true` | `spellcheck` attribute. |
| `IsTextPredictionEnabled` | `boolean` | `true` | `autocomplete` attribute. |
| `MaxLength` | `number` | `0` | Max plain-text length; blocked in `beforeinput` and trimmed on input. `0` = unlimited. |
| `PlaceholderText` | `string` | `''` | Placeholder, rendered by CSS from `data-placeholder`. |
| `PreventKeyboardDisplayOnProgrammaticFocus` | `boolean` | `false` | Focus hint. |
| `ProofingMenuFlyout` | `unknown \| null` | *undefined* | **Declared but unused — no code path reads it.** |
| `SelectionFlyout` | `unknown \| null` | *undefined* | Custom selection flyout. |
| `ContextFlyout` | `unknown \| null` | *undefined* | Custom context flyout. |
| `SelectionHighlightColor` | `string` | `''` | Selection color while focused. |
| `SelectionHighlightColorWhenNotFocused` | `string` | `''` | Selection color while unfocused. |
| `TextAlignment` | `'Left' \| 'Center' \| 'Right' \| 'Justify'` | `'Left'` | Wins over `HorizontalTextAlignment`. |
| `TextReadingOrder` | `'Default' \| 'DetectFromContent' \| 'UseFlowDirection'` | `'DetectFromContent'` | `UseFlowDirection` → `direction: inherit`; otherwise auto. |
| `TextWrapping` | `'NoWrap' \| 'Wrap' \| 'WrapWholeWords'` | `'Wrap'` | Wrapping. |
| `Width` | `number \| string` | `''` | Width. |
| `Height` | `number \| string` | `''` | Height. |
| `MinHeight` | `number \| string` | `''` | Min height. |

### v-model

**None.** There is no `Text` prop and no `update:` event. The document is owned by the DOM and
accessed through the exposed `Document` / `TextDocument` object:

```ts
editor.value.Document.SetText('Text', 'Hello')          // plain text
editor.value.Document.SetText('FormatRtf', rtfString)   // RTF ('Rtf' is the only branch check)
editor.value.Document.GetText()                          // plain text
editor.value.Document.GetText('FormatRtf')               // RTF
editor.value.Document.GetText('UseCrlf')                 // plain text with CRLF
```

`GetText` throws `TypeError('FormatRtf is required for a math document')` when the editor is in
`MathOnly` mode and you ask for anything but RTF.

Full `Document` surface: `GetText(options?)`, `SetText(options, value)`,
`LoadFromStream(options, Blob | ArrayBuffer | string)`, `SaveToStream(options) → Blob`,
`GetRange(start, end)` (returns `{ StartPosition, EndPosition, SetRange, GetText, FindText, CharacterFormat }`),
`Selection` (`StartPosition`, `EndPosition`, `SetRange`, `CharacterFormat`, `ParagraphFormat`),
`GetMathMode()`, `SetMathMode()`, `GetMathML()`, `SetMathML()`, `CanUndo`, `CanRedo`, `Undo()`, `Redo()`.

The Gallery's option strings are `'FormatRtf'` for load/save (`OpenButton_Click`,
`SaveButton_Click`) — the implementation only tests `/rtf/i`, so `'Rtf'` also works.

### Slots

No content slot. Default-slot property elements: `<RichEditBox.Header>`, `<RichEditBox.HeaderTemplate>`,
`<RichEditBox.Description>`, `<RichEditBox.Background>`, `<RichEditBox.ContextFlyout>`,
`<RichEditBox.SelectionFlyout>`. Formatting command bars are configured through
`DisabledFormattingAccelerators` and the flyout `Opening` event (see gotchas), not through slots.

### Events

| Event | Payload (`args`) | Notes |
| --- | --- | --- |
| `TextChanged` | `{ OriginalSource, Handled }` | Any document mutation (typing, formatting, undo, `Document.SetText`, paste). |
| `TextChanging` | `{ IsContentChanging: true }` | Fires before `TextChanged` for the same edit. |
| `SelectionChanged` | `{ OriginalSource, Handled }` | Ranges via `sender.Document.Selection`. |
| `SelectionChanging` | `{ SelectionStart, SelectionLength, Cancel }` | Cancelable. |
| `GotFocus` / `LostFocus` | `{ OriginalSource, Handled }` | |
| `Loaded` / `Unloaded` | `{ OriginalSource, Handled }` | Mount/unmount; the Gallery wires flyout `Opening` listeners here. |
| `Paste` | `{ Handled }` | |
| `CopyingToClipboard` / `CuttingToClipboard` | `{ Handled }` | |
| `ContextMenuOpening` | `{ Handled, CursorLeft, CursorTop }` | |
| `TextCompositionStarted` / `TextCompositionChanged` / `TextCompositionEnded` | `{ OriginalSource, Handled }` | |
| `CandidateWindowBoundsChanged` | `{ rect }` | **Declared but never dispatched.** |

### Exposed API

`Focus()`, `Document`, `TextDocument` (alias), `SelectionFlyout`, `ContextFlyout`,
`Foreground` (computed CSS color), `Background` (computed CSS color),
plus **every prop** as a live getter/setter (`TextWrapping`, `FontSize`, `IsReadOnly`, …).

### Gotchas

1. **No text prop, no v-model.** Bind with `ref` + `Document.SetText/GetText` and `@TextChanged`.
2. **`HeaderPlacement`, `ProofingMenuFlyout` and `DesiredCandidateWindowAlignment` are dead props** —
   declared, defaulted, never read.
3. `AcceptsReturn` defaults to **true** and `TextWrapping` to `'Wrap'`, so it is multiline out of the box.
4. Document mutations made during IME composition are deferred until composition ends
   (`deferDocumentMutation`), so calling `SetText` mid-composition applies later.
5. `Document.SetText` itself calls the internal `onInput`, so it **raises `TextChanged`** — guard against loops.
6. The built-in selection/context menu is a `CommandBarFlyout` (Bold / Italic / Underline + clipboard
   commands). To add commands, listen to the flyout's `Opening` event:
   `sender.SelectionFlyout.addEventListener('Opening', handler)` / `.removeEventListener(...)`,
   and push `h(AppBarButton, …)` into `sender.PrimaryCommands`. `sender.Target` is the RichEditBox.
7. `RichEditBox.Background` is a real property element and overrides the wrapper fill;
   `Foreground` is read from `attrs.Foreground`.
8. `MaxLength` counts plain text (`innerText`) and rejects input in `beforeinput`; it also trims pasted text.
9. Math mode (`Document.SetMathMode('MathOnly')`) swaps the font and enables `GetMathML`/`SetMathML`;
   `GetText()` then requires the RTF option.
10. `IsReadOnly` still allows selection and copy (the command bar keeps copy enabled, hides bold/italic/underline).

### Minimal working SFC

```vue
<template>
  <div>
    <RichEditBox
      ref="editor"
      Height="200"
      PlaceholderText="Write something"
      @TextChanged="onChanged" />
    <button @click="loadSample">Load sample</button>
    <p>{{ plain }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RichEditBox } from 'winuionweb'

const editor = ref(null)
const plain = ref('')

const onChanged = () => {
  plain.value = editor.value.Document.GetText()
}
const loadSample = () => {
  editor.value.Document.SetText('Text', 'Hello WinUI on Web')
}

onMounted(() => {
  editor.value.Document.SetText('Text', 'Initial text')
})
</script>
```

---

## 4. AutoSuggestBox

`import { AutoSuggestBox } from 'winuionweb'` → `<AutoSuggestBox>`

A `TextBox` plus a teleported suggestion list. Registered property elements:
`AutoSuggestBox.QueryIcon`, `AutoSuggestBox.Header`, `AutoSuggestBox.HeaderTemplate`,
`AutoSuggestBox.Description`, `AutoSuggestBox.ItemTemplate`,
`AutoSuggestBox.ItemTemplateSelector`, `AutoSuggestBox.Resources`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Text` | `string` | `''` | Query text. Two-way target (`update:Text`). |
| `PlaceholderText` | `string` | `''` | Placeholder inside the field. |
| `Header` | `unknown` | `''` | Header above the field. |
| `HeaderTemplate` | `unknown` | *undefined* | Header template. |
| `Description` | `string` | `''` | Helper text below. |
| `QueryIcon` | `string \| VNode` | `''` | Trailing query button icon. A string is a glyph (`'Find'` is special-cased to U+E721); empty = no button. |
| `ItemsSource` | `Suggestion[] \| string` | `[]` | Suggestion list. `Suggestion = string \| number \| Record<string, unknown>`. Only a real array produces suggestions. |
| `ItemTemplate` | `unknown` | *undefined* | Template for suggestion rows (function, template nodes, or a resource key). |
| `ItemTemplateSelector` | `unknown` | *undefined* | Object with `SelectTemplate(item, owner)` / `SelectTemplateCore`. |
| `DisplayMemberPath` | `string` | `''` | Dot path used to render the row label. |
| `TextMemberPath` | `string` | `''` | Dot path used as the text inserted into the box when a suggestion is chosen. |
| `UpdateTextOnSelect` | `boolean \| string` | `true` | Write the chosen suggestion's text into `Text` on selection. |
| `IsSuggestionListOpen` | `boolean \| string` | `false` | Open state. Two-way target (`update:IsSuggestionListOpen`). |
| `MaxSuggestionListHeight` | `number \| string` | `300` | Max popup height in px (clamped by available space). |
| `AutoMaximizeSuggestionArea` | `boolean \| string` | `false` | Let the popup use all space on the chosen side instead of `MaxSuggestionListHeight`. |
| `DesiredCandidateWindowAlignment` | `string` | `'BottomEdge'` | IME hint; also biases the popup downward while composing. |
| `LightDismissOverlayMode` | `string` | `'Auto'` | **Declared but unused — no code path reads it.** |
| `TextBoxStyle` | `unknown \| null` | *undefined* | Style/resource key; only its `Background` setter is honored. |
| `KeepInteriorCornersSquare` | `boolean \| string` | `false` | **Declared but unused — no code path reads it.** |
| `IsEnabled` | `boolean \| string` | `true` | Enabled state (closing the list when disabled). |
| `Width` | `number \| string` | `''` | Width of the whole control. |

### v-model

- **`v-model:Text`** — prop `Text`, event `update:Text` (string).
- **`v-model:IsSuggestionListOpen`** — prop `IsSuggestionListOpen`, event `update:IsSuggestionListOpen` (boolean).
- `ItemsSource` has **no** `update:ItemsSource`; it is one-way (see gotchas).

### Slots

No content slot and **no items slot**: suggestions come only from `ItemsSource` (or by assigning
`sender.ItemsSource`). Default-slot property elements: `<AutoSuggestBox.QueryIcon>`,
`<AutoSuggestBox.Header>`, `<AutoSuggestBox.HeaderTemplate>`, `<AutoSuggestBox.Description>`,
`<AutoSuggestBox.ItemTemplate>`, `<AutoSuggestBox.ItemTemplateSelector>`,
`<AutoSuggestBox.Resources>`.

### Events

The "text changed" and "query submitted" events are `TextChanged` and `QuerySubmitted`.
The payloads are plain objects and are **not** the DOM event:

| Event | Payload (`args`) |
| --- | --- |
| `update:Text` | `string` only |
| `update:IsSuggestionListOpen` | `boolean` only |
| `TextChanged` | `{ Reason: 'UserInput' \| 'ProgrammaticChange' \| 'SuggestionChosen' }` — `sender.Text` holds the new text |
| `SuggestionChosen` | `{ SelectedItem: Suggestion }` |
| `QuerySubmitted` | `{ QueryText: string, ChosenSuggestion: Suggestion \| null }` |

`TextChanged` fires for all three reasons (typing, `sender.Text = …` / prop change, and choosing a
suggestion when `UpdateTextOnSelect`). The Gallery filters with
`if (args.Reason !== 'UserInput') return`.

`QuerySubmitted` fires on Enter (with the highlighted suggestion, or `null`), on a suggestion click
(after `SuggestionChosen`), and on clicking the `QueryIcon` button. It does not fire on Escape or Tab.

### Exposed API

`Text` (get/set), `ItemsSource` (get/set), `IsSuggestionListOpen` (get/set),
`ItemTemplate`, `ItemTemplateSelector`, `DisplayMemberPath`, `Header`, `HeaderTemplate`, `Description`
(all get/set, written through `updateXamlBinding`), `Element`, `Focus()`.
`sender.ItemsSource = …` is accepted, but it does **not** emit `update:ItemsSource` (there is none).

### Gotchas

1. **`ItemsSource` is one-way.** Two patterns both work: replace the bound array in your own ref
   (`suggestions.value = filtered`) so the prop's identity changes, or assign
   `sender.ItemsSource = filtered` (the Gallery pattern), which installs a local override
   (`localItems`) that is dropped the next time the bound array identity changes. Mutating the bound
   array in place (`arr.push`) does neither → the list does not refresh; the watcher is
   identity-based, not deep.
2. `ItemsSource` typed as `Suggestion[] | string` is for XAML binding strings; a plain string value
   yields no suggestions (`sourceItems` returns `[]` unless `Array.isArray`).
3. Suggested label resolution order: `DisplayMemberPath` path → `TextMemberPath` path →
   `Title` / `title` / `text` / `name` → `String(item)`.
4. A row whose label equals the localized "No results found" text, or any item with
   `{ noResults: true }`, is rendered disabled and is not selectable/arrow-navigable.
5. The popup is `Teleport`ed to `body` with `position: fixed` and its own theme scope
   (`theme-light` / `theme-dark`), so parent CSS scoping and parent theme classes do not reach it.
6. Opening only happens while the field is focused and the list is non-empty; `setOpen(true)` with an
   empty list is a no-op. After a `TextChanged` assignment the open check runs on `nextTick`.
7. Keyboard: ArrowUp/Down move the highlight *and* call `SuggestionChosen` (`UpdateTextOnSelect`
   inserts the text); Enter submits; Escape restores the original query text and closes; Tab closes.
8. `Escape` restores the pre-edit query — useful, and easy to be surprised by.
9. `QueryIcon` is also the way to get a search-style trailing button; there is no "clear" button toggle
   (`ShowDeleteButton` is not exposed; the internal clear button shows per TextBox rules).
10. `LightDismissOverlayMode` and `KeepInteriorCornersSquare` are inert.
11. `TextBoxStyle` is only inspected for a `Background` setter.

### Minimal working SFC

```vue
<template>
  <AutoSuggestBox
    Header="Search"
    PlaceholderText="Type a control name"
    QueryIcon="Find"
    :ItemsSource="suggestions"
    v-model:Text="query"
    @TextChanged="onTextChanged"
    @QuerySubmitted="onQuerySubmitted" />
</template>

<script setup>
import { ref } from 'vue'
import { AutoSuggestBox } from 'winuionweb'

const all = ['Button', 'CheckBox', 'ComboBox', 'NumberBox', 'TextBox']
const query = ref('')
const suggestions = ref([])

const onTextChanged = (sender, args) => {
  if (args.Reason !== 'UserInput') return
  const q = sender.Text.toLowerCase()
  suggestions.value = all.filter(name => name.toLowerCase().includes(q))
  // Gallery alternative: sender.ItemsSource = suggestions.value
}

const onQuerySubmitted = (_sender, args) => {
  console.log('query:', args.QueryText, 'chosen:', args.ChosenSuggestion)
}
</script>
```

---

## 5. ComboBox

`import { ComboBox } from 'winuionweb'` → `<ComboBox>`

Registered: `ComboBox` itself, the global `ComboBoxItem` and `x:String` element components,
and property elements `ComboBox.ItemTemplate`, `ComboBox.Items`, `ComboBox.Resources`,
`ComboBox.ItemContainerStyle`, `ComboBox.Header`, `ComboBox.HeaderTemplate`, `ComboBox.Description`.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ItemsSource` | `Array \| String` | *undefined* | Items. **When it is an array it wins over inline children, even when empty.** |
| `ItemTemplate` | `String \| Object \| Function` | *undefined* | Row/face template: function, template nodes, or `{StaticResource …}` key. |
| `Header` | `unknown` | `''` | Header above the control. |
| `HeaderTemplate` | `unknown` | *undefined* | Header template. |
| `Description` | `unknown` | `''` | Helper text below. |
| `ItemContainerStyle` | `unknown` | *undefined* | Style whose setters map to item CSS (`Width/Height/Min*/Max*/FontSize/Foreground/Padding` only). |
| `PlaceholderText` | `String \| Number` | `''` | Text shown on the face while nothing is selected. |
| `IsEditable` | `Boolean \| String` | `false` | Editable face with an inner `TextBox`; enables `Text`/`TextSubmitted`. |
| `IsEnabled` | `Boolean \| String` | `true` | Enabled state. |
| `IsDropDownOpen` | `Boolean \| String` | *undefined* | Initial/one-way open state. |
| `SelectedIndex` | `Number \| String` | *undefined* | Selected index input; out-of-range → `-1`. |
| `SelectedItem` | `any` | *undefined* | Selected item input (identity match). |
| `SelectedValue` | `any` | *undefined* | Selected value input, matched against `SelectedValuePath`. |
| `SelectedValuePath` | `String \| Number` | `''` | Dot path that produces `SelectedValue` from an item. |
| `DisplayMemberPath` | `String \| Number` | `''` | Dot path for the visible label. |
| `Text` | `String \| Number` | *undefined* | Face text (editable mode). |
| `IsTextSearchEnabled` | `Boolean \| String` | `true` | Type-to-select on the closed combo. |
| `SelectionChangedTrigger` | `String` | `'Committed'` | `'Committed'` (on commit/close) or `'Always'` (on highlight). |
| `LightDismissOverlayMode` | `String` | `'Auto'` | `'On'` renders a full-screen dismiss overlay. |
| `IsTabStop` | `Boolean \| String` | `true` | `false` → `tabindex="-1"`. |
| `RequestedTheme` | `String` | `'Default'` | `'Light'` / `'Dark'` theme class on root **and** teleported flyout. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` → `display: none`. |
| `Background` | `String \| Object` | `''` | Face/dropdown fill (acrylic brush supported). |
| `Foreground` | `String` | `''` | Text color. |
| `BorderBrush` | `String \| Object` | `''` | Border color. |
| `BorderThickness` | `String \| Number` | `1` | Border thickness. |
| `CornerRadius` | `String \| Number` | `4` | Corner radius. |
| `Padding` | `String \| Number` | `''` | Content padding. |
| `PlaceholderForeground` | `String` | `''` | Placeholder color. |
| `FontFamily` | `String` | `''` | Font family. |
| `FontSize` | `String \| Number` | `''` | Font size. |
| `FontWeight` | `String \| Number` | `''` | Font weight. |
| `HorizontalContentAlignment` | `String` | `'Stretch'` | Face content horizontal alignment. |
| `VerticalContentAlignment` | `String` | `'Top'` | Face content vertical alignment. |
| `Width` | `String \| Number` | `''` | Width. |
| `Height` | `String \| Number` | `''` | Height. |
| `MinWidth` | `String \| Number` | `''` | Min width. |
| `MinHeight` | `String \| Number` | `''` | Min height. |
| `MaxWidth` | `String \| Number` | `''` | Max width. |
| `MaxHeight` | `String \| Number` | `''` | Max height. |
| `Margin` | `String \| Number` | `''` | Outer margin (XAML thickness order). |
| `HorizontalAlignment` | `String` | `'Left'` | → `justify-self`; `'Stretch'` + no `Width` → `width: 100%`. |
| `VerticalAlignment` | `String` | `'Top'` | → `align-self`. |
| `MaxDropDownHeight` | `Number \| String` | `504` | Max dropdown height in px (drives paging/placement). |

### v-model

**There is no v-model.** `defineEmits` is exactly
`['DropDownOpened', 'DropDownClosed', 'SelectionChanged', 'TextSubmitted', 'Loaded']` —
no `update:SelectedIndex`, `update:SelectedItem`, `update:SelectedValue`, `update:Text`,
`update:IsDropDownOpen`. Consequences:

- `SelectedIndex` / `SelectedItem` / `SelectedValue` / `Text` / `IsDropDownOpen` are **inputs only**.
- To read the selection, use the `SelectionChanged` payload or the `sender` object, then write your own
  state (a plain `ref` that is *not* fed back through `:SelectedIndex` is the simplest form):

```vue
<template>
  <ComboBox
    Header="Color"
    :ItemsSource="colors"
    :SelectedIndex="index"
    @SelectionChanged="(sender) => (index = sender.SelectedIndex)" />
</template>

<script setup>
import { ref } from 'vue'
import { ComboBox } from 'winuionweb'

const colors = ['Blue', 'Green', 'Red', 'Yellow']
const index = ref(0)
</script>
```

Re-writing the same value back through `:SelectedIndex` is harmless (the control ignores a no-op
selection change), but there is no `update:` event, so `v-model:SelectedIndex` does nothing.

### Items / label rendering

Three ways to provide items:

1. `:ItemsSource="array"` — primitives, or objects; object items may carry `Content`, `Tag`,
   `IsEnabled`, and a key (`Key` / `Id` / `id`).
2. Inline children in the default slot: `<x:String x:Uid="…">Text</x:String>` or
   `<ComboBoxItem Content="Text" />` (optionally `Tag`, `IsEnabled`), or a
   `<ComboBox.Items> … </ComboBox.Items>` wrapper. Inline items are ignored when `ItemsSource` is an array.
3. `<ComboBox.ItemTemplate>` / `:ItemTemplate` — a `DataTemplate` body or a function `(item) => VNode`.

Label resolution (`GetItemLabel`):

```
DisplayMemberPath ? getPathValue(item, DisplayMemberPath)
  : primitive item                       → String(item)
  : object with Content                  → String(Content) when string/number
  : object with custom toString          → String(item)
  : otherwise                            → ''
```

So for object items you must set `DisplayMemberPath` (e.g. `"Name"`), give the item a `Content`
string, or supply an `ItemTemplate` — otherwise rows render empty.

The selected face uses the same label, or `ItemTemplate` when one is supplied; when nothing is
selected it renders `PlaceholderText` (class `win-combo-placeholder`).

`SelectedValue` is derived via `SelectedValuePath` (default: the item itself), and
`SelectedIndex` / `SelectedItem` / `SelectedValue` are kept mutually in sync; changing one and
re-rendering updates the others.

### Slots

Default slot only, and it carries **property elements and inline items** (see above). There is no
"selected content" slot and no footer slot.

### Events

All raised as `(sender, args)`; `args.OriginalSource` defaults to the sender.

| Event | Payload (`args`) | Notes |
| --- | --- | --- |
| `SelectionChanged` | `{ AddedItems: any[], RemovedItems: any[], Handled, OriginalSource }` | Empty arrays when the selection is cleared. Fires on commit (`SelectionChangedTrigger="Committed"`) or highlight (`"Always"`). |
| `DropDownOpened` | `{ OriginalSource, Handled }` | Raised before the popup finishes positioning. |
| `DropDownClosed` | `{ OriginalSource, Handled }` | |
| `TextSubmitted` | `{ Text: string, Handled }` | Editable mode only, on Enter/blur commit. Set `Handled = true` to keep a custom value instead of matching an item. |
| `Loaded` | `{ OriginalSource, Handled }` | Fired once the control is mounted. |

### Sender / exposed API

The `sender` passed to events is a dependency-property-shaped object (also what `x:Name` references get):
`Element`, `Name`, `IsEnabled`, `Text`, `SelectedIndex`, `SelectedItem`, `SelectedValue`,
`IsDropDownOpen` (all get/set, setters run the control's own logic), plus read-only
`Items`, `ItemsSource`, `SelectionBoxItem`, `SelectionBoxItemTemplate`, and `Focus()`.

### Gotchas

1. **No v-model** (see above). `v-model:SelectedIndex` will silently do nothing.
2. An **empty `ItemsSource` array suppresses inline children** — `:ItemsSource="[]"` renders an empty
   combo even if you also listed `<x:String>` children. Omit the prop to use inline items.
3. Object items without `DisplayMemberPath` / `Content` / `ItemTemplate` render as empty rows.
4. The dropdown is `Teleport`ed to `body`; its theme comes from `RequestedTheme` or the nearest
   `.theme-light` / `.theme-dark` ancestor, mirrored as a class on the flyout.
5. `SelectedIndex` accepts numeric strings (`SelectedIndex="2"` → `2`), and is clamped to `-1` when the
   index is out of range; `selectedIndex = -1` on an empty `ItemsSource` is normal.
6. Non-editable `SelectedItem` assignments to an item that is not in `ItemsSource` are ignored;
   editable mode instead keeps an unmatched value as a custom `SelectedItem` with index `-1`.
7. `Header` also acts as the `aria-label` fallback for the face when no `PlaceholderText` is present.
8. `ItemContainerStyle` only supports `Width/Height/MinWidth/MinHeight/MaxWidth/MaxHeight/FontSize/
   Foreground/Padding`; other setters are dropped.
9. `MaxDropDownHeight` (504 by default) drives both paging and whether the flyout opens upward.
10. `LightDismissOverlayMode="On"` shows a full-width dimming overlay that closes on pointerdown.

### Minimal working SFC

```vue
<template>
  <ComboBox
    Header="Color"
    PlaceholderText="Pick a color"
    :ItemsSource="colors"
    @SelectionChanged="onSelectionChanged" />
</template>

<script setup>
import { ref } from 'vue'
import { ComboBox } from 'winuionweb'

const colors = ['Blue', 'Green', 'Red', 'Yellow']
const selected = ref(null)

const onSelectionChanged = (sender, args) => {
  selected.value = sender.SelectedValue                               // the item (or path value)
  console.log(sender.SelectedIndex, args.AddedItems[0])
}
</script>
```

Object items with a label path:

```vue
<template>
  <ComboBox
    Header="Font"
    DisplayMemberPath="Name"
    SelectedValuePath="Font"
    :ItemsSource="fonts"
    @SelectionChanged="(sender) => font = sender.SelectedValue" />
</template>

<script setup>
import { ref } from 'vue'
import { ComboBox } from 'winuionweb'

// items: [{ Name: 'Arial', Font: 'Arial' }, { Name: 'Segoe UI', Font: 'Segoe UI' }]
const fonts = [
  { Name: 'Arial', Font: 'Arial' },
  { Name: 'Segoe UI', Font: 'Segoe UI' }
]
const font = ref(null)
</script>
```

---

## 6. NumberBox

`import { NumberBox } from 'winuionweb'` → `<NumberBox>`

Wraps a `TextBox` plus spin buttons (inline row or compact popup). Only property element registered:
`NumberBox.HeaderTemplate` (`<NumberBox.HeaderTemplate>`); there is no `NumberBox.Header` element —
use the `Header` prop.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Value` | `number \| string` | `NaN` | Numeric value. `NaN` renders an empty field. Two-way target (`update:Value`). |
| `Text` | `string` | `''` | Text shown in the field (formatted). Two-way target (`update:Text`). |
| `Minimum` | `number \| string` | `-Infinity` | **Lower bound** (clamps on commit unless `ValidationMode="Disabled"`). |
| `Maximum` | `number \| string` | `+Infinity` | **Upper bound.** |
| `SmallChange` | `number \| string` | `1` | **Step** for ArrowUp/ArrowDown, mouse wheel, and the spin buttons. |
| `LargeChange` | `number \| string` | `10` | Step for PageUp/PageDown. |
| `Header` | `unknown` | `''` | Header above the field. |
| `HeaderTemplate` | `unknown \| null` | *undefined* | Header template. |
| `Description` | `string` | `''` | Helper text below. |
| `PlaceholderText` | `string` | `''` | Placeholder. |
| `InputScope` | `string` | `'Decimal'` | Forwarded to the inner TextBox (`Decimal` → `inputmode="decimal"`). |
| `SelectionFlyout` | `unknown \| null` | *undefined* | Forwarded selection flyout. |
| `SelectionHighlightColor` | `string` | `''` | Selection color. |
| `TextReadingOrder` | `string` | `'Default'` | **Declared but unused — never read or forwarded.** |
| `PreventKeyboardDisplayOnProgrammaticFocus` | `boolean \| string` | `false` | Focus hint. |
| `NumberFormatter` | `Intl.NumberFormat \| { format?, FormatDouble?, ParseDouble? } \| string \| null` | `null` | Formats `Value` → `Text` and parses typed text. |
| `SpinButtonPlacementMode` | `'Hidden' \| 'Compact' \| 'Inline' \| string` | `'Hidden'` | `'Inline'` = two trailing buttons in the field; `'Compact'` = popup while focused + a small indicator glyph; anything else = `'Hidden'`. |
| `ValidationMode` | `'InvalidInputOverwritten' \| 'Disabled' \| string` | `'InvalidInputOverwritten'` | On invalid/out-of-range input: restore last valid value, or keep it and skip clamping. |
| `IsWrapEnabled` | `boolean \| string` | `false` | Spin past `Maximum`/`Minimum` wraps to the other end. |
| `AcceptsExpression` | `boolean \| string` | `false` | Evaluate arithmetic (`"1+2*3"`, `^`, parentheses) on commit. |
| `IsEnabled` | `boolean \| string` | `true` | Enabled state. |
| `TextAlignment` | `'Left' \| 'Center' \| 'Right' \| 'Justify' \| string` | `'Left'` | Field text alignment. |
| `MinWidth` | `number \| string` | `64` | Min width (inline mode floors at `120`). |
| `MinHeight` | `number \| string` | `''` | Min height. |
| `MaxWidth` | `number \| string` | `''` | Max width. |
| `MaxHeight` | `number \| string` | `''` | Max height. |
| `VerticalAlignment` | `string` | `'Stretch'` | → `align-self`. |
| `HorizontalAlignment` | `string` | `'Stretch'` | → `justify-self`. |
| `Width` | `number \| string` | `''` | Width. |
| `Margin` | `number \| string` | `''` | Outer margin. |

Note the names: the bounds are `Minimum` / `Maximum` (not `Min` / `Max`), and the step is
`SmallChange` (not `Step`). There is no `Step` prop.

### v-model

- **`v-model:Value`** — prop `Value`, event `update:Value` (a `number`; `NaN` means empty).
- **`v-model:Text`** — prop `Text`, event `update:Text` (formatted string).
- `setValue()` emits in this order: `update:Value` → `update:Text` → `ValueChanged`.

### Slots

No content slot. Only `<NumberBox.HeaderTemplate>` is recognized in the default slot; header/description
text come from props.

### Events

| Event | Payload (`args`) |
| --- | --- |
| `update:Value` | `number` only |
| `update:Text` | `string` only |
| `ValueChanged` | `{ OldValue: number, NewValue: number }` (sender is the control API) |

`ValueChanged` fires only when the committed number actually changes. Typing alone does not commit.

### Exposed API

`Value` (get/set), `Text` (get/set, commits), `NumberFormatter` (get/set), `Header`, `HeaderTemplate`,
`SpinButtonPlacementMode`, `Minimum`, `Maximum`, `SmallChange`, `LargeChange`, `ValidationMode`,
`IsWrapEnabled`, `AcceptsExpression`, `IsEnabled`, `Element`, `Focus()`.

### Gotchas

1. **`Value` is committed, not live.** Keystrokes update `Text` (and `update:Text`) only; `Value` /
   `ValueChanged` update on Enter, on blur, on wheel, on spin buttons and on PageUp/PageDown.
2. `Value` defaults to `NaN`; that is the representation of an empty NumberBox. `Text="NaN"` likewise
   parses to `NaN`.
3. Clamping to `Minimum`/`Maximum` happens on commit; `ValidationMode="Disabled"` skips clamping and
   keeps out-of-range numbers. With `InvalidInputOverwritten`, unparsable text reverts to the last
   valid value.
4. `IsWrapEnabled` only affects the spin path (`changeBy`), not typed values (which still clamp).
5. `NumberFormatter` accepts an `Intl.NumberFormat` (uses `format`), or an object with
   `FormatDouble(value)` / `ParseDouble(text)`; commas are stripped when parsing. Changing the
   formatter re-renders `Text`.
6. `AcceptsExpression` uses the reference NumberBoxParser rules: `+ - * / ^`, parentheses,
   left-associative exponentiation, unary minus on tokens; invalid expressions revert per `ValidationMode`.
7. There is **no `TextChanged`** event; use `update:Value` / `ValueChanged`.
8. `SpinButtonPlacementMode="Inline"` renders two trailing buttons inside the field and reserves
   `76px`; `"Compact"` renders an indicator glyph inside the field and a teleported popup with the two
   buttons while focused. The clear button is suppressed in both modes
   (`ReserveDeleteButtonWidth: 40` still reserves space).
9. `InputScope` defaults to `'Decimal'` (not `'Default'`) and falls back to `'Decimal'` when empty.
10. Arrow keys / wheel/ PageUp/PageDown are swallowed while focused (`preventDefault`), and wheel only
    works when the control is focused.

### Minimal working SFC

```vue
<template>
  <NumberBox
    Header="Quantity"
    PlaceholderText="0"
    :Minimum="0"
    :Maximum="100"
    :SmallChange="1"
    :LargeChange="10"
    SpinButtonPlacementMode="Inline"
    v-model:Value="quantity"
    @ValueChanged="onValueChanged" />
</template>

<script setup>
import { ref } from 'vue'
import { NumberBox } from 'winuionweb'

const quantity = ref(1)
const onValueChanged = (sender, args) => {
  console.log(args.OldValue, '→', args.NewValue)
}
</script>
```

---

## 7. Cross-control notes

- **`unknown` leftovers.** Only three genuinely undetermined things came up while reading the sources,
  and none of them is API surface: (a) why `TextBox.IsColorFontEnabled`, `AutoSuggestBox.LightDismissOverlayMode`,
  `AutoSuggestBox.KeepInteriorCornersSquare`, `NumberBox.TextReadingOrder`, `RichEditBox.HeaderPlacement`,
  `RichEditBox.ProofingMenuFlyout`, `RichEditBox.IsColorFontEnabled` and
  `RichEditBox.DesiredCandidateWindowAlignment` are declared without an implementation, (b) why
  `CandidateWindowBoundsChanged` is declared but never raised (TextBox and RichEditBox),
  and (c) the exact intent of `DesiredCandidateWindowAlignment` (TextBox / AutoSuggestBox) in a non-WebView2
  host. Behaviour is documented as "no effect" above; do not rely on these.
- **Events are not DOM events.** All six call `handler(sender, args)`; there is no `event.target`
  unless the payload happens to include `OriginalSource`.
- **`update:*` events are the exception**: they are plain Vue emits with a single value (no sender).
- **Property elements vs. global registration.** `app.use(WinUIOnWeb)` is the only way to get every
  `Control.Property` tag plus `ComboBoxItem` / `x:String` without extra work; with local imports, register
  the statics you use (`'TextBox.Header': TextBox.Header`) and note that `ComboBoxItem` and `XamlString`
  are **not exported** from the package index (they are only registered by the plugin).
- **Styling hooks.** Text inputs are styled with CSS variables (`--textbox-*`, `--ComboBox*`,
  `--PasswordBoxTopHeaderMargin`, `--AutoSuggestBoxTopHeaderMargin`, `--asb-*`) and rely on
  `winuionweb/style.css`; `win-theme-scope theme-light|theme-dark` on an ancestor drives theming.
