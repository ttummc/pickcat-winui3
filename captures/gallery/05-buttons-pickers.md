# 05 · Buttons & Pickers — WinUI on Web reference

Read from the actual implementation:

- components: `WinUIonWeb-master/WinUIonWeb/src/components/<Name>.vue`
- demos: `WinUIonWeb-master/WinUIonWeb/src/gallery/pages/<Name>Page.vue`

Covered (only) these 16 controls: **Button, ToggleButton, SplitButton, DropDownButton, RepeatButton, HyperlinkButton, AppBarButton, AppBarToggleButton, AppBarSeparator, CheckBox, RadioButton, RadioButtons, ToggleSwitch, Slider, Rating, ColorPicker.**

## Conventions used in this file

- **Prop names are written exactly as declared** — almost all are PascalCase (`IsChecked`, `OnContent`, `TickPlacement`). A handful of controls also declare lowercase Vue-friendly aliases (`modelValue`, `max`, `disabled`, `previousColor`, `onContent`); they are listed where they exist.
- **Values may be raw or XAML markup strings.** Every component funnels prop values through `resolveXamlValue()` (`xamlRuntime.ts`), so `Content="{x:Bind Labels.Ok}"`, `Style="{StaticResource AccentButtonStyle}"`, `IsChecked="{x:Bind state, Mode=TwoWay}"` work, as do plain `:prop="jsValue"` bindings.
  - `"True"` / `"False"` (exact case) are coerced to booleans; `"true"` (lowercase) is **not** and stays a string.
  - A bare attribute (`<CheckBox IsThreeState>`) becomes `true` for `[Boolean, String]` props.
  - Unresolved `{x:Bind ...}` expressions resolve to `undefined` (= the prop default), never to a literal string.
- **Event args:** handlers are invoked as `(sender, args)` unless explicitly noted. `sender` is the control's exposed public API object (`sender.Name` works — it reads `data-xaml-ref` / `x:Name` / `Name`). A few controls deviate (`Toggled`, `ColorChanged`, `RadioButton` group `SelectionChanged`) and are flagged.
- **Listener casing:** the components emit PascalCase names (`Click`, `Checked`, `ValueChanged`, …). Write `@Click`, `@Checked`, `@ValueChanged` in templates, exactly as the gallery does. Vue normalizes `@click` and `@Click` onto the same `onClick` handler key, so `@click` also fires, but mixed casing is the only place you can get a "casing" warning — keep the XAML casing.
- **Snippets** are complete SFCs assuming the file lives in `src/gallery/pages/` (imports therefore use `../../components/...`, exactly like the gallery demos). They are minimal, not pretty.

## Quick index

| Control | Component file | Renders | v-model | Main events |
| --- | --- | --- | --- | --- |
| Button | `Button.vue` | `<button type="button">` | — (no `update:Content`) | `Click` + 12 input events |
| ToggleButton | `ToggleButton.vue` | `Button` | **none** (no `update:IsChecked`) | `Click`, `Checked`, `Unchecked`, `Indeterminate` |
| SplitButton | `SplitButton.vue` | `<div role="button">` + 2 internal Buttons | — | `Click` |
| DropDownButton | `DropDownButton.vue` | `Button` + chevron | — | `Click` + forwarded Button events |
| RepeatButton | `RepeatButton.vue` | `Button` | — | `Click` (repeating) |
| HyperlinkButton | `HyperlinkButton.vue` | `<a>` when `NavigateUri`, else `<button>` | — | `Click` |
| AppBarButton | `AppBarButton.vue` | `<button>` | — | `Click` + 11 input events |
| AppBarToggleButton | `AppBarToggleButton.vue` | wrapped `AppBarButton` | `v-model:IsChecked` | `Click`, `Checked`, `Unchecked`, `Indeterminate` |
| AppBarSeparator | `AppBarSeparator.vue` | `<div role="separator">` | — | none (only `update:*`) |
| CheckBox | `CheckBox.vue` | `<div role="checkbox">` | `v-model:IsChecked` | `Click`, `Checked`, `Unchecked`, `Indeterminate` |
| RadioButton | `RadioButton.vue` | `<label>` + native radio | `v-model:IsChecked`, `v-model`+`value`, `v-model:SelectedIndex` | `Checked`, `Unchecked`, `SelectionChanged` |
| RadioButtons | `RadioButtons.vue` | group wrapper over `RadioButton`s | `v-model:SelectedIndex`, `v-model:SelectedItem` | `SelectionChanged` |
| ToggleSwitch | `ToggleSwitch.vue` | `<div role="switch">` | `v-model`, `v-model:IsOn` | `Toggled` |
| Slider | `Slider.vue` | `<div role="slider">` | `v-model:Value` | `ValueChanged` |
| Rating | `Rating.vue` (gallery imports it as `RatingControl`) | `<div role="slider">` | `v-model`, `v-model:Value` | `ValueChanged` |
| ColorPicker | `ColorPicker.vue` | `<div class="win-color-picker">` | `v-model`, `v-model:Color` | `ColorChanged` |

---

## 1. Button

**Import:** `import Button from '../../components/Button.vue'`

Props (declaration order):

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Style` | `String` | `''` | Style-class selector. Matched by **substring**. Recognized: `AccentButtonStyle`, `SubtleButtonStyle`, `DefaultButtonStyle`, `TitleBarBackButtonStyle`, `TitleBarPaneToggleButtonStyle`. Anything else silently renders the default button. |
| `RequestedTheme` | `String` | `'Default'` | `'Light'` / `'Dark'` / `'Default'`; applies a theme scope class on the button only. |
| `Content` | `unknown` | `undefined` | Text or VNode. Ignored when a default slot is present. |
| `ContentTemplate` | `unknown` | `undefined` | DataTemplate-ish value; also settable as `<Button.ContentTemplate>`. |
| `ContentTransitions` | `unknown` | `undefined` | Transition description; not rendered by the button itself. |
| `ClickMode` | `String` | `'Release'` | `'Release'` (click on release), `'Press'` (fire on press), `'Hover'` (fire on pointer enter). |
| `IsTabStop` | `Boolean \| String` | `true` | `false` renders `tabindex="-1"`. |
| `Command` | `Object \| String` | `undefined` | UICommand-like object (`CanExecute`, `Execute`, `MatchesKeyboardEvent`, `Label`, `Description`, `IconSource`). |
| `CommandParameter` | `unknown` | `undefined` | Passed to `CanExecute` / `Execute`. |
| `Flyout` | `unknown` | `undefined` | A `Flyout` VNode or a controller with `ShowAt()`. See the gotcha for the two open paths. |
| `IsEnabled` | `Boolean \| String` | `true` | ANDed with `Command.CanExecute(...)`. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` → `display:none` (button also stops raising `Click`). |
| `Background` | `String \| Object` | `''` | Brush name/CSS or brush object (`<Button.Background>` child also works). |
| `BackgroundSizing` | `String` | `''` | Empty → `OuterBorderEdge` for accent, `InnerBorderEdge` otherwise. |
| `Foreground` | `String` | `''` | Text colour. |
| `BorderBrush` | `String` | `''` | Border colour; elevation brushes are kept as separate top/side/bottom colours. |
| `BorderThickness` | `String \| Number` | `''` | Empty → `1`. |
| `Padding` | `String` | `''` | Empty → `'11,5,11,6'` (applied on the inner ContentPresenter, not on the `<button>`). |
| `Margin` | `String` | `''` | XAML thickness. |
| `Width` `Height` `MaxWidth` `MaxHeight` `MinWidth` `MinHeight` | `String \| Number` | `''` | CSS lengths (`12` → `12px`). `MinHeight` default is `0`, not 32. |
| `HorizontalAlignment` | `String` | `'Left'` | `justify-self` mapping (`Left/Center/Right/Stretch`). |
| `VerticalAlignment` | `String` | `'Center'` | `align-self` mapping. |
| `HorizontalContentAlignment` | `String` | `''` | Empty → `'Center'`. |
| `VerticalContentAlignment` | `String` | `''` | Empty → `'Center'`. |
| `FontFamily` | `String` | `''` | |
| `FontWeight` | `String` | `''` | `'SemiBold'` → `600`. |
| `FontSize` | `String \| Number` | `''` | Base CSS font-size is 14px. |
| `UseSystemFocusVisuals` | `Boolean \| String` | `true` | Renders the `FocusVisual` overlay. |
| `FocusVisualMargin` | `String \| Number` | `''` | Empty → `-3`. |
| `CornerRadius` | `String \| Number` | `''` | Empty → `4`. |

Child "property" components exported by `Button.vue`: `Button.Content`, `Button.Flyout`, `Button.KeyboardAccelerators`, `Button.Resources`, `Button.Background`.

**v-model:** none. `Content` is a normal prop; the button never emits `update:Content`. Keep your own state and update the prop.

**Slots:** default slot = content (checked before the `Content` prop, and nested `<Button.Content>` is pulled out of the slot and used as content).

**Events** (all `(sender, args)`):

| Event | args |
| --- | --- |
| `Click` | `{ OriginalSource: sender, OriginalEvent: MouseEvent \| KeyboardEvent, Handled }` — also executes `Command`. |
| `GotFocus` / `LostFocus` | `{ OriginalSource, OriginalEvent: FocusEvent, Handled }` |
| `KeyDown` / `KeyUp` | `{ OriginalSource, OriginalEvent, Key, Handled }` — `Key` normalized: `'Space'`, `'Down'`, `'Up'`, `'Left'`, `'Right'`; `Handled = true` calls `preventDefault()`. |
| `PointerEntered` `PointerExited` `PointerMoved` `PointerPressed` `PointerReleased` `PointerCanceled` `PointerCaptureLost` | `{ OriginalSource, OriginalEvent, Handled, Pointer: { PointerId, PointerDeviceType: 'Mouse'\|'Touch'\|'Pen' }, GetCurrentPoint(relativeTo?) → { Position: {X,Y}, IsInContact } }` |
| `ContextRequested` | `{ OriginalSource, OriginalEvent, Handled, PointerPosition: {X,Y}, TryGetPosition(relativeTo?) }` (fires on right-click; only attached when you pass `@ContextRequested` / `ContextRequested`) |

