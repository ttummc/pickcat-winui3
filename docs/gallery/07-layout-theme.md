# 07 · Layout primitives, Icons, Typography & Theming

Reference for building the social-app UI on **WinUIonWeb**. Every name below was read from the
source in `WinUIonWeb-master\WinUIonWeb\src`; nothing is guessed. When a value is not present in the
source it is written as **unknown**.

## Files inspected (source of truth)

| Area | Files |
| --- | --- |
| Layout / shape | `components\Grid.vue`, `StackPanel.vue`, `Border.vue`, `Canvas.vue`, `RelativePanel.vue`, `Viewbox.vue`, `layout.ts`, `gridTracks.ts`, `relativePanelLayout.ts` |
| Media | `components\Image.vue`, `BitmapImage.vue`, `SvgImageSource.vue`, `imageSource.ts`, `PersonPicture.vue` |
| Shapes | `components\Ellipse.vue`, `Rectangle.vue` |
| Icons | `components\FontIcon.vue`, `SymbolIcon.vue`, `PathIcon.vue`, `iconElementRuntime.ts`, `iconElementStyles.css`, `symbolGlyphs.ts`, `iconFont.ts`, `styles\icons.css` |
| Lists / motion | `components\TreeView.vue`, `SwipeControl.vue`, `SwipeControl.types.ts`, `SemanticZoom.vue`, `ParallaxView.vue`, `ThemeShadow.vue`, `themeShadowRuntime.ts` |
| Materials | `components\AcrylicBrush.ts`, `acrylicResources.ts`, `SystemBackdropElement.vue`, `systemBackdropXaml.ts`, `systemBackdrop.ts` |
| Systems | `styles\theme.css` (2069 lines), `styles\buttonResources.css`, `styles\icons.css`, `components\TextBlock.vue`, `TypographyRow.vue`, `textControlResources.ts`, `navigationViewResources.ts`, `xamlPrimitives.ts`, `xamlRuntime.ts`, `systemAccentColorHostAdapter.ts`, `gallery\App.vue`, `utils\pageState.js` |
| Gallery demos | `gallery\pages\{Grid,StackPanel,Border,Canvas,RelativePanel,Viewbox,Image,PersonPicture,IconElement,Iconography,Typography,Color,Resources,TreeView,SwipeControl,SemanticZoom,ParallaxView,ThemeShadow,AcrylicBrush,SystemBackdropElement,CompactSizing}Page.vue` |
| Glyph table | `gallery\samples\Iconography\IconsData.json` (1533 entries: `Code`, `Name`, `Tags`) |

## 0. Conventions

- Package name: `winuionweb` (`package.json` → `"name": "winuionweb"`, version `0.2.0`).
- Global install: `app.use(WinUIOnWeb)` (`src/index.ts`). Named import also works:
  `import { Grid, FontIcon } from 'winuionweb'`.
- Prop names are the **XAML dependency-property names in PascalCase** (`Glyph`, `TintColor`,
  `ItemsSource`, `ColumnSpacing`, …). Vue templates can also carry XAML-style attribute names
  (`Grid.Row`, `RelativePanel.RightOf`, `AutomationProperties.Name`) — the runtime resolves them.
- Attached placement attributes recognised by `layout.ts` (`useLayoutObserver` attributeFilter):
  `Grid.Row`, `Grid.Column`, `Grid.RowSpan`, `Grid.ColumnSpan`, `Canvas.Left`, `Canvas.Top`,
  `Canvas.ZIndex`, `VariableSizedWrapGrid.RowSpan`, `VariableSizedWrapGrid.ColumnSpan`,
  `RelativePanel.LeftOf`, `RelativePanel.RightOf`, `RelativePanel.Above`, `RelativePanel.Below`,
  `RelativePanel.AlignLeftWith`, `AlignTopWith`, `AlignRightWith`, `AlignBottomWith`,
  `AlignHorizontalCenterWith`, `AlignVerticalCenterWith`, `AlignLeftWithPanel`, `AlignTopWithPanel`,
  `AlignRightWithPanel`, `AlignBottomWithPanel`, `AlignHorizontalCenterWithPanel`,
  `AlignVerticalCenterWithPanel`.
- Shared "box" props appear on nearly every control with identical names: `Width`, `Height`,
  `MinWidth`, `MinHeight`, `MaxWidth`, `MaxHeight`, `Margin`, `HorizontalAlignment`,
  `VerticalAlignment`, `Visibility`, `Opacity`. Defaults differ per control and are listed per
  control below.
- Sizing values are CSS pixels (`epx` in the WinUI docs); `Width="240"` === `Width="240px"`.

---

# PART A — Layout, shape, media and motion controls

## A1. Grid

**Import** `import Grid from 'winuionweb'` (or `import Grid from '../components/Grid.vue'`).

CSS grid container. `ColumnDefinitions` / `RowDefinitions` may be passed as a **prop string**
(`"50,50,50"`, `"1*,Auto,2*"`, `"*;*"` — split on `,` or `;`, parsed by `parseGridTracks` in
`gridTracks.ts`: `Auto` → `minmax(min, max-content)`, `N*` → `minmax(min, Nfr)`, number → px) **or**
declared with child `<Grid.ColumnDefinitions>` / `<Grid.RowDefinitions>` + `ColumnDefinition` /
`RowDefinition`.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Width` / `Height` | String \| Number | `''` | |
| `MinWidth` / `MinHeight` | String \| Number | `''` | |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` | |
| `Background` | String \| Object | `''` | accepts `{ThemeResource …}`, `{StaticResource …}`, `var(--…)`, AcrylicBrush/RadialGradientBrush |
| `BackgroundSizing` | String | `''` | |
| `BorderBrush` | String | `''` | |
| `BorderThickness` | String \| Number | `0` | |
| `CornerRadius` | String \| Number | `''` | |
| `Padding` | String \| Number | `''` | |
| `Margin` | String \| Number | `''` | |
| `ColumnDefinitions` | String \| Array \| Object | `''` | see parsing above |
| `RowDefinitions` | String \| Array \| Object | `''` | |
| `ColumnSpacing` | String \| Number | `0` | |
| `RowSpacing` | String \| Number | `0` | |
| `HorizontalAlignment` | String | `''` | |
| `VerticalAlignment` | String | `''` | |
| `Visibility` | String | `'Visible'` | `'Collapsed'` hides |
| `Shadow` | String \| Object | `null` | ThemeShadow |
| `Translation` | String \| Object | `{ X: 0, Y: 0, Z: 0 }` | |

**Slots** default only. Children may declare `Grid.Row` / `Grid.Column` / `Grid.RowSpan` /
`Grid.ColumnSpan`.

```vue
<Grid ColumnSpacing="8" RowSpacing="8" Padding="12">
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="Auto" />
    <ColumnDefinition Width="*" />
  </Grid.ColumnDefinitions>
  <Grid.RowDefinitions>
    <RowDefinition Height="Auto" />
    <RowDefinition Height="Auto" />
  </Grid.RowDefinitions>
  <PersonPicture Grid.Row="0" Grid.Column="0" Width="40" Height="40" />
  <TextBlock Grid.Row="0" Grid.Column="1" Text="Ada Lovelace" />
  <TextBlock Grid.Row="1" Grid.Column="1" Text="2h ago" Foreground="{ThemeResource TextFillColorSecondaryBrush}" />
</Grid>
```

Equivalent prop form: `<Grid ColumnDefinitions="Auto,*" RowDefinitions="Auto,Auto">`.

Also exported from `Grid.vue`: `GridContextFlyout` (`<Grid.ContextFlyout>`), and the resource
wrappers `GridColumnDefinitions` / `GridRowDefinitions` / `GridDefinitions` (`GridDefinitions`
takes `axis="columns" | "rows"`, renders `display:none`, only registers the definitions).

## A2. StackPanel

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Orientation` | String | `'Vertical'` | `'Horizontal'` for rows |
| `Spacing` | String \| Number | `0` | gap between children |
| `Width` / `Height` | String \| Number | `''` | |
| `MinWidth` / `MinHeight` | String \| Number | `''` | |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` | |
| `Background` | String \| Object | `''` | |
| `BackgroundSizing` | String | `''` | |
| `BorderBrush` | String | `''` | |
| `BorderThickness` | String \| Number | `''` | |
| `CornerRadius` | String \| Number | `''` | |
| `Padding` | String \| Number | `''` | |
| `Margin` | String \| Number | `''` | |
| `HorizontalAlignment` | String | `''` | child default `'Stretch'` |
| `VerticalAlignment` | String | `''` | child default `'Stretch'` |
| `Visibility` | String | `'Visible'` | |
| `Opacity` | String \| Number | `1` | |

**Slots** default. Usage:

```vue
<StackPanel Orientation="Horizontal" Spacing="8" VerticalAlignment="Center">
  <FontIcon Glyph="&#xE77B;" FontSize="16" />
  <TextBlock Text="Ada Lovelace" />
</StackPanel>
```

## A3. Border

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Background` | String \| Object | `''` | |
| `BackgroundSizing` | String | `'InnerBorderEdge'` | |
| `BorderBrush` | String \| Object | `''` | |
| `BorderThickness` | String \| Number | `0` | 4-value XAML thickness `"l,t,r,b"` accepted |
| `CornerRadius` | String \| Number | `0` | |
| `Padding` | String \| Number | `0` | |
| `Width` / `Height` | String \| Number | `''` | |
| `MinWidth` / `MinHeight` | String \| Number | `0` | |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` | |
| `Margin` | String \| Number | `0` | |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` | |
| `Visibility` | String | `'Visible'` | |
| `IsHitTestVisible` | String \| Boolean | `true` | |
| `Opacity` | String \| Number | `1` | |
| `Translation` | String \| Object | `{ X: 0, Y: 0, Z: 0 }` | |
| `Shadow` | String \| Object | `null` | ThemeShadow |

**Slots** default (content) plus the structural children exported from `Border.vue`:
`Border.Child`, `Border.Resources`, `Border.Shadow`.

```vue
<Border Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
        BorderBrush="{ThemeResource CardStrokeColorDefaultBrush}"
        BorderThickness="1" CornerRadius="8" Padding="16">
  <TextBlock Text="Post body" TextWrapping="Wrap" />
</Border>
```

## A4. Canvas

Absolute positioning container (`position: relative` host; children use `Canvas.Left` / `Canvas.Top`
/ `Canvas.ZIndex`).

| Prop | Type | Default |
| --- | --- | --- |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` | String \| Number | `0` |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `Background` | String \| Object | `''` |
| `Margin` | String \| Number | `0` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `Visibility` | String | `'Visible'` |
| `IsHitTestVisible` | String \| Boolean | `true` |
| `Opacity` | String \| Number | `1` |

