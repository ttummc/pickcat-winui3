# v1.0.0

First usable release: [PickCat](https://pickcat.dao3.fun/)'s web UI is replaced entirely with an
application that looks and feels like Windows 11.

## Install

### Windows — one click

Download **[install-windows.bat](https://github.com/ttummc/pickcat-winui3/releases/latest/download/install-windows.bat)** and double-click it.

It downloads the latest build, extracts it to `%LOCALAPPDATA%\PickCatWinUI3`, opens
`chrome://extensions`, and copies the folder path to your clipboard. Then:

1. Turn on **Developer mode** (top right)
2. Click **Load unpacked**
3. Press <kbd>Ctrl</kbd>+<kbd>V</kbd> and confirm

### Any platform — four steps

1. Download **[PickCat-WinUI3-extension.zip](https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip)** and extract it somewhere permanent
   (do **not** leave it in a temp folder — Chrome needs the files to stay put)
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the extracted folder (the one containing `manifest.json`)

Then open <https://pickcat.dao3.fun/> — the new UI is already there.

> Only active on `pickcat.dao3.fun`. Disable the extension and the original site returns.

## What's in it

- **Real WinUI controls**: `TitleBar`, `NavigationView`, `SelectorBar`, `SettingsCard`,
  `ContentDialog`, `MenuFlyout`, `PipsPager`, `Expander`, `PersonPicture`, `InfoBar`, `ProgressRing`
- **Page transitions**: drill-in slides from the right, back slides from the left, siblings fade;
  list items rise in staggered
- **Context menu everywhere**: card actions, "copy selected text", page actions — including on empty space
- **Markdown editor**: toolbar, shortcuts (Ctrl+B/I/E/K), live preview, character/word count
- **Themes**: light / dark / follow system, four accent colours
- **14 pages**: home, forum, category, topic, compose, works, work detail, profile, notifications,
  search, personal file board, personal library, settings, sign-in

## Known limitations

- Pages that need an account (compose, notifications, file board) require signing in first; sign-in
  shows an Aliyun slider CAPTCHA
- Pages that have not been rebuilt (register, password reset, circles, create, entrance exam,
  moderation) show "this page has not been rebuilt yet" with an **Open on the original site** button
- All data and sessions come from the official API; the extension stores no user data

## Licence

GPL-3.0. The UI controls come from [WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb) (GPL-3.0).

Unofficial fan project. Not affiliated with PickCat.