**Gotchas**

- `Style` is a **prop**, not the HTML attribute — capital `S`. The HTML `style` attribute still works and is merged with the computed layout style.
- `Style` matching is `includes(...)`: `Style="AccentButtonStyle"` and `Style="{StaticResource AccentButtonStyle}"` are equivalent. There is no `AccentButton` boolean and no `Appearance` prop.
- **There is no `Icon` prop or `Icon` slot.** Put an icon component inside the button (as content or inside `<Button.Content>`). `<FontIcon>` and kebab-case `<font-icon>` both resolve when imported in `<script setup>`.
- An icon-only button is **not** auto-styled as a square. The shared content presenter keeps `11px` side padding; set `Padding="0"`, `MinWidth="0"`, `MinHeight="0"` and an explicit `Width`/`Height` (e.g. 32×32), and always add `AutomationProperties.Name` (→ `aria-label`) and/or `ToolTipService.ToolTip` because there is no text.
- Height is content-driven: `height:auto`, `line-height:19px`, vertical padding `5/6` → ~**30px** for a text button. `Height` sets an exact height; `MinHeight` defaults to `0`, so the button can be made smaller than its content.
- String content is wrapped in `.win-button-default-text` (`white-space:nowrap` + ellipsis). Long text truncates — for wrapping, put a `<TextBlock TextWrapping="WrapWholeWords">` inside a `MaxWidth`-constrained Button (that is exactly what the Button gallery page demonstrates).
- `Click` is dispatched manually (not only via Vue `emit`), so `ClickMode="Press"`/`"Hover"` suppresses the native click; don't also bind `@click` to your own handler expecting the native event.
- Flyout opens on click in both forms: with the `Flyout` **prop** the Button calls `Flyout.ShowAt(buttonElement)`; with a `<Button.Flyout>` **child** the `Flyout` component attaches its own click listener to the button anchor (`provide('buttonFlyoutAnchor')`). Don't call `ShowAt` yourself from `@Click` — you would open it twice. Keyboard activation (`Space`/`Enter`) always goes through the Button's `ShowAt` path.
- Attributes you pass fall through to the `<button>` except the handled ones: `class`, `style`, `disabled`, `Click`, `GotFocus`, `ContextRequested` and all pointer/key events are consumed; `ToolTipService.ToolTip` → `tooltipservice.tooltip`, `AutomationProperties.Name` → `aria-label`.

**Minimal SFC**

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="8">
    <!-- default / accent / subtle -->
    <Button Content="Standard" @Click="onClick" />
    <Button Style="AccentButtonStyle" Content="Accent" @Click="onClick" />
    <Button Style="{StaticResource SubtleButtonStyle}" Content="Subtle" />

    <!-- icon-only square button (no Icon prop: the icon IS the content) -->
    <Button Width="32" Height="32" Padding="0" MinWidth="0" MinHeight="0"
            ToolTipService.ToolTip="Settings" AutomationProperties.Name="Settings"
            @Click="onClick">
      <FontIcon Glyph="&#xE713;" FontSize="16" />
    </Button>

    <!-- icon + text -->
    <Button @Click="onClick">
      <StackPanel Orientation="Horizontal" Spacing="8">
        <FontIcon Glyph="&#xE710;" FontSize="16" />
        <TextBlock Text="Add" />
      </StackPanel>
    </Button>
  </StackPanel>
</template>

<script setup>
import Button from '../../components/Button.vue'
import FontIcon from '../../components/FontIcon.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const onClick = (sender, args) => console.log('clicked', sender.Name, args.OriginalEvent)
</script>
```

---

## 2. ToggleButton

**Import:** `import ToggleButton from '../../components/ToggleButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `''` | Text or VNode content. |
| `ContentTemplate` | `unknown` | `undefined` | Template value. |
| `ContentTransitions` | `unknown` | `undefined` | Accepted, not rendered here. |
| `IsChecked` | `Boolean \| String` | `false` | `true` / `false` / `null` (or `'{x:Null}'`) for indeterminate. |
| `IsThreeState` | `Boolean \| String` | `false` | Adds the `null` step to the toggle cycle. |
| `IsEnabled` | `Boolean \| String` | `true` | ANDed with `Command.CanExecute`. |
| `RequestedTheme` | `String` | `'Default'` | Theme scope. |

Every other attribute (`Style`, `Padding`, `Width`, `Height`, `Margin`, `ToolTipService.ToolTip`, `AutomationProperties.Name`, `Command`, `CommandParameter`, `Flyout`, `Visibility`, …) is forwarded verbatim to the inner `Button`, so the whole Button prop set is available — including `Style="AccentButtonStyle"`.

Child component: `ToggleButton.Content` (`ToggleButton.vue` also exports `ContentTemplate`, `ContentTransitions`, `Resources`).

**v-model:** **not supported.** `defineEmits` is `['Click', 'Checked', 'Unchecked', 'Indeterminate']` — no `update:IsChecked`. The control keeps a local checked value and writes back through `updateXamlBinding` only. In Vue, drive it with `:IsChecked` and update your own state from `@Checked` / `@Unchecked` (or `v-model:IsChecked` **will not** stay in sync).

**Slots:** default = content.

**Events** (`(sender, args)`):

| Event | args | When |
| --- | --- | --- |
| `Checked` | `{ OriginalSource: sender, OriginalEvent, Handled }` | state → true (user click **and** when a bound `IsChecked` source changes) |
| `Unchecked` | same | state → false |
| `Indeterminate` | same | state → null (only when `IsThreeState`) |
| `Click` | `{ OriginalSource, OriginalEvent, Handled }` | after every toggle |

**Gotchas**

- Toggle cycle: `false → true → false`; with `IsThreeState`: `false → true → null → false`.
- Use `:IsChecked="null"` (or `IsChecked="{x:Null}"`) for the mixed state; a bound source that pushes `null` back down is preserved.
- Because `Checked`/`Unchecked` also fire for external model changes, guard against feedback loops when you mirror the value into `IsChecked`.
- Checked colours come from `--ToggleButton*` variables (accent-filled). `Style="AccentButtonStyle"` is forwarded but the checked/indeterminate palette wins once checked.
- No `IsTabStop`/`Visibility` special-casing of its own; they reach `Button` through attrs.

**Minimal SFC**

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="8">
    <ToggleButton :IsChecked="favorite" Content="Favorite"
                  @Checked="favorite = true" @Unchecked="favorite = false" />
    <ToggleButton :IsChecked="state" IsThreeState Content="Three state"
                  @Checked="state = true" @Unchecked="state = false"
                  @Indeterminate="state = null" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import StackPanel from '../../components/StackPanel.vue'
import ToggleButton from '../../components/ToggleButton.vue'

const favorite = ref(false)
const state = ref(null) // true | false | null
</script>
```

---

## 3. SplitButton

**Import:** `import SplitButton from '../../components/SplitButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `''` | Main (left) area content. |
| `Flyout` | `unknown` | `undefined` | Flyout VNode (or controller with `ShowAt`). Opens from the chevron button. |
| `ContentTemplate` | `unknown` | `undefined` | |
| `ContentTransitions` | `unknown` | `undefined` | |
| `Command` | `Object \| String` | `undefined` | Executed on primary click. |
| `CommandParameter` | `unknown` | `undefined` | |
| `IsEnabled` | `Boolean \| String` | `true` | ANDed with `Command.CanExecute`. |
| `IsTabStop` | `Boolean \| String` | `true` | Root gets `tabindex` 0 / -1. |
| `Background` | `String` | `''` | Only applied in the default (unchecked, idle) state. |
| `Foreground` | `String` | `''` | Idle state only. |
| `BorderBrush` | `String` | `''` | Idle state only. |
| `BorderThickness` | `String \| Number` | `1` | Declared but unused — the visible border is the layered 1px primary/secondary border. |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `String \| Number` | `''` | |
| `Padding` | `String \| Number` | `'11,6,11,7'` | Main-button padding. |
| `Margin` | `String \| Number` | `''` | |
| `HorizontalAlignment` | `String` | `'Left'` | |
| `VerticalAlignment` | `String` | `'Center'` | |
| `HorizontalContentAlignment` | `String` | `'Center'` | |
| `VerticalContentAlignment` | `String` | `'Center'` | |
| `FontFamily` | `String` | `'{ThemeResource ContentControlThemeFontFamily}'` | |
| `FontSize` | `String \| Number` | `14` | |
| `FontWeight` | `String` | `'Normal'` | |
| `CornerRadius` | `String \| Number` | `4` | |
| `UseSystemFocusVisuals` | `Boolean \| String` | `true` | |
| `FocusVisualMargin` | `String \| Number` | `-1` | |
| `Visibility` | `String` | `'Visible'` | |
| `RequestedTheme` | `String` | `'Default'` | |

Child components: `SplitButton.Flyout`, `SplitButton.Content`, plus `ContentTemplate`/`ContentTransitions`/`Resources`.

**v-model:** none.

**Slots:** default = main content; `<SplitButton.Flyout>` pulls a flyout out of the slot.

**Events:** `Click (sender, { OriginalSource: sender, OriginalEvent })` — fired by the **primary** half only. No `Handled` field.

**Gotchas**

- Geometry is fixed: grid columns `* (min 35) | 1px divider | 35px`; CSS `min-width:71px`. If your content is narrower than 71px the control stays 71px wide unless you override `MinWidth="0"` (the gallery does `MinWidth="0" MinHeight="0" Padding="0"` for a swatch button).
- The chevron button opens the flyout with placement `BottomEdgeAlignedLeft`; the flyout is **not** opened by the primary half.
- Keyboard: `Space`/`Enter` invoke the primary action on `keyup`; `F4` or `Alt+ArrowDown` open the flyout.
- There is a `toggleSplitButtonState` injection used by `ToggleSplitButton`; standalone `SplitButton` is always unchecked, so the checked palette never applies here.
- `BorderThickness` does not visually change the 1px composite border; use `BorderBrush` for colour.
- Flyout identity: `SplitButton.Flyout` vnode is cloned with `ref`/`onOpened`/`onClosed` hooks to track `IsFlyoutOpen`.