**Slots** default. Also exports `CanvasResources` (`<Canvas.Resources>`).

```vue
<Canvas Width="140" Height="140" Background="Gray">
  <Rectangle Canvas.Left="20" Canvas.Top="20" Width="40" Height="40" Fill="Red" />
  <Rectangle Canvas.Left="80" Canvas.Top="60" Width="40" Height="40" Fill="Blue" />
</Canvas>
```

## A5. RelativePanel

| Prop | Type | Default |
| --- | --- | --- |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` | String \| Number | `''` |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `Background` | String | `''` |
| `BackgroundSizing` | String | `'InnerBorderEdge'` |
| `BorderBrush` | String | `''` |
| `BorderThickness` | String \| Number | `0` |
| `CornerRadius` | String \| Number | `0` |
| `Padding` | String \| Number | `0` |
| `Margin` | String \| Number | `0` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `Visibility` | String | `'Visible'` |

**Slots** default. Child relations (exact names, from `relativePanelLayout.ts`):

- sibling: `RelativePanel.LeftOf`, `RightOf`, `Above`, `Below`
- align to sibling: `AlignLeftWith`, `AlignTopWith`, `AlignRightWith`, `AlignBottomWith`,
  `AlignHorizontalCenterWith`, `AlignVerticalCenterWith`
- align to panel: `AlignLeftWithPanel`, `AlignTopWithPanel`, `AlignRightWithPanel`,
  `AlignBottomWithPanel`, `AlignHorizontalCenterWithPanel`, `AlignVerticalCenterWithPanel`

```vue
<RelativePanel Width="300">
  <Rectangle x:Name="Avatar" Width="50" Height="50" Fill="Red" />
  <TextBlock RelativePanel.RightOf="Avatar" RelativePanel.AlignTopWith="Avatar" Margin="8,0,0,0" Text="Title" />
  <TextBlock RelativePanel.RightOf="Avatar" RelativePanel.Below="Title" Margin="8,0,0,0" Text="Subtitle" />
</RelativePanel>
```

`x:Name` (or `x:name`) is what sibling relations reference; keep the same spelling.

## A6. Viewbox

Scales a single child (`Stretch` + `StretchDirection` computed as a transform scale, see
`computeScale` in `Viewbox.vue`).

| Prop | Type | Default |
| --- | --- | --- |
| `Child` | any | `undefined` |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` | String \| Number | `0` |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `Margin` | String \| Number | `''` |
| `Visibility` | String | `'Visible'` |
| `Stretch` | String | `'Uniform'` (`'Fill'`, `'UniformToFill'`, `'None'`) |
| `StretchDirection` | String | `'Both'` (`'UpOnly'`, `'DownOnly'`) |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |

**Slots** default; also `<Viewbox.Child>` (`ViewboxChild`).

```vue
<Viewbox Width="96" Height="96" Stretch="Uniform" StretchDirection="Both">
  <PathIcon Data="M0,0 L10,0 L10,10 Z" Width="20" Height="20" />
</Viewbox>
```

## A7. Image

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Source` | String \| Object | `''` | URL/URI string, `{StaticResource …}`, `BitmapImage`/`SvgImageSource` object |
| `Stretch` | String | `'Uniform'` | `'Fill'`, `'UniformToFill'`, `'None'` |
| `NineGrid` | String \| Number \| Object | `'0'` | XAML `Thickness` for 9-grid scaling |
| `Width` / `Height` | String \| Number | `''` | |
| `MinWidth` / `MinHeight` | String \| Number | `0` | |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` | |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` | |
| `Margin` | String \| Number | `0` | |
| `Opacity` | String \| Number | `1` | |
| `Visibility` | String | `'Visible'` | |
| `IsHitTestVisible` | Boolean \| String | `true` | |

`AutomationProperties.Name` becomes `role="img"` + `aria-label`. Events used by the gallery demo:
`ImageOpened`, `ImageFailed`. **Slots** default; `<Image.Source>` (`ImageSourceProperty`) for the
object form.

```vue
<Image Height="100" Stretch="UniformToFill"
       Source="https://cdn.jsdelivr.net/gh/microsoft/WinUI-Gallery@main/WinUIGallery/Assets/SampleMedia/treetops.jpg"
       AutomationProperties.Name="Treetops" />

<Image Width="48" Height="48">
  <Image.Source>
    <BitmapImage UriSource="/media/avatar.png" DecodePixelWidth="96" />
  </Image.Source>
</Image>
```

## A8. BitmapImage

An `ImageSource` (renders nothing — must be used as `Image.Source`).

| Prop | Type | Default |
| --- | --- | --- |
| `UriSource` | String \| Object | `''` |
| `AutoPlay` | Boolean \| String | `true` |
| `DecodePixelWidth` | Number \| String | `0` |
| `DecodePixelHeight` | Number \| String | `0` |
| `DecodePixelType` | String | `'Physical'` (`'Logical'`) |

```vue
<Image Width="200" Height="120">
  <Image.Source>
    <BitmapImage UriSource="https://example.com/photo.png" DecodePixelWidth="400" />
  </Image.Source>
</Image>
```

Sibling `SvgImageSource`: `UriSource`, `RasterizePixelWidth`, `RasterizePixelHeight` (all `''`/`0`).

## A9. PersonPicture

Avatar control (it *is* an `Ellipse` + initials + badge internally). Default size **96 × 96**.

| Prop | Type | Default |
| --- | --- | --- |
| `BadgeNumber` | String \| Number | `0` |
| `BadgeGlyph` | String | `''` |
| `BadgeImageSource` | String \| Object | `null` |
| `BadgeText` | String | `''` |
| `IsGroup` | Boolean \| String | `false` |
| `Contact` | Object \| String | `null` |
| `DisplayName` | String | `''` |
| `Initials` | String | `''` |
| `PreferSmallImage` | Boolean \| String | `false` |
| `ProfilePicture` | String \| Object | `null` |
| `Width` / `Height` | String \| Number | `96` / `96` |
| `Foreground` | String | `'{ThemeResource PersonPictureForegroundThemeBrush}'` |
| `Background` | String | `'{ThemeResource PersonPictureEllipseFillThemeBrush}'` |
| `BorderBrush` | String | `'{ThemeResource PersonPictureEllipseFillStrokeBrush}'` |
| `BorderThickness` | String \| Number | `'{ThemeResource PersonPictureEllipseStrokeThickness}'` |
| `FontFamily` | String | `'{ThemeResource ContentControlThemeFontFamily}'` |
| `FontWeight` | String \| Number | `'SemiBold'` |
| `IsTabStop` | Boolean \| String | `false` |
| `IsEnabled` | Boolean \| String | `true` |
| `IsHitTestVisible` | Boolean \| String | `true` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `Margin` / `MinWidth` / `MinHeight` / `MaxWidth` / `MaxHeight` | | `''` / `0` / `0` / `''` / `''` |
| `Visibility` | String | `'Visible'` |
| `Opacity` | String \| Number | `1` |

PersonPicture theme tokens (`theme.css`): `--PersonPictureForegroundThemeBrush`,
`--PersonPictureEllipseBadgeForegroundThemeBrush`, `--PersonPictureEllipseBadgeFillThemeBrush`,
`--PersonPictureEllipseBadgeStrokeThemeBrush`, `--PersonPictureEllipseFillStrokeBrush`,
`--PersonPictureEllipseFillThemeBrush`, `--PersonPictureEllipseStrokeThickness` (1px),
`--PersonPictureEllipseBadgeStrokeThickness` (2px), `--PersonPictureBadgeGridMargin`
(`-4px -4px 0 0`).

**Slots** default only as source declarations: `<PersonPicture.ProfilePicture>` and
`<PersonPicture.BadgeImageSource>`.

```vue
<PersonPicture Width="40" Height="40" DisplayName="Ada Lovelace" />
<PersonPicture Width="48" Height="48" BadgeNumber="3">
  <PersonPicture.ProfilePicture>
    <BitmapImage UriSource="/media/ada.png" />
  </PersonPicture.ProfilePicture>
</PersonPicture>
```

## A10. Ellipse

| Prop | Type | Default |
| --- | --- | --- |
| `Fill` | String \| Object | `''` |
| `Stroke` | String \| Object | `''` |
| `StrokeThickness` | String \| Number | `''` |
| `StrokeDashArray` | String \| Array | `''` |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` / `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `Margin` | String \| Number | `''` |
| `Opacity` | String \| Number | `''` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `''` |
| `Visibility` | String | `'Visible'` |

**Slots** none (`<slot>` absent; content is brush-driven). Usage:

```vue
<Ellipse Width="40" Height="40" Fill="{ThemeResource AccentFillColorDefaultBrush}" />
```

## A11. Rectangle

| Prop | Type | Default |
| --- | --- | --- |
| `Fill` | String \| Object | `''` |
| `Stroke` | String \| Object | `''` |
| `StrokeThickness` | String \| Number | `''` |
| `Stretch` | String | `'Fill'` |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` / `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `RadiusX` / `RadiusY` | String \| Number | `''` |
| `Margin` | String \| Number | `''` |

```vue
<Rectangle Width="48" Height="48" Fill="Red" RadiusX="8" RadiusY="8" />
```

Note: `Ellipse`/`Rectangle` have **no** `Width`→`ActualWidth` helpers beyond the shared
`api` from `iconElementRuntime`-style layout; they are plain divs with CSS background/border.

## A12. PathIcon

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Data` | String \| Object | `null` | SVG path `d`, or geometry object (see `iconGeometry.ts`); supports `{StaticResource …}` |
| `Foreground` | String \| Object | `''` | shape is `fill: currentColor` |
| `Width` / `Height` | String \| Number | `''` | natural SVG size when omitted |
| `MinWidth` / `MinHeight` / `MaxWidth` / `MaxHeight` | String \| Number | `0` / `0` / `''` / `''` | |
| `Margin` | String \| Number | `0` | |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` | |
| `Visibility` | String | `'Visible'` | |
| `Opacity` | String \| Number | `1` | |
| `IsHitTestVisible` | Boolean \| String | `true` | |
| `FlowDirection` | String | `''` | |
| `RequestedTheme` | String | `'Default'` | |

**Slots** default — geometry nodes (`<PathIcon.Data>` = `PathIconData`) can be declared as children
when `Data` is `''`/`null`. Natural box comes from `getBBox()` (`Stretch` default `None`).

```vue
<PathIcon Data="M2 2 L14 2 L14 14 L2 14 Z" Foreground="{ThemeResource TextFillColorPrimaryBrush}" Width="16" Height="16" />
```

## A13. FontIcon

**This is the glyph primitive you want for a Fluent icon.** The codepoint lives in the **`Glyph`**
prop.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Glyph` | String \| Number | `''` | the codepoint, e.g. `"&#xE80F;"` / `"\uE80F"` / `'&#xE80F;'` |
| `FontFamily` | String | `'Segoe Fluent Icons,Segoe MDL2 Assets'` | fallback chain gets `"WinUIOnWebFontIcons"` appended |
| `FontSize` | String \| Number | `20` | multiplied by `var(--TextScaleFactor, 1)` when `IsTextScaleFactorEnabled` |
| `FontStyle` | String | `'Normal'` | |
| `FontWeight` | String \| Number | `'Normal'` | |
| `IsTextScaleFactorEnabled` | Boolean \| String | `true` | |
| `MirroredWhenRightToLeft` | Boolean \| String | `false` | |
| `Foreground` | String \| Object | `''` | inherits when empty (`color: inherit`) |
| `Width` / `Height`, `Min*`/`Max*`, `Margin`, `Opacity`, `Visibility`, `IsHitTestVisible`, `FlowDirection`, `RequestedTheme` | | per `iconElementProps` | |

```vue
<FontIcon Glyph="&#xE80F;" FontSize="16" />
<FontIcon Glyph="&#xEA8F;" FontSize="20" Foreground="{ThemeResource TextFillColorSecondaryBrush}" />
```

## A14. SymbolIcon

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `Symbol` | String \| Number | `'Emoji'` | **enum name** (`'Home'`, `'Find'`, `'Like'`…) or a raw numeric codepoint |
| `Foreground`, `Width`, `Height`, `Margin`, `HorizontalAlignment`, `VerticalAlignment`, `Visibility`, `Opacity`, `IsHitTestVisible`, `FlowDirection`, `RequestedTheme` | | | from `iconElementProps` |

- The enum name is translated to the **Segoe Fluent** codepoint by `symbolGlyphs.ts`
  (`Symbol` name → `[legacy, segoeFluent]`, second value used): e.g. `Accept → 0xE8FB`,
  `Add → 0xE710`, `Back → 0xE72B`, `Delete → 0xE74D`, `Edit → 0xE70F`, `Favorite → 0xE734`,
  `Filter → 0xE71C`, `Find → 0xE721`, `Home → 0xE80F`, `Like → 0xE8E1`, `More → 0xE712`,
  `Refresh → 0xE72C`, `Send → 0xE724`, `Setting → 0xE713`, `Share → 0xE72D`, `Comment → 0xE90A`,
  `Pictures → 0xE8B9`, `Cancel → 0xE711`, `Contact → 0xE77B`, `People → 0xE716`,
  `UnFavorite → 0xE8D9`. The name must be a key of `symbolGlyphs` (197 entries); names such as
  `ChevronDown`, `Heart` or `FavoriteStarFill` are **Fluent-only** and exist only in
  `IconsData.json` → render them with `FontIcon`/`PathIcon`.
- **`FontSize` is not honoured**: the template hard-codes `FontSize="20"` and `rootAttrs` strips
  `FontSize`; `.win-symbol-icon-glyph` sets `font-size: 20px`. Use `FontIcon` when you need another
  size.

```vue
<SymbolIcon Symbol="Find" />
<SymbolIcon Symbol="Like" Foreground="{ThemeResource AccentTextFillColorPrimaryBrush}" />
```

## A15. TreeView

`TreeView` + `TreeViewItem` (+ structural `TreeView.RootNodes` / `TreeViewNode` /
`TreeViewNode.Children`). Full TS prop surface from `withDefaults(defineProps<{…}>())`:

| Prop | Type | Default |
| --- | --- | --- |
| `ItemsSource` | Array \| String | `undefined` |
| `RootNodes` | Array \| String | `undefined` |
| `SelectionMode` | `'None' \| 'Single' \| 'Multiple'` | `'Single'` |
| `CanDragItems` | Boolean \| String | `true` |
| `CanReorderItems` | Boolean \| String | `true` |
| `AllowDrop` | Boolean \| String | `true` |
| `SelectedItem` | any | `undefined` |
| `SelectedItems` | Array \| String | `undefined` |
| `ItemTemplate` | any | `() => ''` |
| `ItemTemplateSelector` | any | `() => ''` |
| `ItemContainerStyle` / `ItemContainerStyleSelector` | any | `undefined` |
| `ItemContainerTransitions` | any | `undefined` |
| `FlowDirection` | String | `'LeftToRight'` |
| `IsEnabled` | Boolean \| String | `true` |
| `HorizontalAlignment` | String | `'Stretch'` |
| `VerticalAlignment` | String | `'Stretch'` |
| `HorizontalContentAlignment` | String | `'Stretch'` |
| `VerticalContentAlignment` | String | `'Center'` |
| `Width`/`Height`/`MinWidth`/`MinHeight`/`MaxWidth`/`MaxHeight`/`Margin`/`Padding`/`Background`/`BorderBrush`/`BorderThickness`/`CornerRadius` | | `''` |

Events (`defineEmits`): `ItemInvoked`, `SelectionChanged`, `Expanding`, `Collapsed`,
`DragItemsStarting`, `DragItemsCompleted`, `DragOver`, `Drop`, plus `update:ItemsSource`,
`update:RootNodes`, `update:SelectedItem`, `update:SelectedItems`.

Sizing tokens: `--TreeViewItemMinHeight` 28px (light/dark blocks), `--TreeViewItemContentHeight`
20px, `--TreeViewItemPresenterPadding: 3px 0 5px 0`,
`--TreeViewItemMultiSelectCheckBoxMinHeight` 28px.

```vue
<TreeView ItemsSource="{x:Bind Folders}" SelectionMode="Single"
          ItemInvoked="TreeView_ItemInvoked">
  <TreeView.ItemTemplate>
    <DataTemplate x:DataType="local:ExplorerItem">
      <TreeViewItem IsExpanded="True" ItemsSource="{x:Bind Children}">
        <StackPanel Orientation="Horizontal" Spacing="8">
          <FontIcon Glyph="&#xE8B7;" FontSize="16" />
          <TextBlock Text="{x:Bind Name}" />
        </StackPanel>
      </TreeViewItem>
    </DataTemplate>
  </TreeView.ItemTemplate>
</TreeView>
```

Module exports in `TreeView.vue`: `default = { ItemTemplate: CollectionItemTemplate,
ItemTemplateSelector: CollectionItemTemplateSelector, … }`, plus `XamlTreeViewItem`,
`TreeViewRootNodes`, `XamlTreeViewNode`, `TreeViewNodeChildren`.

## A16. SwipeControl

| Prop | Type | Default |
| --- | --- | --- |
| `LeftItems` | `SwipeItems` \| String | `undefined` |
| `RightItems` | `SwipeItems` \| String | `undefined` |
| `TopItems` | `SwipeItems` \| String | `undefined` |
| `BottomItems` | `SwipeItems` \| String | `undefined` |
| `Content` | any | `undefined` |
| `ContentTemplate` | any | `undefined` |
| `DataContext` | any | `undefined` |
| `Background` | Object \| String | `'Transparent'` |
| `BorderBrush` | Object \| String | `'Transparent'` |
| `BorderThickness` | Number \| String | `0` |
| `CornerRadius` | Number \| String | `0` |
| `Padding` | Number \| String | `0` |
| `Margin` | Number \| String | `0` |
| `Width` / `Height` | Number \| String | `''` |
| `MinWidth` / `MinHeight` | Number \| String | `88` / `40` |
| `MaxWidth` / `MaxHeight` | Number \| String | `''` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `IsEnabled` | Boolean \| String | `true` |
| `IsTabStop` | Boolean \| String | `false` |
| `Visibility` | String | `'Visible'` |
| `AutomationProperties.Name` | String | `''` |

Types (`SwipeControl.types.ts`): `SwipeMode = 'Reveal' | 'Execute'`,
`SwipeBehaviorOnInvoked = 'Auto' | 'Close' | 'RemainOpen'`,
`SwipeSide = 'Left' | 'Right' | 'Top' | 'Bottom'`.
`SwipeItem { Text?, IconSource?: string | { Symbol?, Glyph?, UriSource?, FontFamily? }, Background?,
Foreground?, BehaviorOnInvoked?, Command?: { Label?, Description?, IconSource?, CanExecute?, Execute },
CommandParameter?, Invoked?(sender, { SwipeControl }) }`.
`SwipeItems` API: `Mode`, `Size`, `Count`, `GetAt`, `SetAt`, `InsertAt`, `RemoveAt`, `Append`,
`RemoveAtEnd`, `Clear`, `ReplaceAll`, `IndexOf`, `GetView`. API object also exposes `Close()`.

XAML form used by the gallery demo (`samples\SwipeControl\…`):

```xml
<Border.Resources>
  <FontIconSource x:Key="AcceptIcon" Glyph="&#xE8FB;" />
  <SwipeItems x:Key="left" Mode="Reveal">
    <SwipeItem Text="Accept" IconSource="{StaticResource AcceptIcon}" Invoked="Accept_ItemInvoked" />
  </SwipeItems>
</Border.Resources>

<SwipeControl BorderThickness="1" LeftItems="{StaticResource left}" Width="300" Height="68">
  <TextBlock Text="Swipe Right" Margin="12" HorizontalAlignment="Center" VerticalAlignment="Center" />
</SwipeControl>
```

## A17. SemanticZoom

| Prop | Type | Default |
| --- | --- | --- |
| `ZoomedInView` | Object | `null` |
| `ZoomedOutView` | Object | `null` |
| `IsZoomedInViewActive` | Boolean \| String | `true` |
| `CanChangeViews` | Boolean \| String | `true` |
| `IsZoomOutButtonEnabled` | Boolean \| String | `false` |
| `IsEnabled` | Boolean \| String | `true` |
| `IsTabStop` | Boolean \| String | `false` |
| `TabNavigation` | String | `'Once'` |
| `Width`/`Height`/`MinWidth`/`MaxWidth`/`MinHeight`/`MaxHeight` | Number \| String | `''` |
| `Margin` / `Padding` | Number \| String | `0` |
| `Background` / `BorderBrush` | String | `'Transparent'` |
| `BorderThickness` | Number \| String | `0` |
| `ScrollViewer.HorizontalScrollMode` / `ScrollViewer.VerticalScrollMode` | String | `'Disabled'` |
| `ScrollViewer.IsHorizontalRailEnabled` / `ScrollViewer.IsVerticalRailEnabled` | Boolean \| String | `false` |
| `ScrollViewer.ZoomMode` | String | `'Disabled'` |

**Slots** used as property elements: `<SemanticZoom.ZoomedInView>` and
`<SemanticZoom.ZoomedOutView>` (each holds a real list control). Emits
`update:IsZoomedInViewActive`, `ViewChangeStarted`, `ViewChangeCompleted`; the exposed API adds
`IsZoomedInViewActive` and `ToggleActiveView(request?)`.