**Minimal SFC**

```vue
<template>
  <SplitButton Content="Choose color" @Click="onPrimaryClick">
    <SplitButton.Flyout>
      <Flyout Placement="Bottom">
        <StackPanel Spacing="4">
          <Button Content="Red" @Click="pick('Red')" />
          <Button Content="Green" @Click="pick('Green')" />
          <Button Content="Blue" @Click="pick('Blue')" />
        </StackPanel>
      </Flyout>
    </SplitButton.Flyout>
  </SplitButton>
</template>

<script setup>
import Button from '../../components/Button.vue'
import Flyout from '../../components/Flyout.vue'
import SplitButton from '../../components/SplitButton.vue'
import StackPanel from '../../components/StackPanel.vue'

const onPrimaryClick = (sender, args) => console.log('primary', args.OriginalEvent)
const pick = (color) => console.log('picked', color)
</script>
```

---

## 4. DropDownButton

**Import:** `import DropDownButton from '../../components/DropDownButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `undefined` | Label content (defaults to `Command.Label`). |
| `ContentTemplate` | `unknown` | `undefined` | |
| `ContentTransitions` | `unknown` | `undefined` | |
| `Flyout` | `unknown` | `null` | Flyout VNode, controller, or `{StaticResource Key}` resolved from page resources. |
| `Command` | `Object \| String` | `undefined` | |
| `CommandParameter` | `unknown` | `undefined` | |
| `IsEnabled` | `Boolean \| String` | `true` | ANDed with command. |
| `IsTabStop` | `Boolean \| String` | `true` | |
| `ClickMode` | `String` | `'Release'` | Forwarded to the inner Button. |
| `RequestedTheme` | `String` | `'Default'` | |
| `Visibility` | `String` | `'Visible'` | |
| `Background` | `String \| Object` | `''` | |
| `Foreground` | `String` | `''` | |
| `BorderBrush` | `String` | `''` | |
| `BackgroundSizing` | `String` | `'InnerBorderEdge'` | |
| `BorderThickness` | `String \| Number` | `1` | |
| `CornerRadius` | `String \| Number` | `4` | |
| `Padding` | `String \| Number` | `'11,5,11,6'` | |
| `Margin` | `String \| Number` | `0` | |
| `Width` `Height` `MaxWidth` `MaxHeight` | `String \| Number` | `''` | |
| `MinWidth` `MinHeight` | `String \| Number` | `0` | |
| `HorizontalAlignment` | `String` | `'Left'` | |
| `VerticalAlignment` | `String` | `'Center'` | |
| `HorizontalContentAlignment` | `String` | `'Center'` | |
| `VerticalContentAlignment` | `String` | `'Center'` | |
| `FontFamily` | `String` | `'{ThemeResource ContentControlThemeFontFamily}'` | |
| `FontSize` | `String \| Number` | `14` | |
| `FontWeight` | `String` | `'Normal'` | |
| `UseSystemFocusVisuals` | `Boolean \| String` | `true` | |
| `FocusVisualMargin` | `String \| Number` | `-3` | |

Child components: `DropDownButton.Content`, `DropDownButton.Flyout`, `DropDownButton.KeyboardAccelerators`, `Background`, `ContentTemplate`, `ContentTransitions`, `Resources`.

**v-model:** none.

**Slots:** default = content (rendered into the left grid cell, chevron is appended automatically).

**Events:** `Click`, `GotFocus`, `LostFocus`, `KeyDown`, `KeyUp`, `ContextRequested`, `PointerEntered/Exited/Moved/Pressed/Released/Canceled/CaptureLost` — all re-raised with `(sender, args)` where `args` is the Button's args object with `OriginalSource` replaced by the DropDownButton API. Pointer args still carry `Pointer` and `GetCurrentPoint`.

**Gotchas**

- The chevron is built in (`AnimatedIcon` 12×12 + `FontIconSource` fallback). Don't add your own glyph.
- Opens its flyout through the inner `Button.Flyout`; `aria-haspopup="menu"` and `aria-expanded` are set when a flyout exists.
- `Padding` is passed to the inner Button, but the content sits in a 2-column grid (`*` + `Auto`) so the chevron always stays at the right edge with `Margin="8,0,0,0"`.
- `Flyout="{StaticResource MyFlyout}"` is resolved from local `Resources`, then inherited page resources, then the runtime resource scope.
- Keyboard accelerators are honoured both through the `<DropDownButton.KeyboardAccelerators>` children and `Command.MatchesKeyboardEvent`.

**Minimal SFC**

```vue
<template>
  <DropDownButton Content="Email">
    <DropDownButton.Flyout>
      <MenuFlyout Placement="BottomEdgeAlignedLeft">
        <MenuFlyoutItem Text="Send" />
        <MenuFlyoutItem Text="Reply" />
      </MenuFlyout>
    </DropDownButton.Flyout>
  </DropDownButton>
</template>

<script setup>
import DropDownButton from '../../components/DropDownButton.vue'
import MenuFlyout from '../../components/MenuFlyout.vue'
import { MenuFlyoutItem } from '../../components/MenuFlyoutItems'
</script>
```

---

## 5. RepeatButton

**Import:** `import RepeatButton from '../../components/RepeatButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `''` | |
| `IsEnabled` | `Boolean \| String` | `true` | ANDed with command. |
| `ContentTemplate` | `unknown` | `undefined` | |
| `ContentTransitions` | `unknown` | `undefined` | |
| `RequestedTheme` | `String` | `'Default'` | |
| `Delay` | `Number \| String` | `500` | ms before the first repeat fires; must be ≥ 0 (setter throws `RangeError`). |
| `Interval` | `Number \| String` | `33` | ms between repeats; must be > 0. |
| `ClickMode` | `String` | `'Press'` | `'Press'` (default), `'Release'`, `'Hover'` (repeat while hovered). |

Other Button props (`Style`, `Width`, `Padding`, `Flyout`, …) reach the inner `Button` through attrs.

**v-model:** none.

**Slots:** default = content.

**Events:** `Click (sender, { OriginalSource: sender, OriginalEvent, Handled })` — fires once on activation and then repeatedly while held.

**Gotchas**

- Defaults differ from `Button`: `ClickMode` is **`'Press'`** and `Delay`/`Interval` exist only here.
- Repeat loop only continues while the inner button reports `IsPressed` (or while hovered with `ClickMode="Hover"`); releasing, cancelling, leaving the button, blur or `window` blur stops it.
- Touch hover does not schedule repeats; keyboard repeats start on `Space` keydown and stop on keyup.
- `Command`/`CommandParameter` are supported but `Command.Execute` is only called from the timer-driven path (not from the extra activation click), so a command may execute only once per press.
- `ClickMode="Hover"` repeats purely on hover and suppresses press/release behaviour.

**Minimal SFC**

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="8">
    <RepeatButton Content="Click and hold" Delay="400" Interval="50" @Click="onRepeat" />
    <TextBlock :Text="`Clicks: ${clicks}`" VerticalAlignment="Center" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import RepeatButton from '../../components/RepeatButton.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const clicks = ref(0)
const onRepeat = () => { clicks.value += 1 }
</script>
```

---

## 6. HyperlinkButton

**Import:** `import HyperlinkButton from '../../components/HyperlinkButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `unknown` | `''` | |
| `NavigateUri` | `String` | `''` | When set the root renders `<a href>`; when empty it renders `<button type="button">`. |
| `TargetName` | `String` | `''` | `target` for the anchor; empty → `_blank`. `rel="noopener noreferrer"` is added for `_blank`/empty. |
| `ContentTemplate` | `unknown` | `undefined` | |
| `ContentTransitions` | `unknown` | `undefined` | |
| `RequestedTheme` | `String` | `'Default'` | |
| `Command` | `Object \| String` | `undefined` | |
| `CommandParameter` | `unknown` | `undefined` | |
| `ClickMode` | `String` | `'Release'` | `'Release' \| 'Press' \| 'Hover'`. |
| `IsEnabled` | `Boolean \| String` | `true` | Does not remove `href`; sets `aria-disabled` + `disabled` only for the button form. |
| `IsTabStop` | `Boolean \| String` | `true` | |
| `Visibility` | `String` | `'Visible'` | |
| `Background` | `String` | `''` | → `--HyperlinkButtonBackground` |
| `BackgroundSizing` | `String` | `'OuterBorderEdge'` | |
| `Foreground` | `String` | `''` | → `--HyperlinkButtonForeground` (default accent). |
| `BorderBrush` | `String` | `''` | |
| `BorderThickness` | `String \| Number` | `1` | |
| `Width` `Height` `MinWidth` `MinHeight` `MaxWidth` `MaxHeight` | `String \| Number` | `''` | |
| `Margin` | `String \| Number` | `''` | |
| `Padding` | `String \| Number` | `'11,5,11,6'` | |
| `HorizontalAlignment` | `String` | `'Left'` | |
| `VerticalAlignment` | `String` | `'Center'` | |
| `HorizontalContentAlignment` | `String` | `'Left'` | |
| `VerticalContentAlignment` | `String` | `'Top'` | |
| `FontFamily` | `String` | `''` (→ `--ContentControlThemeFontFamily`) | |
| `FontSize` | `String \| Number` | `14` | |
| `FontWeight` | `String` | `'Normal'` | |
| `CornerRadius` | `String \| Number` | `4` | |
| `UseSystemFocusVisuals` | `Boolean \| String` | `true` | |
| `FocusVisualMargin` | `String \| Number` | `-3` | |

Child components: `HyperlinkButton.Content`, `ContentTemplate`, `ContentTransitions`, `Resources`. **No `Style` prop** (nothing style-class based is implemented).

**v-model:** none.