```vue
<SemanticZoom Height="500">
  <SemanticZoom.ZoomedInView>
    <GridView ItemTemplate="{StaticResource ZoomedInTemplate}" ItemsSource="{x:Bind cvsGroups.View, Mode=OneWay}" SelectionMode="None" />
  </SemanticZoom.ZoomedInView>
  <SemanticZoom.ZoomedOutView>
    <ListView ItemTemplate="{StaticResource ZoomedOutTemplate}" ItemsSource="{x:Bind cvsGroups.View.CollectionGroups, Mode=OneWay}" SelectionMode="None" />
  </SemanticZoom.ZoomedOutView>
</SemanticZoom>
```

## A18. ParallaxView

`withDefaults(defineProps<Props>())` — full list from `ParallaxView.vue`:

| Prop | Default |
| --- | --- |
| `Child` | `undefined` |
| `Source` | `null` |
| `HorizontalShift` / `VerticalShift` | `0` |
| `HorizontalSourceStartOffset` / `HorizontalSourceEndOffset` | `0` |
| `VerticalSourceStartOffset` / `VerticalSourceEndOffset` | `0` |
| `HorizontalSourceOffsetKind` / `VerticalSourceOffsetKind` | `'Relative'` |
| `IsHorizontalShiftClamped` / `IsVerticalShiftClamped` | `true` |
| `MaxHorizontalShiftRatio` / `MaxVerticalShiftRatio` | `1` |
| `Width`/`Height`/`MinWidth`/`MinHeight`/`MaxWidth`/`MaxHeight`/`Margin` | `undefined` |
| `HorizontalAlignment` / `VerticalAlignment` | `'Stretch'` |
| `Visibility` | `'Visible'` |
| `IsHitTestVisible` | `true` |
| `Opacity` | `1` |

**Slots** default (the parallaxing child) and `<ParallaxView.Child>`.

```vue
<Grid>
  <ParallaxView Source="{Binding ElementName=listView}" VerticalShift="500"
                HorizontalAlignment="Left" VerticalAlignment="Top">
    <Image Source="{x:Bind cliffImage, Mode=OneWay}" />
  </ParallaxView>
  <ListView x:Name="listView" ItemsSource="{x:Bind Items, Mode=OneWay}" Background="#80000000" />
</Grid>
```

`Source` needs a `x:Name` on the scrollable element it follows.

## A19. ThemeShadow

Not a visual of its own: it is a `DependencyObject` placed inside `<Border.Shadow>` (or a `Shadow`
prop) and it paints the elevation shadow of the element itself onto the *receivers*.

| Surface | API |
| --- | --- |
| Component props | **none** (`defineComponent({ name:'ThemeShadow', inheritAttrs:false })`) |
| Exposed instance | `createThemeShadow()` → `{ Receivers }` |
| `Receivers` | `Count`, `Add(element)`, `Remove(element): boolean`, `RemoveAt(i)`, `RemoveAtEnd()`, iterable |
| Consumption | `Shadow` prop on `Grid` / `Border`; `Translation` (`{X,Y,Z}`) controls depth |
| Constants | `getThemeShadowRecipe(translationZ, theme)`, `shadowCornerRadius(value)`, `themeShadowVisualStyle(recipe, cornerRadius)` |
| CSS | `themeShadowVisual.css` (`.win-theme-shadow-visual`) |

```vue
<Grid Padding="36">
  <Grid x:Name="ShadowCastGrid" />
  <Border x:Name="ShadowRect" Width="200" Height="200"
          Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
          CornerRadius="{ThemeResource OverlayCornerRadius}"
          Translation="{x:Bind Translation, Mode=OneWay}">
    <Border.Shadow>
      <ThemeShadow x:Name="shadow" />
    </Border.Shadow>
  </Border>
</Grid>
```

```js
// ShadowRect_Loaded
namescope.shadow?.Receivers.Add(namescope.ShadowCastGrid)
namescope.ShadowRect.Translation = { X: 0, Y: 0, Z: 32 }
```

Receiver and caster must be valid `UIElement`s or `Add` throws
`TypeError('ThemeShadow.Receivers requires a UIElement.')`.

## A20. AcrylicBrush

A brush (`__xamlBrush`), not a visual. Used as `Background`/`Fill` value or as a
`ResourceDictionary` entry `<media:AcrylicBrush x:Key="…" />`.

| Prop | Type | Default |
| --- | --- | --- |
| `TintColor` | String | `'#CCFFFFFF'` |
| `TintOpacity` | String \| Number | `1` |
| `TintLuminosityOpacity` | String \| Number \| null | `null` |
| `TintTransitionDuration` | String \| Number | `500` |
| `AlwaysUseFallback` | String \| Boolean | `false` |
| `FallbackColor` | String | `'#00FFFFFF'` |
| `Opacity` | String \| Number | `1` |

Emitted CSS custom properties on the styled element (`styleFromResolvedBrush`):
`--acrylic-tint`, `--acrylic-luminosity`, `--acrylic-opaque-fallback`, `--acrylic-brush-opacity`,
`--acrylic-opaque`, `--acrylic-fallback`, `--acrylic-noise`, `--acrylic-noise-opacity`,
`--acrylic-fallback-opacity`, `--acrylic-tint-duration`, `--acrylic-fallback-duration`.

Exports: `AcrylicBrush`, `createAcrylicResource`, `resolveAcrylicResource`, `resolveBrushStyle`,
`styleFromResolvedBrush`, `useAcrylicBrushStyle`, `createAcrylicMaterialStyle`,
`createAcrylicMaterialLayer`, `createAcrylicNoiseLayer`, `mountAcrylicMaterialLayer`,
`mountAcrylicNoiseLayer`, `vAcrylicBrush`, `vAcrylicBackdrop`, `isAcrylicResource`.
Named brush resources live in `acrylicResources.ts` (`AcrylicBackgroundFillColorDefaultBrush`,
`AcrylicInAppFillColorDefaultBrush`, `AccentAcrylicBackgroundFillColorDefaultBrush`, …).

```vue
<Page.Resources>
  <ResourceDictionary>
    <ResourceDictionary.ThemeDictionaries>
      <ResourceDictionary x:Key="Default">
        <media:AcrylicBrush x:Key="CustomAcrylicInAppBrush"
                            FallbackColor="Green" TintColor="Black" TintOpacity="0.8" />
      </ResourceDictionary>
    </ResourceDictionary.ThemeDictionaries>
  </ResourceDictionary>
</Page.Resources>

<Rectangle Fill="{ThemeResource CustomAcrylicInAppBrush}" />
```

Fallback policy: acrylic is disabled (and `--acrylic-fallback-opacity` becomes `1`) when
`AlwaysUseFallback`, `!uiSettings.AdvancedEffectsEnabled`, energy saver, prefs-reduced-transparency,
forced-colors/high contrast, or no `backdrop-filter` support.

## A21. SystemBackdropElement

| Prop | Type | Default |
| --- | --- | --- |
| `SystemBackdrop` | String \| Object | `null` |
| `CornerRadius` | String \| Number | `0` |
| `Width` / `Height` | String \| Number | `''` |
| `MinWidth` / `MinHeight` | String \| Number | `0` |
| `MaxWidth` / `MaxHeight` | String \| Number | `''` |
| `Margin` | String \| Number | `0` |
| `HorizontalAlignment` / `VerticalAlignment` | String | `'Stretch'` |
| `Visibility` | String | `'Visible'` |
| `Opacity` | String \| Number | `1` |
| `RequestedTheme` | String | `'Default'` (`'Light'`/`'Dark'`) |
| `IsHitTestVisible` | Boolean \| String | `true` |

Emits `update:SystemBackdrop`, `update:CornerRadius`. Backdrop declarations (from
`systemBackdropXaml.ts`): `<MicaBackdrop Kind="Base|BaseAlt">` and `<DesktopAcrylicBackdrop />`.
Needs a `systemBackdropHostAdapter` provided by the host, otherwise the element stays empty
(`State` remains `null`). It renders `aria-hidden="true"` behind its siblings.

```vue
<Grid Width="300" Height="200">
  <SystemBackdropElement CornerRadius="8">
    <SystemBackdropElement.SystemBackdrop>
      <DesktopAcrylicBackdrop />
    </SystemBackdropElement.SystemBackdrop>
  </SystemBackdropElement>
  <Button HorizontalAlignment="Center" VerticalAlignment="Center" Content="Click me" />
</Grid>
```

---

# PART B — Global system sections

## B1. Icons

### B1.1 Rendering a Segoe Fluent Icons glyph

Three primitives, one rule: the codepoint goes into a single prop.

| Control | Codepoint prop | Value form | Notes |
| --- | --- | --- | --- |
| `FontIcon` | **`Glyph`** | `"&#xE80F;"`, `"&#xE80F;"` entity, or `"\uE80F"` | any `FontSize`; `FontFamily` defaults to `'Segoe Fluent Icons,Segoe MDL2 Assets'` |
| `SymbolIcon` | **`Symbol`** | enum name `"Home"`, `"Find"`, `"Like"` (or a raw number) | enum → Segoe codepoint via `symbolGlyphs.ts`; fixed 20px |
| `PathIcon` | **`Data`** | SVG path string | vector, not a font |

Minimum viable markup:

```vue
<FontIcon Glyph="&#xE80F;" FontSize="16" />
```

The same in raw XAML (`&#xE80F;` is how every gallery page writes glyphs) and in JS
(`'\uE80F'` — the gallery's favourite/favourite-filled toggle uses `'\uE735'` / `'\uE734'`).

`FontFamily` values that are recognised as symbol fonts get `"WinUIOnWebFontIcons"` appended by
`iconFontFamily()`; the CSS token is
`--SymbolThemeFontFamily: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif`.

### B1.2 Is an icon font required? — `loadWinUIIconFont`

The npm package **ships no font file** (`iconFont.ts` header: "The npm package does not contain a
font file; callers must have the right to use and distribute it"). Three `@font-face` rules already
exist and point at the locally installed Windows font, so **no loader call is needed on Windows**:

- `styles\icons.css` → `font-family: 'WinUIOnWebIcons'; src: local('Segoe Fluent Icons');`
- `components\iconElementStyles.css` → `'WinUIOnWebFontIcons'; src: local('Segoe Fluent Icons');`
- `styles\theme.css` (line 291) → `'Segoe Fluent Icons'; src: local('Segoe Fluent Icons');`

Signatures (exported from the package root):

```ts
import { loadWinUIIconFont } from 'winuionweb'

const dispose = await loadWinUIIconFont('/fonts/SegoeIcons.ttf')     // string | URL | Blob | ArrayBuffer
// optional 2nd arg: targetDocument
dispose()                                                          // removes the registered faces
```

It registers **one binary under five families** (`iconFontFamilies`):
`'Segoe Fluent Icons'`, `'WinUIOnWebIcons'`, `'WinUIOnWebFontIcons'`,
`'WinUIOnWebNavigationIcons'`, `'WinUIOnWebSymbolIcons'` — each as `new FontFace(family, data,
{ display: 'block' })`, awaited via `Promise.all(faces.map(f => f.load()))`. It throws
`'FontFace API is not available in this environment'` when `FontFace`/`document.fonts` is missing.
Call it once at app bootstrap (before mount) and keep the disposer for teardown.

### B1.3 Glyph codepoints for a social app

All values verified against `IconsData.json` (`Code` = hex, no `0x`) and `symbolGlyphs.ts`.
`&#x…;` is the markup form, `\u…` the JS form.

| Purpose | Segoe Fluent name | Code | Markup | SymbolIcon equivalent |
| --- | --- | --- | --- | --- |
| home / feed | `Home` | `E80F` | `&#xE80F;` | `Symbol="Home"` |
| home (filled) | `HomeSolid` | `EA8A` | `&#xEA8A;` | unknown |
| search | `Search` | `E721` | `&#xE721;` | `Symbol="Find"` |
| bell / notifications | `Ringer` | `EA8F` | `&#xEA8F;` | unknown |
| bell (muted) | `RingerSilent` | `E7ED` | `&#xE7ED;` | unknown |
| bell + badge | `RingerBadge12` | `EDAC` | `&#xEDAC;` | unknown |
| notification (mobile style) | `MobNotificationBell` | `F2A3` | `&#xF2A3;` | unknown |
| settings | `Settings` | `E713` | `&#xE713;` | `Symbol="Setting"` |
| person (single) | `Contact` | `E77B` | `&#xE77B;` | `Symbol="Contact"` |
| people / group | `People` | `E716` | `&#xE716;` | `Symbol="People"` |
| account (person in circle) | `Accounts` | `E910` | `&#xE910;` | unknown |
| other user | `OtherUser` | `E7EE` | `&#xE7EE;` | `Symbol="OtherUser"` |
| back | `Back` | `E72B` | `&#xE72B;` | `Symbol="Back"` |
| forward | `Forward` | `E72A` | `&#xE72A;` | `Symbol="Forward"` |
| add / compose | `Add` | `E710` | `&#xE710;` | `Symbol="Add"` |
| more (…) | `More` | `E712` | `&#xE712;` | `Symbol="More"` |
| heart (outline) | `Heart` | `EB51` | `&#xEB51;` | unknown (use `Glyph`) |
| heart (filled) | `HeartFill` | `EB52` | `&#xEB52;` | unknown |
| like (thumb) | `Like` | `E8E1` | `&#xE8E1;` | `Symbol="Like"` |
| dislike | `Dislike` | `E8E0` | `&#xE8E0;` | `Symbol="Dislike"` |
| comment / reply | `Comment` | `E90A` | `&#xE90A;` | `Symbol="Comment"` |
| message bubble | `Message` | `E8BD` | `&#xE8BD;` | `Symbol="Message"` |
| chat bubbles | `ChatBubbles` | `E8F2` | `&#xE8F2;` | unknown |
| share | `Share` | `E72D` | `&#xE72D;` | `Symbol="Share"` |
| reshare / repost | `Reshare` | `E8EB` | `&#xE8EB;` | `Symbol="ReShare"` |
| bookmark (list glyph) | `Bookmarks` | `E8A4` | `&#xE8A4;` | `Symbol="Bookmarks"` |
| save (floppy) | `Save` | `E74E` | `&#xE74E;` | `Symbol="Save"` |
| save local | `SaveLocal` | `E78C` | `&#xE78C;` | `Symbol="SaveLocal"` |
| unsave / unfavourite | `Unfavorite` | `E8D9` | `&#xE8D9;` | `Symbol="UnFavorite"` |
| star (outline) | `FavoriteStar` | `E734` | `&#xE734;` | `Symbol="Favorite"` |
| star (filled) | `FavoriteStarFill` | `E735` | `&#xE735;` | none (Fluent-only) |
| image / gallery | `Picture` | `E8B9` | `&#xE8B9;` | `Symbol="Pictures"` |
| photo | `Photo` | `E91B` | `&#xE91B;` | unknown |
| camera | `Camera` | `E722` | `&#xE722;` | `Symbol="Camera"` |
| close / dismiss (×) | `Cancel` | `E711` | `&#xE711;` | `Symbol="Cancel"` |
| window close (×) | `ChromeClose` | `E8BB` | `&#xE8BB;` | unknown |
| send / post | `Send` | `E724` | `&#xE724;` | `Symbol="Send"` |
| send (filled) | `SendFill` | `E725` | `&#xE725;` | unknown |
| refresh | `Refresh` | `E72C` | `&#xE72C;` | `Symbol="Refresh"` |
| edit / pencil | `Edit` | `E70F` | `&#xE70F;` | `Symbol="Edit"` |
| delete / trash | `Delete` | `E74D` | `&#xE74D;` | `Symbol="Delete"` |
| remove | `Remove` | `E738` | `&#xE738;` | `Symbol="Remove"` |
| filter | `Filter` | `E71C` | `&#xE71C;` | `Symbol="Filter"` |
| chevron down | `ChevronDown` | `E70D` | `&#xE70D;` | unknown (Fluent-only) |
| chevron right | `ChevronRight` | `E76C` | `&#xE76C;` | unknown |
| chevron up / left | `ChevronUp` / `ChevronLeft` | `E70E` / `E76B` | `&#xE70E;` / `&#xE76B;` | unknown |
| chevron small | `ChevronDownSmall` / `ChevronRightSmall` | `E96E` / `E970` | `&#xE96E;` / `&#xE970;` | unknown |
| chevron medium | `ChevronDownMed` / `ChevronRightMed` | `E972` / `E974` | `&#xE972;` / `&#xE974;` | unknown |
| menu / hamburger | `GlobalNavButton` | `E700` | `&#xE700;` | `Symbol="GlobalNavigationButton"` |
| theme toggle (gallery header) | `Light` | `E793` | `&#xE793;` | unknown |
| mail | `Mail` | `E715` | `&#xE715;` | `Symbol="Mail"` |
| globe / web | `Globe` | `E774` | `&#xE774;` | `Symbol="Globe"` |
| link | `Link` | `E71B` | `&#xE71B;` | `Symbol="Link"` |
| accept / check | `Accept` | `E8FB` | `&#xE8FB;` | `Symbol="Accept"` |
| flag / report | `Flag` | `E7C1` | `&#xE7C1;` | `Symbol="Flag"` |

Notes that matter:

- **No `Person`, `Favorite`, `Close` names exist** in the Fluent dataset; the equivalents are
  `Contact`/`People`/`Accounts`, `FavoriteStar`/`FavoriteStarFill`, `Cancel`/`ChromeClose`.
  `Symbol="Favorite"` renders `0xE734` (outline star); the filled `0xE735` has no `Symbol` enum value,
  so use `FontIcon Glyph="&#xE735;"` — which is exactly what the gallery header does
  (`'\uE735'` when favourited, `'\uE734'` when not).
- **There is no bookmark-ribbon glyph** in this dataset; `Bookmarks (E8A4)` is a list-with-dots
  icon. If the design needs a ribbon, `PathIcon` is the only accurate option.
- `SymbolIcon` cannot be sized — for 12/16/24/32px icons use `FontIcon` (+ `FontSize`).
- Icons inherit `color`, so tint with `Foreground="{ThemeResource TextFillColorPrimaryBrush}"` or
  plain CSS `color:`; `.win-icon-element { color: inherit }`.

## B2. Typography

Ramp implemented in `components\TextBlock.vue` (~lines 515-573) and mirrored by the gallery table in
`TypographyPage.vue` + `TypographyRow.vue`. Class names follow the pattern
**`.win-text-block.<StyleName>`** — they are applied automatically when
`Style="{StaticResource <Name>}"` / `Style="{ThemeResource <Name>}"` is set (`TextBlock.vue`
resolves the style resource to a class name and adds it next to `win-text-block`). The
`<style>` block is **global** (not scoped), so `.win-text-block.CaptionTextBlockStyle` can also be
applied by hand on any element that carries both classes.

| Type ramp | Resource / style name (exact) | CSS class | Size | Weight | Line height | Variable font |
| --- | --- | --- | --- | --- | --- | --- |
| Caption | `CaptionTextBlockStyle` | `.win-text-block.CaptionTextBlockStyle` | 12px | 400 | 16px | Small, Regular |
| Body | `BodyTextBlockStyle` | `.win-text-block.BodyTextBlockStyle` | 14px | 400 | 20px | Text, Regular |
| Body Strong | `BodyStrongTextBlockStyle` | `.win-text-block.BodyStrongTextBlockStyle` | 14px | 600 | 20px | Text, SemiBold |
| Body Large | `BodyLargeTextBlockStyle` | `.win-text-block.BodyLargeTextBlockStyle` | 18px | 400 | 24px | Text, Regular |
| Body Large Strong | `BodyLargeStrongTextBlockStyle` | `.win-text-block.BodyLargeStrongTextBlockStyle` | 18px | 600 | 24px | Text, SemiBold |
| Subtitle | `SubtitleTextBlockStyle` | `.win-text-block.SubtitleTextBlockStyle` | 20px | 600 | 28px | Display, SemiBold |
| Title | `TitleTextBlockStyle` | `.win-text-block.TitleTextBlockStyle` | 28px | 600 | 36px | Display, SemiBold |
| Title Large | `TitleLargeTextBlockStyle` | `.win-text-block.TitleLargeTextBlockStyle` | 40px | 600 | 52px | Display, SemiBold |
| Display | `DisplayTextBlockStyle` | `.win-text-block.DisplayTextBlockStyle` | 68px | 600 | 92px | Display, SemiBold |

Additional styles handled by the same `typographyStyles` set:

| Style | CSS class | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| `BaseTextBlockStyle` | `.win-text-block.BaseTextBlockStyle` | 14px | 600 | 20px |
| `OutputTextBlockStyle` | `.win-text-block.OutputTextBlockStyle` | 14px | 400 | 20px (+`margin: 8px 0 0 8px`) |

Baseline `.win-text-block` defaults: `font-family: var(--ContentControlThemeFontFamily, 'Segoe UI
Variable', 'Segoe UI', system-ui, sans-serif)`, `font-size: var(--ControlContentThemeFontSize,
14px)`, `line-height: 20px`, `color: var(--text-primary)`, `white-space: nowrap`.

Other typography tokens:

- `--ContentControlThemeFontFamily: "Segoe UI Variable Text", "Segoe UI", sans-serif`
- `--ControlContentThemeFontSize` — not defined in `theme.css`; every consumer uses the fallback
  `14px`, and the compact density dictionary sets it to `14` (no visual change).
- Text scale: `FontIcon` multiplies `FontSize` by `var(--TextScaleFactor, 1)` (fallback `1`);
  `TextBlock` has `IsTextScaleFactorEnabled` (default `true`).
- Style names get `TextWrapping:"Wrap"`, `TextTrimming:"CharacterEllipsis"`,
  `LineStackingStrategy:"MaxHeight"`, `TextLineBounds:"Full"` injected by `TextBlock.vue`.
- `TextBlock` props (commonly used): `Text`, `Style`, `FontFamily`, `FontSize`, `FontWeight`,
  `FontStyle`, `FontStretch`, `CharacterSpacing`, `Foreground`, `LineHeight`, `TextWrapping`,
  `TextTrimming`, `TextAlignment`, `MaxLines`, `IsTextSelectionEnabled`, `Padding`, `Margin`,
  `HorizontalAlignment`, `VerticalAlignment`, `Width`/`Height`, `Visibility`, `Opacity`.
- `TypographyPage.vue` also has **scoped** demo classes (`.caption`, `.body`, `.body-strong`,
  `.body-large`, `.body-large-strong`, `.subtitle`, `.title`, `.title-large`, `.display` inside
  `.example-text`) — those are local to `TypographyRow.vue`, not global tokens. Do not reuse them.
- Gallery page chrome (`.page-title` 28px/600, `.section-title` 20px/600, `.page-description`
  14px, `--text-secondary`) is defined per page, not as a shared design token.

## B3. Color & theme

### B3.1 How the theme is switched

- **Attribute/class on `<html>`**: `theme-light` or `theme-dark` (`html.theme-light`,
  `html.theme-dark`). Nothing else is toggled; every token is a CSS custom property re-declared per
  scope.
- **App code**: `App.vue` → `applyTheme(mode)` (line 915) does
  `html.classList.remove('theme-light','theme-dark')` then `html.classList.add('theme-' + resolved)`,
  where `mode` comes from `themeSetting` = `localStorage['winui-theme-setting']`, values
  `'system' | 'light' | 'dark'` (default `'system'`); `'system'` resolves through
  `matchMedia('(prefers-color-scheme: dark)')`. Per-page theme toggles use
  `createPageState(pageKey).toggleTheme` / `pageTheme` (`utils\pageState.js`) and pass
  `Theme`/`RequestedTheme` down to the example.
- **No class at all** → `:root` carries the light values and
  `@media (prefers-color-scheme: dark) :root` supplies dark, so dark mode also works without JS.
- **Sub-tree scopes** (same token set re-declared): `.win-theme-scope.theme-light|.theme-dark`,
  `.example-theme-wrapper.theme-light|.theme-dark`, and `[data-theme="light"|"dark"]` (read by
  `AcrylicBrush.ts`, `themeShadowVisual.ts`, `MenuFlyoutPresenter.ts`, `ThemeWrapper.vue`).
  `RequestedTheme="Light"|"Dark"` on an icon/control sets
  `class="win-theme-scope theme-light|theme-dark"` + `data-theme`.
- **ResourceDictionary theme keys**: `Default` (light), `Dark`, `HighContrast`.

### B3.2 Text / accent / surface / stroke / control-fill tokens

Two parallel naming layers exist: **short aliases** (`--text-primary`, `--card-bg`, `--ctrl-fill-*`)
and **WinUI brush names** (`--TextFillColorPrimaryBrush`, `--CardBackgroundFillColorDefaultBrush`,
`--ControlFillColorDefaultBrush`). Both are live; prefer the WinUI names in this app for parity with
the gallery samples, or the short aliases for brevity. Light values below come from the `:root` /
`html.theme-light` blocks of `styles\theme.css`; dark from
`@media (prefers-color-scheme: dark) :root` / `html.theme-dark`; `--ControlFillColor*Brush`,
`--Button*`, `--ControlElevationBorderBrush` come from `styles\buttonResources.css`.

#### Text fill

| Variable | Light | Dark |
| --- | --- | --- |
| `--text-primary` | `rgba(0, 0, 0, 0.89)` | `#FFFFFF` |
| `--text-secondary` | `rgba(0, 0, 0, 0.62)` | `rgba(255, 255, 255, 0.77)` |
| `--text-tertiary` | `rgba(0, 0, 0, 0.45)` | `rgba(255, 255, 255, 0.53)` |
| `--text-disabled` | `rgba(0, 0, 0, 0.36)` | `rgba(255, 255, 255, 0.36)` |
| `--TextFillColorPrimaryBrush` | `rgba(0, 0, 0, 0.89)` | `#FFFFFF` |
| `--TextFillColorSecondaryBrush` | `rgba(0, 0, 0, 0.62)` | `rgba(255, 255, 255, 0.77)` |
| `--TextFillColorTertiaryBrush` | `rgba(0, 0, 0, 0.447059)` | `rgba(255, 255, 255, 0.529412)` |
| `--TextFillColorDisabledBrush` | `rgba(0, 0, 0, 0.36)` | `rgba(255, 255, 255, 0.36)` |
| `--TextFillColorInverseBrush` | `#FFFFFF` | `rgba(0, 0, 0, 0.89)` |
| `--TextOnAccentFillColorPrimaryBrush` | `#FFFFFF` | `#000000` |
| `--TextOnAccentFillColorSecondaryBrush` | `rgba(255, 255, 255, 0.70)` | `rgba(0, 0, 0, 0.50)` |
| `--TextOnAccentFillColorDisabledBrush` | `#FFFFFF` | `rgba(255, 255, 255, 0.53)` |
| `--SystemControlForegroundBaseMediumBrush` | `rgba(0, 0, 0, 0.60)` | `rgba(255, 255, 255, 0.60)` |
| `--SystemControlPageTextBaseMediumBrush` | `rgba(0, 0, 0, .6)` | `rgba(255, 255, 255, .6)` |
| `--SystemControlDisabledBaseMediumLowBrush` | `rgba(0, 0, 0, 0.40)` | `rgba(255, 255, 255, 0.40)` |
| `--SystemBaseHighColor` / `--SystemControlForegroundBaseHighBrush` | `#000000` | `#FFFFFF` |
| `--SystemControlForegroundAltHighBrush` | `#FFFFFF` | `#000000` |

#### Accent

| Variable | Light | Dark |
| --- | --- | --- |
| `--accent-base` | `#0067C0` → `var(--winui-system-accent-color-light, var(--winui-system-accent-color, #0067C0))` | `#4CC2FF` → `var(--winui-system-accent-color-dark, var(--winui-system-accent-color, #4CC2FF))` |
| `--accent` | `var(--accent-base)` | `var(--accent-base)` |
| `--accent-hover` | `rgba(0, 103, 192, 0.90)` | `rgba(96, 205, 255, 0.90)` |
| `--accent-pressed` | `rgba(0, 103, 192, 0.80)` | `rgba(96, 205, 255, 0.80)` |
| `--accent-fill-disabled` | `rgba(0, 0, 0, 0.22)` | `rgba(255, 255, 255, 0.16)` |
| `--accent-text` | `#FFFFFF` | `#000000` |
| `--accent-text-secondary` | `rgba(255, 255, 255, 0.70)` | `rgba(0, 0, 0, 0.50)` |
| `--accent-text-fill-color-primary` | `#0D4897` | `#99EBFF` |
| `--accent-aa-fill` | `#004E8C` | `#79D2FF` (dark) / `var(--SystemAccentColorLight2, #79D2FF)` |
| `--accent-aa-text` | `#FFFFFF` | `#000000` |
| `--accent-border` | `rgba(255, 255, 255, 0.078431)` | `rgba(0, 0, 0, 0.137255)` |
| `--accent-border-accent` | `rgba(0, 0, 0, 0.40)` | `rgba(255, 255, 255, 0.078431)` |
| `--AccentFillColorDefaultBrush` | `#0067C0` | `#4CC2FF` |
| `--AccentFillColorSecondaryBrush` | `rgba(0, 103, 192, 0.90)` | `rgba(76, 194, 255, 0.90)` |
| `--AccentFillColorTertiaryBrush` | `rgba(0, 103, 192, 0.80)` | `rgba(76, 194, 255, 0.80)` |
| `--AccentFillColorDisabledBrush` | `rgba(0, 0, 0, 0.22)` | `rgba(255, 255, 255, 0.16)` |
| `--AccentTextFillColorPrimaryBrush` | `var(--SystemAccentColorDark2, var(--accent-text-fill-color-primary))` | `var(--SystemAccentColorLight3, …)` |
| `--AccentTextFillColorSecondaryBrush` | `var(--SystemAccentColorDark3, #003e92)` | `var(--SystemAccentColorLight3, …)` |
| `--AccentTextFillColorTertiaryBrush` | `var(--SystemAccentColorDark1, var(--AccentFillColorDefaultBrush))` | `var(--SystemAccentColorLight2, …)` |
| `--AccentTextFillColorDisabledBrush` | `#0000005c` | `#ffffff5d` |
| `--SystemAccentColor` | `var(--winui-system-accent-color-light, var(--winui-system-accent-color, var(--accent-base)))` | `var(--winui-system-accent-color, var(--accent-base))` |
| `--SystemColorHighlightColor` | `var(--accent-base)` | `var(--accent-base)` |
| `--SystemColorHighlightTextColor` | `var(--accent-aa-text)` | `var(--accent-aa-text)` |
| `--SystemControlBackgroundAccentBrush` | `var(--SystemAccentColor)` | `var(--SystemAccentColor)` |
| `--AccentAAFillColorDefaultBrush` | `var(--AccentFillColorDefaultBrush)` | same |
| `--SystemFillColorAttentionBrush` | `#0067C0` / `var(--accent-base)` | `#4CC2FF` / `var(--accent-base)` |

Accent shades (derived with `color-mix` when supported):

| Variable | Light | Dark |
| --- | --- | --- |
| `--SystemAccentColorLight1` | `color-mix(in srgb, var(--SystemAccentColor) 80%, white)` | `82%` |
| `--SystemAccentColorLight2` | `60%` white | `64%` white |
| `--SystemAccentColorLight3` | `40%` white | `46%` white |
| `--SystemAccentColorDark1` | `86%` accent + black | `86%` |
| `--SystemAccentColorDark2` | `68%` | `68%` |
| `--SystemAccentColorDark3` | `50%` | `50%` |

#### Card / layer / background

| Variable | Light | Dark |
| --- | --- | --- |
| `--app-bg` | `#F3F3F3` | `#202020` |
| `--layer-default` | `rgba(255, 255, 255, 0.50)` | `rgba(58, 58, 58, 0.30)` |
| `--layer-fill-color-default` | `var(--layer-default)` | same |
| `--layer-on-acrylic-fill-color-default` | `var(--layer-default)` | same |
| `--LayerFillColorDefault` | `#ffffff80` | `#3a3a3a4c` |
| `--LayerFillColorAltBrush` | `#FFFFFF` | `rgba(255, 255, 255, 0.051)` |
| `--card-bg` | `rgba(255, 255, 255, 0.70)` | `rgba(255, 255, 255, 0.0512)` |
| `--card-bg-secondary` | `rgba(246, 246, 246, 0.50)` | `rgba(255, 255, 255, 0.0326)` |
| `--CardBackgroundFillColorDefaultBrush` | `rgba(255, 255, 255, 0.70)` | `rgba(255, 255, 255, 0.0512)` |
| `--CardBackgroundFillColorSecondaryBrush` | `rgba(246, 246, 246, 0.50)` | `rgba(255, 255, 255, 0.0326)` |
| `--SolidBackgroundFillColorBaseBrush` | `#F3F3F3` | `#202020` |
| `--SolidBackgroundFillColorTertiaryBrush` | `#F9F9F9` | `#282828` |
| `--NavigationViewContentBackground` | `var(--LayerFillColorDefaultBrush, var(--layer-default))` | same |
| `--flyout-bg` / `--flyout-background` / `--host-flyout-bg` | `rgba(252, 252, 252, 0.92)` | `rgba(44, 44, 44, 0.86)` |
| `--AcrylicInAppFillColorDefaultBrush` | `var(--flyout-bg)` | `var(--flyout-bg)` |
| `--ToolTipBackgroundBrush` | `var(--AcrylicInAppFillColorDefaultBrush)` | same |
| `--ToolTipForegroundBrush` | `var(--TextFillColorPrimaryBrush)` | same |
| `--SmokeFillColorDefaultBrush` | `rgba(0, 0, 0, 0.302)` | `rgba(0, 0, 0, 0.302)` |
| `--dialog-background` / `--ContentDialogBackground` | `#FCFCFC` / `#F3F3F3` | `#2C2C2C` / `#202020` |
| `--dialog-button-bg` / `--ContentDialogCommandSpaceBackground` | `#F3F3F3` | `#202020` |
| `--host-nav-pane-bg` | `color-mix(in srgb, var(--app-bg) 64%, transparent)` | `… 56% …` |

#### Stroke

| Variable | Light | Dark |
| --- | --- | --- |
| `--ctrl-border` | `rgba(0, 0, 0, 0.058824)` | `rgba(255, 255, 255, 0.070588)` |
| `--ctrl-border-rest` | `rgba(0, 0, 0, 0.06)` | `rgba(0, 0, 0, 0.07)` |
| `--ctrl-border-accent` | `rgba(0, 0, 0, 0.160784)` | `rgba(255, 255, 255, 0.094118)` |
| `--ControlStrokeColorDefaultBrush` | `var(--ctrl-border)` | `var(--ctrl-border)` |
| `--ControlStrokeColorSecondaryBrush` | `var(--ctrl-border-accent)` | `var(--ctrl-border-accent)` |
| `--ControlStrokeColorOnAccentDefaultBrush` | `var(--accent-border)` | `var(--accent-border-accent)` |
| `--ControlStrokeColorOnAccentSecondaryBrush` | `var(--accent-border-accent)` | `var(--accent-border)` |
| `--card-stroke` / `--CardStrokeColorDefaultBrush` | `rgba(0, 0, 0, 0.06)` / `#0000000f` | `rgba(0, 0, 0, 0.10)` / `#00000019` |
| `--stroke-divider` / `--divider-stroke` / `--divider-stroke-default` / `--divider-stroke-color-default` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.08)` |
| `--DividerStrokeColorDefaultBrush` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.08)` |
| `--stroke-surface-flyout` / `--surface-stroke-color-flyout` | `rgba(0, 0, 0, 0.06)` | `rgba(0, 0, 0, 0.20)` |
| `--SurfaceStrokeColorFlyoutBrush` | `rgba(0, 0, 0, 0.0588235)` | `rgba(0, 0, 0, 0.20)` |
| `--SurfaceStrokeColorDefaultBrush` | `rgba(117, 117, 117, 0.4)` | `rgba(117, 117, 117, 0.4)` |
| `--divider-default` | **undefined** (use `--divider-stroke`) | — |
| `--ControlElevationBorderBrush` | **not defined in light** | `linear-gradient(180deg, rgba(255, 255, 255, 0.094118) 0.99px, rgba(255, 255, 255, 0.070588) 3px)` |
| `--AccentControlElevationBorderBrush` | **not defined in light** | `linear-gradient(0deg, rgba(0, 0, 0, 0.137255) 0.99px, rgba(255, 255, 255, 0.078431) 3px)` |
| `--TextControlElevationBorderBrush` | `linear-gradient(180deg, var(--ControlStrokeColorSecondaryBrush) 0px, var(--ControlStrokeColorDefaultBrush) 2px, var(--ControlStrokeColorDefaultBrush) 100%)` | same |
| `--AccentControlElevationBorderBottomBrush` | `rgba(0, 0, 0, 0.40)` | `rgba(255, 255, 255, 0.0784)` |

#### Control fill

| Variable | Light | Dark |
| --- | --- | --- |
| `--ctrl-fill-default` | `rgba(255, 255, 255, 0.70)` | `rgba(255, 255, 255, 0.0605)` |
| `--ctrl-fill-secondary` | `rgba(249, 249, 249, 0.50)` | `rgba(255, 255, 255, 0.0837)` |
| `--ctrl-fill-tertiary` | `rgba(249, 249, 249, 0.30)` | `rgba(255, 255, 255, 0.0326)` |
| `--ctrl-fill-disabled` | `rgba(249, 249, 249, 0.30)` | `rgba(255, 255, 255, 0.0419)` |
| `--ctrl-fill-input-active` | `#FFFFFF` | `rgba(30, 30, 30, 0.70)` |
| `--control-fill-input-active` / `--control-fill-color-input-active` | `var(--ctrl-fill-input-active)` | same |
| `--ctrl-strong-fill` / `--ControlStrongFillColorDefaultBrush` | `rgba(0, 0, 0, 0.45)` | `rgba(255, 255, 255, 0.54)` |
| `--ctrl-strong-fill-disabled` / `--ControlStrongFillColorDisabledBrush` | `rgba(0, 0, 0, 0.32)` | `rgba(255, 255, 255, 0.25)` |
| `--ctrl-strong-stroke` / `--ControlStrongStrokeColorDefaultBrush` | `rgba(0, 0, 0, 0.45)` | `rgba(255, 255, 255, 0.545)` |
| `--ctrl-strong-stroke-disabled` / `--ControlStrongStrokeColorDisabledBrush` | `rgba(0, 0, 0, 0.22)` | `rgba(255, 255, 255, 0.157)` |
| `--ctrl-solid-fill` / `--ControlSolidFillColorDefaultBrush` | `#FFFFFF` | `#454545` |
| `--ControlOnImageFillColorDefaultBrush` | `#ffffffc9` | `#1c1c1cb3` |
| `--ctrl-elevation-top` / `-_bottom` | `rgba(255, 255, 255, 0.08)` / `rgba(0, 0, 0, 0.16)` | `rgba(255, 255, 255, 0.0941)` / `rgba(255, 255, 255, 0.0706)` |
| `--ControlFillColorTransparentBrush` | `transparent` | `transparent` |
| `--ControlFillColorDefaultBrush` | `rgba(255, 255, 255, 0.701961)` | `rgba(255, 255, 255, 0.058824)` |
| `--ControlFillColorSecondaryBrush` | `rgba(249, 249, 249, 0.501961)` | `rgba(255, 255, 255, 0.082353)` |
| `--ControlFillColorTertiaryBrush` | `rgba(249, 249, 249, 0.301961)` | `rgba(255, 255, 255, 0.031373)` |
| `--ControlFillColorDisabledBrush` | `rgba(249, 249, 249, 0.301961)` | `rgba(255, 255, 255, 0.043137)` |
| `--ControlFillColorInputActiveBrush` | **not defined** (use `--ctrl-fill-input-active`) | — |
| `--subtle-secondary` / `--SubtleFillColorSecondaryBrush` | `rgba(0, 0, 0, 0.0373)` / `rgba(0, 0, 0, 0.04)` | `rgba(255, 255, 255, 0.0605)` / `rgba(255, 255, 255, 0.06)` |
| `--subtle-tertiary` / `--SubtleFillColorTertiaryBrush` | `rgba(0, 0, 0, 0.0241)` | `rgba(255, 255, 255, 0.0419)` |
| `--subtle-pressed` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.03)` |
| `--subtle-transparent` / `--SubtleFillColorTransparentBrush` | `transparent` | `transparent` |
| `--CheckBoxCheckBackgroundFillUnchecked` | `#C9FFFFFF` | `#B31C1C1C` |
| `--toggle-border` / `--radio-border` | `rgba(0, 0, 0, 0.45)` | `rgba(255, 255, 255, 0.54)` |
| `--toggle-thumb` / `--toggle-thumb-hover` / `--toggle-on-thumb` | `rgba(0, 0, 0, 0.61)` / `rgba(0, 0, 0, 0.89)` / `#FFFFFF` | `rgba(255, 255, 255, 0.79)` / `#FFFFFF` / `#000000` |