**Slots:** default = content.

**Events:** `Click (sender, { OriginalSource, OriginalEvent, Handled })`. Setting `args.Handled = true` calls `event.preventDefault()` — which cancels navigation for the anchor form.

**Gotchas**

- Navigation is real: with `NavigateUri` the browser follows the link. For SPA navigation intercept `@Click` and set `args.Handled = true` (the gallery instead uses a plain Click + no `NavigateUri` and calls its router).
- `IsEnabled="False"` on the anchor form keeps `href` but blocks the click and sets `aria-disabled`; the disabled look comes from the `disabled` class.
- Rendered colours: accent foreground by default, subtle filled background on hover. The `Background`/`Foreground` props only seed the CSS variables (`--HyperlinkButton*`).
- The default padding makes it look like a padded link; pass `Padding="0"` for an inline text link.
- No `Style`/`AccentButtonStyle` support here; use `Foreground`/`Background`.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <HyperlinkButton Content="Microsoft home page" NavigateUri="https://www.microsoft.com" />
    <HyperlinkButton Content="Go to ToggleButton" @Click="go" />
    <HyperlinkButton Content="Inline link" Padding="0" @Click="go" />
  </StackPanel>
</template>

<script setup>
import HyperlinkButton from '../../components/HyperlinkButton.vue'
import StackPanel from '../../components/StackPanel.vue'

const go = (sender, args) => {
  args.Handled = true // stop navigation if NavigateUri is present
  console.log('navigate', sender.Name)
}
</script>
```

---

## 7. AppBarButton

**Import:** `import AppBarButton from '../../components/AppBarButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Label` | `String` | `undefined` | Text label; falls back to `Command.Label`. |
| `Icon` | `unknown` | `undefined` | Symbol **name** string (`"Like"`), or an icon definition object (`{ Symbol }`, `{ Glyph }`, `{ UriSource }`, `{ Data }`), or a VNode from the `Icon` slot. Falls back to `Command.IconSource`. |
| `Content` | `unknown` | `undefined` | Replaces the icon area entirely (string or VNode). |
| `Command` | `unknown` | `undefined` | |
| `CommandParameter` | `unknown` | `undefined` | |
| `Flyout` | `unknown` | `undefined` | Opens on click; chevron is drawn. |
| `IsCompact` | `Boolean \| String` | `undefined` | `undefined` = inherit the CommandBar's compact state; `true` → 48px compact. |
| `LabelPosition` | `String` | `'Default'` | `'Default'` (→ Bottom unless the CommandBar says Right/Collapsed), `'Right'`, `'Collapsed'`. |
| `DynamicOverflowOrder` | `Number \| String` | `0` | Overflow ordering hint. |
| `IsEnabled` | `Boolean \| String` | `true` | Also disabled when the CommandBar is disabled, and ANDed with command. |
| `IsTabStop` | `Boolean \| String` | `true` | |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` unmounts the button (`v-if`). |
| `AllowFocusOnInteraction` | `Boolean \| String` | `undefined` | `undefined` → only in a flyout; `false` prevents focus on pointer down. |
| `AllowFocusWhenDisabled` | `Boolean \| String` | `false` | `Focus()` works while disabled. |
| `KeyboardAccelerators` | `unknown` | `undefined` | Array/handles; `<AppBarButton.KeyboardAccelerators>` also works. |
| `KeyboardAcceleratorTextOverride` | `String` | `''` | Replaces the computed accelerator text. |
| `KeyboardAcceleratorPlacementMode` | `String` | `'Hidden'` | Declared; display handled by CSS/the CommandBar. |
| `Background` | `unknown` | `undefined` | → `--AppBarButtonBackground` |
| `Foreground` | `unknown` | `undefined` | → `--AppBarButtonForeground` |
| `BorderBrush` | `unknown` | `undefined` | → `--AppBarButtonBorderBrush` |
| `BorderThickness` | `Number \| String` | `undefined` | → `--AppBarButtonBorderThickness` |
| `CornerRadius` | `Number \| String` | `undefined` | → `--AppBarButtonCornerRadius` (fallback `--ControlCornerRadius`, 4). |
| `Padding` | `Number \| String` | `undefined` | Declared but not applied — the template padding is CSS-driven (inner border inset). |
| `Margin` | `Number \| String` | `undefined` | |
| `Width` `Height` `MaxWidth` `MaxHeight` | `Number \| String` | `undefined` | |
| `MinWidth` `MinHeight` | `Number \| String` | `0` | |
| `FontFamily` | `String` | `undefined` | |
| `FontWeight` | `Number \| String` | `undefined` | `'Normal'` → 400. |
| `FontSize` | `Number \| String` | `undefined` | |
| `HorizontalAlignment` | `String` | `'Left'` | |
| `VerticalAlignment` | `String` | `'Top'` | |
| `HorizontalContentAlignment` | `String` | `'Center'` | |
| `VerticalContentAlignment` | `String` | `'Center'` | |
| `FlowDirection` | `String` | `'LeftToRight'` | `'RightToLeft'` → `direction:rtl`. |
| `Style` | `unknown` | `undefined` | **Declared but unused** — no style-class handling exists in this component. |
| `AutomationProperties.Name` | `String` | `''` | → `aria-label`. |
| `ToolTipService.ToolTip` | `unknown` | `undefined` | → `tooltipservice.tooltip`; defaults to the label in compact/collapsed/flyout states. |

Child components: `AppBarButton.Flyout`, `AppBarButton.Icon`, `AppBarButton.Content`, `AppBarButton.KeyboardAccelerators`.

**v-model:** none.

**Slots:** default slot is parsed: `<AppBarButton.Icon>` → icon, `<AppBarButton.Content>` → content, `<AppBarButton.Flyout>` → flyout, `<AppBarButton.KeyboardAccelerators>` → accelerators, everything else → content.

**Events:** `Click`, `PointerEntered/Exited/Pressed/Released/Moved/Canceled/CaptureLost`, `KeyDown`, `KeyUp`, `GotFocus`, `LostFocus`, all `(sender, args)` where `args = { OriginalSource: sender, Handled, OriginalEvent }`. Pointer args add `Pointer { PointerId, PointerDeviceType, IsInContact }` and `GetCurrentPoint(relativeTo?)` → `{ Position, PointerId, IsInContact, Properties: { IsLeftButtonPressed, IsRightButtonPressed } }`. Keyboard args add `Key` (`'Space'` for space), `OriginalKey`, `KeyStatus { IsKeyReleased, RepeatCount }`.

**Gotchas**

- Designed to live inside `<CommandBar>` / `<CommandBar.PrimaryCommands>`; that is where `IsCompact`, `LabelPosition="Default"` and the overflow behaviour come from. Standalone it renders **68px wide, 64px tall** (CSS `width:68px`, content min-height `var(--AppBarThemeMinHeight, 64px)`).
- Icon has two forms: `Icon="Like"` (symbol name → `SymbolIcon` with 20px default) or an element in `<AppBarButton.Icon>` (`FontIcon`, `BitmapIcon`, `PathIcon`, or a `Viewbox` wrapper). `<AppBarButton.Content>` wins over the icon.
- Icon-only: `LabelPosition="Collapsed"` (or `IsCompact`, which also shrinks to 48px). `Label` is still used for the tooltip/aria-label — keep it.
- `Style` is dead weight here; use `Background`/`Foreground`/`BorderBrush` or CSS variables.
- In overflow (`IsInOverflow`), the button is restyled as a menu row and gets `role="menuitem"`; you cannot opt out.
- The check glyph (`\uE73E`) is rendered by `AppBarToggleButton`'s context, not by `AppBarButton` itself.

**Minimal SFC**

```vue
<template>
  <CommandBar DefaultLabelPosition="Bottom">
    <CommandBar.PrimaryCommands>
      <AppBarButton Icon="Like" Label="Like" @Click="onClick" />
      <AppBarButton Label="Edit" @Click="onClick">
        <AppBarButton.Icon><FontIcon Glyph="&#xE70F;" /></AppBarButton.Icon>
      </AppBarButton>
      <AppBarButton Icon="Save" Label="Save" LabelPosition="Collapsed" @Click="onClick" />
      <AppBarSeparator />
      <AppBarButton Icon="Delete" Label="Delete" IsEnabled="False" />
    </CommandBar.PrimaryCommands>
  </CommandBar>
</template>

<script setup>
import AppBarButton from '../../components/AppBarButton.vue'
import AppBarSeparator from '../../components/AppBarSeparator.vue'
import CommandBar from '../../components/CommandBar.vue'
import FontIcon from '../../components/FontIcon.vue'

const onClick = (sender, args) => console.log('appbar click', sender.Name, args.OriginalEvent)
</script>
```

---

## 8. AppBarToggleButton

**Import:** `import AppBarToggleButton from '../../components/AppBarToggleButton.vue'`

Declared props (everything else is forwarded to `AppBarButton` through attrs):

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsChecked` | `Boolean \| String` | `false` | `true` / `false` / `null` (mixed). |
| `IsThreeState` | `Boolean \| String` | `false` | Enables the mixed step. |

Forwarded (props of `AppBarButton`, accepted as attributes here): `Label`, `Icon`, `Content`, `Command`, `CommandParameter`, `IsCompact`, `LabelPosition`, `DynamicOverflowOrder`, `IsEnabled`, `IsTabStop`, `Visibility`, `AllowFocusOnInteraction`, `AllowFocusWhenDisabled`, `KeyboardAccelerators`, `KeyboardAcceleratorTextOverride`, `KeyboardAcceleratorPlacementMode`, `Background`, `Foreground`, `BorderBrush`, `BorderThickness`, `CornerRadius`, `Padding`, `Margin`, `Width`, `Height`, `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight`, `FontFamily`, `FontWeight`, `FontSize`, `HorizontalAlignment`, `VerticalAlignment`, `HorizontalContentAlignment`, `VerticalContentAlignment`, `FlowDirection`, `Style`, `AutomationProperties.Name`, `ToolTipService.ToolTip`.