> Load order matters: `main.ts` imports `styles\theme.css` first and `styles\buttonResources.css`
> later, so `buttonResources.css` wins for the variables it re-declares
> (`--TextFillColorPrimaryBrush: rgba(0, 0, 0, 0.894118)`,
> `--SubtleFillColorSecondaryBrush: rgba(0, 0, 0, 0.035294)`, `--ControlFillColor*Brush`,
> `--Button*`, `--ControlElevationBorderBrush` in dark). Values above are the theme.css values unless
> the row says otherwise.

#### Signal (system) colors

| Variable | Light | Dark |
| --- | --- | --- |
| `--SystemFillColorSuccessBrush` | `#0F7B0F` | `#6CCB5F` |
| `--SystemFillColorCautionBrush` | `#9D5D00` | `#FCE100` |
| `--SystemFillColorCriticalBrush` | `#C42B1C` | `#FF99A4` |
| `--SystemFillColorSolidNeutralBrush` | `#8A8A8A` | `#9D9D9D` |
| `--SystemFillColorAttentionBackgroundBrush` | `rgba(246, 246, 246, 0.50)` | `rgba(255, 255, 255, 0.0314)` |
| `--SystemFillColorSuccessBackgroundBrush` | `#DFF6DD` | `#393D1B` |
| `--SystemFillColorCautionBackgroundBrush` | `#FFF4CE` | `#433519` |
| `--SystemFillColorCriticalBackgroundBrush` | `#FDE7E9` | `#442726` |
| `--SystemFillColorSolidNeutralBackgroundBrush` | `#F3F3F3` | `#2E2E2E` |

#### Names that do **not** exist (avoid)

`--accent-default` (referenced by `TypographyPage.vue` `.link`, `IconographyPage.vue`,
`CalendarView.vue`, `pivotResources.ts`, `tabViewStyles.css` — never defined, so those declarations
are dropped; use `--accent-base` or `--AccentFillColorDefaultBrush`), `--divider-default`,
`--card-background-fill`, `--card-background-fill-secondary`, `--control-fill-default`,
`--control-stroke-default`, `--control-stroke-secondary`, `--card-stroke-default`,
`--system-fill-caution`, `--system-fill-caution-background`, `--subtle-fill-secondary`,
`--background-layer`, `--background-solid-tertiary`, `--ControlFillColorInputActiveBrush`.

High contrast: `HighContrastColorSection.vue` states high-contrast brushes "are not exposed as CSS
variables in this web implementation yet"; `@media (forced-colors: active)` blocks only remap a few
focus/accent/InfoBar variables.

### B3.3 Accent color API

```ts
import {
  connectSystemAccentColorHost,
  createBrowserSystemAccentColorHostAdapter,
} from 'winuionweb'

export interface SystemAccentColorPalette {
  AccentColor: string
  LightThemeAccentColor?: string
  DarkThemeAccentColor?: string
  LightThemeTextColor?: string
  DarkThemeTextColor?: string
  AccentColorLight1?: string; AccentColorLight2?: string; AccentColorLight3?: string
  AccentColorDark1?: string;  AccentColorDark2?: string;  AccentColorDark3?: string
}

export interface SystemAccentColorHostAdapter {
  Read(): SystemAccentColorPalette | null
  Subscribe(listener: (palette: SystemAccentColorPalette | null) => void): () => void
}

// writes the palette onto <html> (default target) and returns a disposer
const disconnect = connectSystemAccentColorHost(createBrowserSystemAccentColorHostAdapter(), document.documentElement)
disconnect()
```