Child components: `AppBarToggleButton.Icon`, `AppBarToggleButton.Content`, `AppBarToggleButton.KeyboardAccelerators`. (No `Flyout` child export — pass `Flyout` as an attribute/prop.)

**v-model:** `v-model:IsChecked` works (emits `update:IsChecked`). `v-model:IsThreeState` also emits `update:IsThreeState`.

**Slots:** default slot, same parsing rules as `AppBarButton` (`.Icon` / `.Content` pulled out).

**Events:**

| Event | args |
| --- | --- |
| `Click` | `(sender, args)` — the `AppBarButton` args object (`{ OriginalSource, Handled, OriginalEvent }`). |
| `Checked` / `Unchecked` / `Indeterminate` | `(sender, { OriginalSource: sender, Handled: false, OriginalEvent })`. |

**Gotchas**

- The visible check mark is injected by `AppBarButton` when it detects the toggle context (`&#xE73E;` before the icon, extra padding).
- Cycle: `false → true → false`; with `IsThreeState`: `true → null → false → true` (note the order differs from `CheckBox`/`ToggleButton`: from `true` it goes to `null`).
- `IsChecked` is mirrored both into a local ref and through the XAML binding; a bound source that pushes `null` is preserved.
- `IsThreeState` is a local computed with its own override ref, so it can be flipped at runtime; the setter writes the binding and emits `update:IsThreeState`.
- All CommandBar/overflow behaviour is inherited from `AppBarButton` (standalone: 68×64, `role` only inside a CommandBar).

**Minimal SFC**

```vue
<template>
  <CommandBar DefaultLabelPosition="Bottom">
    <CommandBar.PrimaryCommands>
      <AppBarToggleButton Label="Shuffle" Icon="Shuffle" v-model:IsChecked="shuffle" />
      <AppBarToggleButton Label="Three state" Icon="Flag" IsThreeState v-model:IsChecked="flag" />
    </CommandBar.PrimaryCommands>
  </CommandBar>
  <TextBlock :Text="`shuffle=${shuffle} flag=${flag}`" />
</template>

<script setup>
import { ref } from 'vue'
import AppBarToggleButton from '../../components/AppBarToggleButton.vue'
import CommandBar from '../../components/CommandBar.vue'
import TextBlock from '../../components/TextBlock.vue'

const shuffle = ref(false)
const flag = ref(null) // true | false | null
</script>
```

---

## 9. AppBarSeparator

**Import:** `import AppBarSeparator from '../../components/AppBarSeparator.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsCompact` | `Boolean \| String` | `undefined` | `undefined` → inherit the CommandBar compact state; `true` → fixed 48px tall. |
| `DynamicOverflowOrder` | `Number \| String` | `0` | Overflow order hint. |
| `IsTabStop` | `Boolean \| String` | `false` | `tabindex` 0 / omitted. |
| `Visibility` | `String` | `'Visible'` | `'Collapsed'` removes the element. |
| `IsEnabled` | `Boolean \| String` | `true` | Declared; no visual/interaction effect observed. |
| `Foreground` | `unknown` | `undefined` | Line colour → `--AppBarSeparatorForeground`. |
| `Padding` | `String \| Number` | `undefined` | Line margin → `--AppBarSeparatorPadding` (default `8px 2px`). |
| `Margin` | `String \| Number` | `undefined` | |
| `Width` `Height` `MaxWidth` `MaxHeight` | `String \| Number` | `undefined` | |
| `MinWidth` `MinHeight` | `String \| Number` | `0` | |
| `HorizontalAlignment` | `String` | `'Stretch'` | |
| `VerticalAlignment` | `String` | `'Stretch'` | |

**v-model:** none.

**Slots:** none (the line is rendered by an internal `<span>`).

**Events:** none. It only declares `update:*` emits for its own props (dependency-property parity); there is no `Click`.

**Gotchas**

- Purpose-built for `<CommandBar.PrimaryCommands>` / `SecondaryCommands`. Standalone it is a 5px-wide vertical line, stretched to the height of its container (`align-self: stretch`); inside a plain block with no height it can collapse to a hairline.
- In the CommandBar overflow it flips to a horizontal 1px rule (`is-overflow`, height 9px).
- `IsCompact` only matters when no CommandBar context is present; the gallery relies on `CommandBar`'s compact mode.
- It is decorative: `role="separator"`, no label, not disabled by CommandBar state.

**Minimal SFC**

```vue
<template>
  <CommandBar DefaultLabelPosition="Collapsed">
    <CommandBar.PrimaryCommands>
      <AppBarButton Icon="AttachCamera" Label="Attach camera" />
      <AppBarSeparator />
      <AppBarButton Icon="Like" Label="Like" />
      <AppBarButton Icon="Dislike" Label="Dislike" />
    </CommandBar.PrimaryCommands>
  </CommandBar>
</template>

<script setup>
import AppBarButton from '../../components/AppBarButton.vue'
import AppBarSeparator from '../../components/AppBarSeparator.vue'
import CommandBar from '../../components/CommandBar.vue'
</script>
```

---

## 10. CheckBox

**Import:** `import CheckBox from '../../components/CheckBox.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `String \| Number` | `''` | Text label. VNodes are **not** supported here — use the default slot. |
| `IsChecked` | `Boolean \| String \| null` | `undefined` | `true` / `false` / `null` (mixed, only meaningful with `IsThreeState`). |
| `IsThreeState` | `Boolean \| String` | `undefined` | Enables the mixed state. |
| `IsEnabled` | `Boolean \| String` | `true` | |
| `IsTabStop` | `Boolean \| String` | `true` | `false` → `tabindex="-1"`. |
| `Margin` | `String` | `''` | XAML thickness. |

No `Width`/`Height`/`Padding`/`Foreground` props: use `class`/`style` (both reach the root `<div>`), or wrap it.

**v-model:** `v-model:IsChecked` — the component emits `update:IsChecked` with `true \| false \| null`. Plain `v-model` does **not** work (no `modelValue` prop and no `update:modelValue` emit).

**Slots:** default slot = label content (rendered inside `.checkbox-content`, falling back to the `Content` prop).

**Events** (`(sender, args)` where `sender` = `{ IsChecked (get/set), IsEnabled, Content, Element }`):

| Event | args |
| --- | --- |
| `Checked` / `Unchecked` / `Indeterminate` | `{ OriginalSource: sender, OriginalEvent: MouseEvent \| KeyboardEvent, Handled: false }` |
| `Click` | `{ OriginalEvent, Handled: false }` (**no** `OriginalSource`) — fired after the state change on every activation. |

**Gotchas**

- Tri-state cycle: `false → true → null → false`. `IsChecked = null` **without** `IsThreeState` renders as unchecked and `aria-checked="false"` (the component requires `IsThreeState === true` for the mixed visual).
- `Checked`/`Unchecked`/`Indeterminate` fire only from user interaction (mouse/`Space`), not when a bound prop changes.
- `IsThreeState` is compared strictly to `true`, so pass a real boolean (`:IsThreeState="true"`, `IsThreeState="True"` or a bare `IsThreeState` all resolve to `true`; `"true"` lowercase would not).
- Geometry is fixed: 20px box + 8px gap + 20px line-height, `min-height:32px`, `width:fit-content`. The check mark is an `AnimatedIcon` (`AnimatedAcceptVisualSource` + `FontIconSource` fallback).
- The root is a `<div role="checkbox">`, not an `<input>` — form participation is manual.
- `IsEnabled="False"` sets `pointer-events:none` and dims label + box.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <CheckBox v-model:IsChecked="twoState">Two-state</CheckBox>

    <CheckBox v-model:IsChecked="threeState" IsThreeState
              @Checked="last = 'checked'"
              @Unchecked="last = 'unchecked'"
              @Indeterminate="last = 'indeterminate'">
      Three-state
    </CheckBox>

    <CheckBox :IsChecked="true" IsEnabled="False">Disabled, checked</CheckBox>
    <TextBlock :Text="`two=${twoState} three=${threeState} last=${last}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import CheckBox from '../../components/CheckBox.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const twoState = ref(false)
const threeState = ref(null) // true | false | null
const last = ref('')
</script>
```

---

## 11. RadioButton

**Import:** `import RadioButton from '../../components/RadioButton.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Content` | `String \| Number` | `''` | Label text (VNodes → use the slot). |
| `IsChecked` | `Boolean \| String` | `undefined` | Checked state (also the initial seed inside a group). |
| `IsEnabled` | `Boolean \| String` | `true` | Also ANDed with the parent group's `IsEnabled`. |
| `GroupName` | `String` | `''` | Named group; siblings with the same name are mutually exclusive (tracked app-wide). |
| `Tag` | `String \| Number \| Boolean \| Object` | `undefined` | Arbitrary payload, readable as `sender.Tag`. |
| `name` | `String` | `''` | Lowercase alias for `GroupName`. |
| `Header` | `String` | `''` | **Group mode trigger**: renders a header above the items. |
| `ItemsSource` | `Array \| String` | `() => []` | **Group mode trigger**: item list (strings or objects). |
| `SelectedIndex` | `Number \| String` | `undefined` | **Group mode trigger** + selection. |
| `SelectedItem` | `unknown` | `undefined` | **Group mode trigger** + selection. |
| `MaxColumns` | `Number \| String` | `1` | Group mode column count. |
| `Margin` | `String` | `''` | |
| `value` | `any` | `undefined` | Enables the `v-model` + `value` radio pattern. |
| `modelValue` | `any` | `undefined` | Model for the `v-model` + `value` pattern. |

**v-model:**
- `v-model:IsChecked` — emits `update:IsChecked` (`Boolean`; never `null` here).
- `v-model` + `value` — classic radio pattern; emits `update:modelValue` with `props.value` when this button becomes checked.
- Group mode: `v-model:SelectedIndex` / `v-model:SelectedItem` (emits `update:SelectedIndex` / `update:SelectedItem`).

**Slots:** default = label content; in group mode the default slot supplies the child `RadioButton`s (rendered only when `ItemsSource` is empty).