- `connectSystemAccentColorHost(adapter, target = document.documentElement)` sets inline custom
  properties on `target`, restores the previous inline values on `disconnect()`, and replaces any
  prior connection on the same element.
- Variables written: `--winui-system-accent-color`, `--winui-system-accent-color-light`,
  `--winui-system-accent-color-dark`, `--winui-system-accent-text-light`,
  `--winui-system-accent-text-dark`, `--winui-system-accent-hover-light|dark`,
  `--winui-system-accent-pressed-light|dark`, `--winui-system-accent-text-secondary-light|dark`,
  `--winui-system-accent-light-1|2|3`, `--winui-system-accent-dark-1|2|3`.
- Derivation when the palette omits shades: light1..3 = accent mixed 20/40/60 % with white,
  dark1..3 = accent mixed 14/32/50 % with black; hover/pressed = accent at 0.9/0.8 alpha; contrast
  text auto-picked (`#FFFFFF` or `#000000`) from relative luminance.
- Static defaults in `theme.css` when nothing is connected: `--winui-system-accent-color: #0067C0`,
  `--winui-system-accent-color-dark: #4CC2FF`, and
  `@supports (color: AccentColor) { :root { --winui-system-accent-color: AccentColor } }`
  (likewise `AccentColorText` → `--winui-system-accent-text-light`).
- `createBrowserSystemAccentColorHostAdapter(owner?: Window)` polls the CSS `AccentColor` system
  color every 1500 ms (plus `visibilitychange` / `focus` / `pageshow`) and returns
  `{ Read, Subscribe }`.

## B4. Sizing

### B4.1 Standard vs compact

Compact is enabled by placing the density dictionary in page resources:

```xml
<Page.Resources>
  <ResourceDictionary Source="ms-appx:///Microsoft.UI.Xaml/DensityStyles/Compact.xaml" />
</Page.Resources>
```

`xamlPrimitives.ts` recognises exactly that `Source` string and applies
`compactDensityResources`, converting each numeric value to a CSS variable `--<Key>: <n>px`
(`primitiveResourceStyles`) on the scope (4-number XAML thicknesses are reordered
`left,top,right,bottom` → CSS).

| Token | Standard | Compact |
| --- | --- | --- |
| `TextControlThemeMinHeight` | **32** | **24** |
| `TextControlThemeMinWidth` | **64** | — |
| `TextControlThemePadding` | `10,5,6,6` | `2,2,6,1` |
| `TextControlBorderThemeThickness` | `1` | — |
| `TextControlBorderThemeThicknessFocused` | `1,1,1,2` | — |
| `ComboBoxMinHeight` | **32px** (`var(--ComboBoxMinHeight, 32px)`) | **24** |
| `ComboBoxPadding` | — (not in compact dict) | `12,1,0,3` |
| `ComboBoxEditableTextPadding` | — | `10,0,30,0` |
| `ListViewItemMinHeight` | **40** (`xamlRuntime.ts` gridLengthResources) | **32** |
| `ListViewItemMinWidth` | **88** | — |
| `TreeViewItemMinHeight` | **28** | **24** |
| `TreeViewItemMultiSelectCheckBoxMinHeight` | **28** | **24** |
| `TreeViewItemContentHeight` | **20** | 20 (unchanged) |
| `TreeViewItemPresenterPadding` | `3px 0 5px 0` | `0` |
| `TreeViewItemPresenterMargin` | — | `0` |
| `NavigationViewItemOnLeftMinHeight` | **36** | **32** |
| `ControlContentThemeFontSize` / `ContentControlFontSize` | 14 (consumers use `var(…, 14px)`) | 14 |
| `DatePickerHostPadding` / `TimePickerHostPadding` | — | `0,1,0,2` |
| `DatePickerHostMonthPadding` | — | `9,0,0,1` |
| `Button` | padding `5px 11px 6px 11px` (theme) / `5px 11px 6px` (inline fallback), border 1px, `line-height: 19px` → 32px tall | compact dict does not change Button |
| CommandBar / AppBar | `AppBarThemeMinHeight` **64** | `AppBarThemeCompactHeight` **48** |
| TitleBar | `TitleBarCompactHeight` **32** | — |
| NavigationView | `NavigationViewCompactPaneLength` **48**, `NavigationViewTopPaneHeight` **48**, `NavigationViewPaneHeaderRowMinHeight` **40**, `NavigationViewSelectionIndicatorWidth` **3**, `NavigationViewSelectionIndicatorHeight` **16** | `NavigationViewCompactPaneLength` stays 48 (its "compact" pane *mode*) |

Other fixed heights worth knowing: `--InfoBarMinHeight: 48px`, `--FlyoutThemeMinHeight: 40px`,
`--ContentDialogMinHeight: 184px` / max `756px`, `--TeachingTipMinHeight: 40px` / max `520px`,
`--ScrollBarSize: 12px` (thumb min length 30px), `--ProgressBarMinHeight: 3px`,
`--SplitButtonPrimaryButtonSize: 35px`, `--SelectorBarItemPillHeight: 3px`.

### B4.2 Corner radius tokens

| Token | Value | Where |
| --- | --- | --- |
| `--ControlCornerRadius` | **4px** | light **and** dark (`theme.css` 969 / 1141 / 1372) — the default for buttons, text boxes, items |
| `--OverlayCornerRadius` | **8px** | `:root` only (`theme.css` 781) — flyouts, dialogs, teaching tips, tabs |
| `--ComboBoxCornerRadius` | `var(--ControlCornerRadius, 4px)` | `comboBoxResources.css` |
| `--AppBarButtonCornerRadius` | `var(--ControlCornerRadius, 4px)` | `appBarStyles.css` (consumer fallback) |
| `--CommandBarCornerRadius` | `var(--ControlCornerRadius, 4px)` | `commandBarResources.css` (consumer fallback) |
| `--ButtonCornerRadius` | `4px` | local fallback inside `Button.vue` (`--ButtonCornerRadius: 4px`) |
| `--ScrollBarCornerRadius` | `3px` | `theme.css` |
| `--ProgressBarCornerRadius` | `1.5px` | `theme.css` |
| `--ProgressBarTrackCornerRadius` | `.5px` | `theme.css` |
| `--PivotHeaderItemSelectedPipeCornerRadius` | `1.5px` | `styles\pivot.css` |
| `--SplitViewPaneRootCornerRadius` | `0px` | `theme.css` |
| `--NavigationViewSelectionIndicatorRadius` | `2px` | `navigationViewResources.ts` |
| `--PersonPictureEllipseBadgeStrokeThickness` | `2px` (stroke, not radius) | `theme.css` |

There is **no** `--CardCornerRadius` / `--CardRadius` token: cards in the gallery use
`CornerRadius="8"` or `{ThemeResource OverlayCornerRadius}` written literally.

### B4.3 Spacing / padding conventions seen in the gallery

`{ThemeResource OverlayCornerRadius}` for overlays, `{StaticResource ControlCornerRadius}` for
controls (see `IconographyPage.vue`: `CornerRadius="{StaticResource ControlCornerRadius}"` on
`ItemContainer` + inner `Grid`), `Padding="16"` for card interiors, `ColumnSpacing`/`RowSpacing`
8–12, page header `Margin="0,0,72,8"` (72px reserves the theme/favourite buttons).

---

## Appendix — quick answers

| Question | Answer |
| --- | --- |
| Codepoint prop for `FontIcon` | `Glyph` |
| Codepoint prop for `SymbolIcon` | `Symbol` (enum name, e.g. `"Home"`) |
| Must I call `loadWinUIIconFont`? | No on Windows (`local('Segoe Fluent Icons')` faces ship in CSS); yes for a self-hosted font file — it registers one binary as 5 families and returns a disposer |
| Theme switch attribute | `class="theme-light" \| "theme-dark"` on `<html>`; stored in `localStorage['winui-theme-setting']` (`system`/`light`/`dark`) |
| Default accent | Light `#0067C0`, dark `#4CC2FF` (overridable via `connectSystemAccentColorHost`) |
| Accent color API | `connectSystemAccentColorHost(adapter, target?)`, `createBrowserSystemAccentColorHostAdapter()` |
| Default control corner radius | `--ControlCornerRadius: 4px`; overlays `--OverlayCornerRadius: 8px` |
| Standard text-control height | 32px (compact 24px) |
| Standard list item height | 40px (compact 32px) |