**Events:**

| Event | args |
| --- | --- |
| `Checked` / `Unchecked` | `(sender, { OriginalSource: sender, RoutedEvent: 'Checked' \| 'Unchecked' })` |
| `SelectionChanged` | **group mode only**, emitted as a *single* argument: `{ SelectedIndex, SelectedItem, AddedItems, RemovedItems }` (no sender). |
| `update:IsChecked` | `Boolean` |
| `update:modelValue` | `props.value` (only in the `value`/`modelValue` pattern) |

**Gotchas**

- **`RadioButton` switches into a group container** when *any* of `Header`, `ItemsSource`, `SelectedIndex`, `SelectedItem` is present. In that mode it renders `.win-radio-buttons` with its own header and item grid and ignores its own `Content`.
- Standalone grouping uses `GroupName`: the group registry lives in a `WeakMap` keyed by the Vue app, and a button with `true` unchecks its siblings. Without a `GroupName`, a per-parent auto name is used.
- Inside `<RadioButtons>` (or a group-mode `RadioButton`) the group owns the selection: a declarative `IsChecked="True"` only seeds the initial index and will not pin the item after another is chosen.
- Roving tabindex + arrow-key navigation are handled by the group; direction keys do not wrap (WinUI behaviour).
- Only `Checked`/`Unchecked` are raised when the checked state flips — no `Click` event exists on this control.
- `IsChecked` is exposed as a getter/setter on the sender, so `sender.IsChecked = false` works in a handler.
- The visual is a `<label>` + visually hidden native `<input type="radio">` (1×1px, opacity 0); the round glyph is CSS.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <!-- plain group: same GroupName, one seeded checked -->
    <RadioButton Content="Option 1" GroupName="demo" IsChecked="True" @Checked="picked = 1" />
    <RadioButton Content="Option 2" GroupName="demo" @Checked="picked = 2" />
    <RadioButton Content="Option 3" GroupName="demo" IsEnabled="False" />

    <!-- group mode: Header/SelectedIndex turn this RadioButton into a container -->
    <RadioButton Header="Options:" v-model:SelectedIndex="index" @SelectionChanged="onSelection">
      <RadioButton Content="Green" />
      <RadioButton Content="Yellow" />
      <RadioButton Content="White" />
    </RadioButton>

    <TextBlock :Text="`picked=${picked} index=${index}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import RadioButton from '../../components/RadioButton.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const picked = ref(0)
const index = ref(0)
const onSelection = ({ SelectedIndex }) => { index.value = SelectedIndex }
</script>
```

---

## 12. RadioButtons

**Import:** `import RadioButtons from '../../components/RadioButtons.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Header` | `String \| Number` | `''` | Header text above the items (rendered with `TextBlock`). |
| `ItemsSource` | `Array \| String` | `() => []` | Strings or objects. Strings are localized (see gotchas); a non-array falls back to inline `<x:String>` children. |
| `SelectedIndex` | `Number \| String` | `undefined` | Selected index; `-1` = nothing. |
| `SelectedItem` | `unknown` | `undefined` | Selected item (alternative to the index). |
| `MaxColumns` | `Number \| String` | `1` | Grid columns; `1` = single column, `>1` = `repeat(n, max-content)` filling row-wise. |
| `IsEnabled` | `Boolean \| String` | `true` | Disables all items. |
| `Margin` | `String` | `''` | |
| `DisplayMemberPath` | `String \| Number` | `''` | Dotted path used as item text for object items. |

**v-model:** `v-model:SelectedIndex` and `v-model:SelectedItem` (both emits exist). Selection is also mirrored through the XAML binding.

**Slots:** default = inline items; either `<RadioButton>` children or `<x:String>` values (import `XamlString` from `components/inlineControlProperties` and register it as `'x:String'`, as `SliderPage.vue` does). The slot renders only when `ItemsSource` resolves to nothing.

**Events:**

| Event | args |
| --- | --- |
| `SelectionChanged` | `(sender, { SelectedIndex, SelectedItem, AddedItems, RemovedItems })` — `sender` has `SelectedIndex` / `SelectedItem` / `Header` / `IsEnabled` getters, so destructuring the *first* argument works too. |
| `update:SelectedIndex` | `Number` |
| `update:SelectedItem` | item value |

**Gotchas**

- **String items are translated**: `normalizedItems` maps `Blue/Green/Red/Yellow/White/Black/StepValues/Ticks` through i18n. Custom string items pass through unchanged but are still run through the same function.
- `SelectionChanged` also fires **on mount** when the initial `SelectedIndex >= 0` (with `RemovedItems: []`), which is how the gallery seeds its swatches.
- Item objects read their label from `DisplayMemberPath`, else `Text` → `Content` → `label` → `Name` → `Value`; the selected item is `item.Value ?? item`.
- `SelectedIndex` is clamped to `-1` when out of range; disabled items cannot be selected by the user.
- The group is an implicit `.win-radio-buttons` wrapper; the `Header` is a `TextBlock`, items sit in a CSS grid (`column-gap:7px`, `row-gap:8px`).
- `MaxColumns` counts **columns**, not rows — item order flows across, then down.
- No `Click` event; the inner `RadioButton`s' own events do not bubble through `RadioButtons`.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <!-- object items + DisplayMemberPath -->
    <RadioButtons Header="Background" :ItemsSource="colors" DisplayMemberPath="Name"
                  :MaxColumns="3" v-model:SelectedIndex="backgroundIndex" />

    <!-- inline x:String items -->
    <RadioButtons Header="Border" :MaxColumns="3" :SelectedIndex="1"
                  @SelectionChanged="onSelection">
      <x:String>Green</x:String>
      <x:String>Yellow</x:String>
      <x:String>White</x:String>
    </RadioButtons>

    <TextBlock :Text="`background=${backgroundIndex} border=${border}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import { XamlString } from '../../components/inlineControlProperties'
import RadioButtons from '../../components/RadioButtons.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

defineOptions({ components: { 'x:String': XamlString } })

const colors = [
  { Name: 'Green', Value: '#008000' },
  { Name: 'Yellow', Value: '#FFFF00' },
  { Name: 'White', Value: '#FFFFFF' }
]
const backgroundIndex = ref(0)
const border = ref(0)
const onSelection = ({ SelectedIndex }) => { border.value = SelectedIndex }
</script>
```

---

## 13. ToggleSwitch

**Import:** `import ToggleSwitch from '../../components/ToggleSwitch.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `IsOn` | `Boolean \| String` | `undefined` | On/off state (undefined behaves as off). |
| `Header` | `String \| Number` | `''` | Text above the switch. |
| `OnContent` | `String \| Number` | `''` | Label shown while **on** (defaults to the localized "On"). |
| `OffContent` | `String \| Number` | `''` | Label shown while **off** (defaults to the localized "Off"). |
| `IsEnabled` | `Boolean \| String` | `true` | |
| `FlowDirection` | `String` | `''` | `'RightToLeft'` swaps the arrow-key meaning. |
| `Width` | `String \| Number` | `''` | Root width. |
| `MinWidth` | `String \| Number` | `''` | Root min-width (CSS default `154px`). |
| `Margin` | `String \| Number` | `''` | |
| `modelValue` | `Boolean` | `undefined` | Vue `v-model` alias for `IsOn`. |
| `onContent` | `String` | `''` | Lowercase alias, used only when `OnContent` is empty. |
| `offContent` | `String` | `''` | Lowercase alias, used only when `OffContent` is empty. |
| `disabled` | `Boolean` | `false` | Additional disable switch. |

**v-model:** `v-model` (emits `update:modelValue`) **and** `v-model:IsOn` (emits `update:IsOn`) — both are emitted on every toggle, so either works.

**Slots:** default slot = label text; it replaces `OnContent`/`OffContent` entirely (the label is not switched when a slot is used).

**Events:**

| Event | args |
| --- | --- |
| `Toggled` | **single argument**: `{ IsOn: Boolean }` — no sender. |

**Gotchas**

- `OnContent`/`OffContent` render as a label *next to* the 40×20 switch, not inside it; the default localized strings are "On"/"Off" when both the props and aliases are empty.
- Only `Width`, `MinWidth` and `Margin` are layout props. `Visibility`, `Height`, `MaxWidth`, `HorizontalAlignment` are **not** props — use `v-if`/style/class.
- The row is `min-height:40px`, the root `min-width:154px`; the label column has `min-width:20px`.
- Toggling is supported by click, drag (20px travel, 3px movement threshold) and keyboard: `Space` toggles, `ArrowUp`/`ArrowRight`/`End` turn on, `ArrowDown`/`ArrowLeft` turn off. `Home` is swallowed but does nothing.
- `Toggled` is the only change notification; it is also fired for the label click and the keyboard path.
- `disabled` (lowercase) complements `IsEnabled="False"`.
- The header is linked with `aria-labelledby`; when there is no header the current On/Off text becomes the `aria-label`.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <ToggleSwitch />
    <ToggleSwitch Header="Work" OffContent="Do work" OnContent="Working"
                  v-model:IsOn="working" @Toggled="onToggled" />
    <ToggleSwitch Header="Disabled" :IsOn="true" :disabled="true" />
    <TextBlock :Text="`working=${working} last=${last}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'

const working = ref(true)
const last = ref(null)
const onToggled = ({ IsOn }) => { last.value = IsOn }
</script>
```

---

## 14. Slider

**Import:** `import Slider from '../../components/Slider.vue'`

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Value` | `Number \| String` | `0` | Current value (clamped to `[Minimum, Maximum]`). |
| `Minimum` | `Number \| String` | `0` | |
| `Maximum` | `Number \| String` | `100` | Raised to `Minimum` if smaller. |
| `SmallChange` | `Number \| String` | `1` | Keyboard step (when `SnapsTo='StepValues'`). |
| `LargeChange` | `Number \| String` | `10` | **Declared but unused** in this implementation. |
| `StepFrequency` | `Number \| String` | `1` | Snap granularity for pointer/keyboard. |
| `Header` | `String \| Number \| Object` | `''` | Header text, component or VNode; `<Slider.Header>` also works. |
| `Orientation` | `String` | `'Horizontal'` | `'Horizontal'` \| `'Vertical'`. |
| `IsDirectionReversed` | `Boolean \| String` | `false` | Reverse the value direction. |
| `TickFrequency` | `Number \| String` | `0` | Distance between ticks; `0` = no ticks. |
| `TickPlacement` | `String` | `'None'` | `'None'` \| `'Outside'` \| `'TopLeft'` \| `'BottomRight'` \| `'Inline'`. |
| `SnapsTo` | `String` | `'StepValues'` | `'StepValues'` (use `StepFrequency`) \| `'Ticks'` (use `TickFrequency`). |
| `IsEnabled` | `Boolean \| String` | `true` | |
| `IsThumbToolTipEnabled` | `Boolean \| String` | `true` | Value tooltip on the thumb. |
| `ThumbToolTipValueConverter` | `String \| Function \| Object` | `null` | Converter for the tooltip text (`{StaticResource ...}` or a function/`{ Convert }` object). |
| `Width` `Height` `MaxWidth` `MaxHeight` | `String \| Number` | `''` | Vertical defaults to `32px` wide × `100px` tall when unset. |
| `MinWidth` `MinHeight` | `String \| Number` | `0` | |
| `Margin` | `String \| Number` | `0` | |
| `Padding` | `String \| Number` | `0` | Applied to the inner layout grid. |
| `CornerRadius` | `String \| Number` | `'{ThemeResource SliderTrackCornerRadius}'` | Track radius (theme default 2px). |
| `Background` | `String \| Object` | `'{ThemeResource SliderTrackFill}'` | Track colour. |
| `Foreground` | `String \| Object` | `'{ThemeResource SliderTrackValueFill}'` | Filled part colour. |
| `HorizontalAlignment` | `String` | `'Stretch'` | |
| `VerticalAlignment` | `String` | `'Stretch'` | |
| `FlowDirection` | `String` | `''` | `'RightToLeft'` flips the pointer mapping. |
| `RequestedTheme` | `String` | `'Default'` | |
| `Visibility` | `String` | `'Visible'` | |
| `IsHitTestVisible` | `Boolean \| String` | `true` | `false` → `pointer-events:none`. |
| `IsTabStop` | `Boolean \| String` | `true` | |
| `TabIndex` | `Number \| String` | `0` | |
| `IsFocusEngagementEnabled` | `Boolean \| String` | `true` | Accepted; no behaviour found in the implementation. |

**v-model:** `v-model:Value` (emits `update:Value`). Plain `v-model` is **not** wired (no `modelValue`).

**Slots:** default is scanned for a `<Slider.Header>` child (`Slider.Header` component exported from `Slider.vue`); other children are ignored.

**Events:**

| Event | args |
| --- | --- |
| `ValueChanged` | `(sender, { OldValue, NewValue })` — emitted only when the value actually changes. `sender` is the component proxy (`instance.exposeProxy ?? proxy`). |
| `update:Value` | number |

**Gotchas**

- Tick props in one place: `TickFrequency` (spacing), `TickPlacement` (`None`/`Outside`/`TopLeft`/`BottomRight`/`Inline`), `SnapsTo` (`StepValues`/`Ticks`), `StepFrequency`, `SmallChange`. `LargeChange` exists but nothing reads it.
- Ticks are drawn only when `TickFrequency > 0`; `'Outside'` draws both a top/left and a bottom/right bar. Ticks closer than **20px** are skipped (`minTickGap`) and the count is capped at 1000 — with a short slider a small `TickFrequency` silently thins the ticks.
- `SnapsTo='Ticks'` uses `TickFrequency` for keyboard steps too, so a `Ticks` snap with `TickFrequency=0` effectively disables stepping.
- Snapping uses **absolute multiples** of the frequency (`closestStep`), not `Minimum + n*Step`: with `Minimum="5"` and `StepFrequency="10"` the reachable values are 10, 20, 30… (plus the clamped 5 at the low end), not 5, 15, 25.
- Pointer down anywhere on the track jumps the value (and starts a drag); the thumb uses an 18px hit target with a 22px outer ring.
- Vertical sliders with no explicit size get `width:32px; height:100px`; horizontal ones need a width (gallery uses `Width="200"`).
- The tooltip content is numeric with decimals derived from `StepFrequency` (up to 4 places), unless `ThumbToolTipValueConverter` is supplied.
- Keyboard: `Home`/`End` jump to min/max, arrows step by `SmallChange` (or `TickFrequency` when `SnapsTo='Ticks'`); `Alt/Ctrl/Meta` modified keys are ignored.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <Slider Width="200" Header="Simple" v-model:Value="value" @ValueChanged="onValueChanged" />

    <Slider Width="300" Header="Range + ticks" Minimum="500" Maximum="1000"
            StepFrequency="10" SmallChange="10" TickFrequency="50" TickPlacement="Outside"
            SnapsTo="StepValues" v-model:Value="ranged" />

    <Slider Width="100" Height="100" Orientation="Vertical" Minimum="-50" Maximum="50"
            TickFrequency="10" TickPlacement="Outside" v-model:Value="vertical" />

    <TextBlock :Text="`${value} / ${ranged} / ${vertical}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import Slider from '../../components/Slider.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const value = ref(0)
const ranged = ref(800)
const vertical = ref(0)
const onValueChanged = (sender, { OldValue, NewValue }) => console.log(oldValue, '→', NewValue)
</script>
```

---

## 15. Rating (imported as `RatingControl` by the gallery)

**Import:** `import RatingControl from '../../components/Rating.vue'` — the file is `Rating.vue` and the component has no `name`, so the local import name is free; the gallery demo (`RatingPage.vue`) imports it as `RatingControl`, while `RatingControlPage.vue` imports it as `Rating`.

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Value` | `Number \| String` | `-1` | Current rating; `-1` = unset. |
| `MaxRating` | `Number \| String` | `5` | Number of stars (integer ≥ 1). |
| `PlaceholderValue` | `Number \| String` | `-1` | Preview value shown when nothing is set. |
| `Caption` | `String` | `''` | Caption text to the right of the stars. |
| `InitialSetValue` | `Number \| String` | `1` | Value used for the first keyboard increment from unset. |
| `IsClearEnabled` | `Boolean \| String` | `true` | Clicking the current rating clears it back to unset. |
| `IsReadOnly` | `Boolean \| String` | `false` | Disables pointer/keyboard changes (still focusable). |
| `IsEnabled` | `Boolean \| String` | `true` | Fully disabled (also `pointer-events:none`). |
| `Width` | `String \| Number` | `''` | Root width. |
| `modelValue` | `Number` | `undefined` | Vue `v-model` alias for `Value`. |
| `max` | `Number` | `undefined` | Alias that overrides `MaxRating` when provided. |
| `disabled` | `Boolean` | `false` | Alias that disables the control. |

**v-model:** `v-model` (emits `update:modelValue`) and `v-model:Value` (emits `update:Value`). Clearing emits `-1`.

**Slots:** none. `Caption` is plain text.

**Events:**

| Event | args |
| --- | --- |
| `ValueChanged` | `(sender, { OldValue, NewValue })` — `sender` is the exposed public API (`Value`, `Caption`, `PlaceholderValue`, `IsReadOnly`, `IsClearEnabled`, `IsEnabled`, `Element`). |
| `update:Value` / `update:modelValue` | number (`-1` when cleared) |

**Gotchas**

- **`0` is coerced up to `1`** (`coerceRatingValue`): values `< 0` → `-1`, `0 ≤ v ≤ 1` → `1`, `> max` → `max`. To show "no rating" pass `-1`/omit the value, not `0`.
- Clicking the **star that is already selected** clears the rating to `-1` when `IsClearEnabled` (default); with `IsClearEnabled="False"` that click is a no-op. A click that resolves to 0 stars (left edge) gives `1` when clearing is disabled, otherwise `-1`.
- Hover previews the rating (including placeholder/unset tint) and is cancelled by `IsReadOnly`.
- `Caption` is reactive: assigning `sender.Caption` in `ValueChanged` updates the render (the gallery does exactly that).
- No half-star support in the UI: values are whole stars, though `PlaceholderValue` may be fractional and displays partially via `clip-path`.
- Fixed metrics: 32px row height, 16px stars, 8px spacing, caption 12px/16px.
- `aria` contract: `role="slider"`, `aria-valuemin=0`, `aria-valuemax=MaxRating`, `aria-valuenow=Value` (0 when unset), `aria-readonly`.
- Keyboard: arrows ±1, `Home` clears (→ `-1`), `End` = `MaxRating`.

**Minimal SFC**

```vue
<template>
  <StackPanel>
    <RatingControl v-model="rating" Caption="Your rating" @ValueChanged="onChanged" />
    <RatingControl v-model="rating10" :max="10" />
    <RatingControl :Value="3" IsReadOnly Caption="Read only" />
    <RatingControl :Value="-1" PlaceholderValue="4" Caption="Placeholder 4" />
    <TextBlock :Text="`rating=${rating} of 10=${rating10}`" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import RatingControl from '../../components/Rating.vue'
import StackPanel from '../../components/StackPanel.vue'
import TextBlock from '../../components/TextBlock.vue'

const rating = ref(-1)   // -1 = no rating yet (0 would clamp to 1)
const rating10 = ref(0)
const onChanged = (sender, { OldValue, NewValue }) => console.log(oldValue, '→', NewValue)
</script>
```

---

## 16. ColorPicker

**Import:** `import ColorPicker from '../../components/ColorPicker.vue'`

Props (capital XAML names first, lowercase aliases after):

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Color` | `String \| Object` | `undefined` | Current colour as a hex string (`#RGB`, `#RRGGBB`, `#RRGGBBAA`); falls back to `modelValue`, then `'#0067C0'`. |
| `ColorSpectrumShape` | `String \| Number` | `undefined` | `'Box'` (default) \| `'Ring'`. |
| `IsMoreButtonVisible` | `Boolean \| String` | `false` | Collapses the details panel behind a "More" button. |
| `IsColorPreviewVisible` | `Boolean \| String` | `undefined` | Shows the current/previous swatch column (fallback `true`). |
| `IsColorSliderVisible` | `Boolean \| String` | `undefined` | Shows the value slider (fallback `true`). |
| `IsColorChannelTextInputVisible` | `Boolean \| String` | `undefined` | Shows RGB/HSV `NumberBox` inputs (fallback `true`). |
| `IsHexInputVisible` | `Boolean \| String` | `undefined` | Shows the hex `TextBox` (fallback `true`). |
| `IsAlphaEnabled` | `Boolean \| String` | `undefined` | Enables alpha: an alpha slider, an opacity input and an `#RRGGBBAA` output (fallback `false`). |
| `IsAlphaSliderVisible` | `Boolean \| String` | `undefined` | Shows the alpha slider when alpha is enabled (fallback `true`). |
| `IsAlphaTextInputVisible` | `Boolean \| String` | `undefined` | Shows the opacity `NumberBox` (fallback `true`). |
| `modelValue` | `String` | `'#0067C0'` | Vue `v-model` colour. |
| `isColorPreviewVisible` | `Boolean` | `true` | Lowercase alias. |
| `isColorSliderVisible` | `Boolean` | `true` | Lowercase alias. |
| `isColorChannelTextInputVisible` | `Boolean` | `true` | Lowercase alias. |
| `isHexInputVisible` | `Boolean` | `true` | Lowercase alias. |
| `isAlphaEnabled` | `Boolean` | `false` | Lowercase alias. |
| `isAlphaSliderVisible` | `Boolean` | `true` | Lowercase alias. |
| `isAlphaTextInputVisible` | `Boolean` | `true` | Lowercase alias for the opacity input. |
| `previousColor` | `String` | `null` | Previous colour swatch; rendered only when truthy. |
| `colorSpectrumShape` | `String` | `'Box'` | Lowercase alias. |

**v-model:** `v-model` (emits `update:modelValue`) and `v-model:Color` (emits `update:Color`). Both are emitted on every change, including during dragging.

**Slots:** none.

**Events:**

| Event | args |
| --- | --- |
| `ColorChanged` | **single argument**: `{ OldColor, NewColor }` — no sender; both are hex strings (`#RRGGBB` or `#RRGGBBAA`). |

**Gotchas**

- **No `IsEnabled`, `Visibility`, `Width` or `Height` props.** To hide it, use `v-if` on a wrapper; sizing comes from the fixed template (`min-width:312px; max-width:392px`, 256px spectrum).
- The details panel (color-model `ComboBox` RGB/HSV, hex `TextBox`, channel `NumberBox`es, opacity) is visible by default; `IsMoreButtonVisible` hides it behind a `SubtleButtonStyle` "More" button and expands the panel on demand.
- Alpha output order is `#RRGGBBAA` (alpha appended last) and only when alpha `< 1`; input parsing accepts 3-, 6- and 8-digit hex (8-digit parsed as `#RRGGBBAA`).
- `Color` wins over `modelValue` when both are provided (`Color` undefined → `modelValue` → default).
- The two lowercase/capital families are independent props: the capital names override their lowercase aliases. Passing an unknown prop name silently falls through to the root element.
- The canvas spectrum is redrawn when `ColorSpectrumShape` changes; `Box` maps x→hue, y→saturation, `Ring` maps angle→hue, radius→saturation.
- Hovering/focusing the spectrum opens a tooltip showing the hex value.
- Emits `ColorChanged` continuously while dragging (not only on release).

**Minimal SFC**

```vue
<template>
  <StackPanel Orientation="Horizontal" Spacing="16">
    <ColorPicker Color="#0067C0" @ColorChanged="onColorChanged" />

    <ColorPicker v-model="color" ColorSpectrumShape="Ring" :IsAlphaEnabled="true"
                 :IsMoreButtonVisible="true" previous-color="#FFD700" />

    <Border Width="60" Height="60" :Background="color" />
  </StackPanel>
</template>

<script setup>
import { ref } from 'vue'
import Border from '../../components/Border.vue'
import ColorPicker from '../../components/ColorPicker.vue'
import StackPanel from '../../components/StackPanel.vue'

const color = ref('#0067C0')
const onColorChanged = ({ OldColor, NewColor }) => console.log(OldColor, '→', NewColor)
</script>
```

---

## Appendix A — cross-control quick reference

**Which controls support which `v-model`**

| Binding | Works | Does not work |
| --- | --- | --- |
| `v-model` | ToggleSwitch, Rating, ColorPicker, RadioButton (with a `value` prop) | Button, ToggleButton, CheckBox, Slider, RadioButtons |
| `v-model:IsChecked` | CheckBox, RadioButton, AppBarToggleButton | ToggleButton (no `update:IsChecked`) |
| `v-model:IsOn` | ToggleSwitch | — |
| `v-model:Value` | Slider, Rating | — |
| `v-model:Color` | ColorPicker | — |
| `v-model:SelectedIndex` / `SelectedItem` | RadioButton (group mode), RadioButtons | — |

**Boolean props** accept `true`/`false`, a real bound boolean, or the exact XAML strings `"True"`/`"False"`; a bare attribute on a `[Boolean, String]` prop resolves to `true`. Lowercase `"true"` is *not* coerced.

**Sizing defaults worth remembering**

| Control | Natural size |
| --- | --- |
| Button / ToggleButton / RepeatButton / DropDownButton / HyperlinkButton | ~30px tall (19px line-height + 5/6 padding), 11px side padding, radius 4, 1px border |
| SplitButton | min 71px wide (35 + 1 + 35), padding 11,6,11,7 |
| AppBarButton / AppBarToggleButton | 68px wide, 64px min content height full-size; 48px compact |
| AppBarSeparator | 5px wide, 1px line, `8px 2px` line margin |
| CheckBox | 32px min height, 20px box + 8px gap |
| RadioButton | 32px min height, 20px glyph, min-width 120px |
| ToggleSwitch | 40×20 switch, 40px row, 154px root min-width |
| Slider | 32px min height (horizontal), 4px track, 18/22px thumb; vertical defaults 32×100 |
| Rating | 32px tall, 16px stars, 8px gap |
| ColorPicker | 312–392px wide, 256px spectrum |

**Theme:** palettes come from CSS custom properties, so a surrounding `.win-theme-scope`/`.theme-light`/`.theme-dark` wrapper restyles all of these. Only Button, ToggleButton, RepeatButton, HyperlinkButton, SplitButton, DropDownButton and Slider also declare a `RequestedTheme` prop for a local theme scope; the others have no `RequestedTheme` and always inherit.

## Appendix B — source map

| Control | Component | Gallery demo(s) | Sample XAML |
| --- | --- | --- | --- |
| Button | `src/components/Button.vue` | `ButtonPage.vue` | `samples/Button/ButtonSimple.txt`, `ButtonWithImage.txt`, `ButtonBuiltInStyles.txt`, `ButtonWrapping.txt` |
| ToggleButton | `ToggleButton.vue` | `ToggleButtonPage.vue` | `samples/ToggleButton/ToggleButtonSimple.txt` |
| SplitButton | `SplitButton.vue` | `SplitButtonPage.vue` | `samples/SplitButton/SplitButtonColorPicker.txt`, `SplitButtonText.txt` |
| DropDownButton | `DropDownButton.vue` | `DropDownButtonPage.vue` | `samples/DropDownButton/DropDownButtonSimple.txt`, `DropDownButtonIcon.txt` |
| RepeatButton | `RepeatButton.vue` | `RepeatButtonPage.vue` | `samples/RepeatButton/RepeatButtonSimple.txt` |
| HyperlinkButton | `HyperlinkButton.vue` | `HyperlinkButtonPage.vue` | `samples/HyperlinkButton/HyperlinkButtonNavigate.txt`, `HyperlinkButtonClick.txt` |
| AppBarButton | `AppBarButton.vue` | `AppBarButtonPage.vue`, `AppBarSeparatorPage.vue` | `samples/AppBarButton/*.txt` |
| AppBarToggleButton | `AppBarToggleButton.vue` | `AppBarToggleButtonPage.vue` | `samples/AppBarToggleButton/*.txt` |
| AppBarSeparator | `AppBarSeparator.vue` | `AppBarSeparatorPage.vue` | `samples/AppBarSeparator/AppbarbuttonsSeparatedAppbarseparators.txt` |
| CheckBox | `CheckBox.vue` | `CheckBoxPage.vue` | no `samples/` file — the demo source is the inline `checkBoxTwoStateVue` / `checkBoxThreeStateVue` / `checkBoxSelectAllVue` strings in the page |
| RadioButton | `RadioButton.vue` | `RadioButtonPage.vue`, `RadioButtonsPage.vue` | no `samples/` file — inline `radioButtonGroupVue` / `radioButtonStringsVue` strings |
| RadioButtons | `RadioButtons.vue` | `RadioButtonPage.vue`, `SliderPage.vue`, `ColorPickerPage.vue` | see RadioButton; SliderPage/ColorPickerPage use it for their option panels |
| ToggleSwitch | `ToggleSwitch.vue` | `ToggleSwitchPage.vue` | no `samples/` file — inline `toggleSwitchSimpleVue` / `toggleSwitchCustomVue` strings |
| Slider | `Slider.vue` | `SliderPage.vue`, `CanvasPage.vue` | `samples/Slider/SliderSimple.txt`, `SliderRange.txt`, `SliderTicks.txt`, `SliderVertical.txt` |
| Rating | `Rating.vue` | `RatingPage.vue`, `RatingControlPage.vue` | `samples/RatingControl/RatingControlSimple.txt`, `RatingControlPlaceholder.txt` |
| ColorPicker | `ColorPicker.vue` | `ColorPickerPage.vue` | no `samples/` file — inline `colorPickerPropertiesVue` string |

