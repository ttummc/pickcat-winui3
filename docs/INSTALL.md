# Installation guide

**English** · [简体中文](INSTALL.zh-CN.md)

This guide installs the extension the way Chrome requires for a "Load unpacked" extension: a folder
on disk that Chrome keeps reading. Follow it top to bottom — the two things that break most often are
**where you put the folder** and **which folder you select**.

---

## 1. Requirements

| | |
| --- | --- |
| Browser | Chrome 111+ or Edge 111+ (any Chromium browser that still allows **Load unpacked**) |
| OS | Windows 10/11, macOS 11+, or Linux |
| Disk | ~6 MB |
| Account | Not required to browse. Signing in is only needed to post, read notifications, or open your file board |

Check your Chrome version at `chrome://version`. If it is older than 111, update Chrome first — the
extension uses a `MAIN`-world content script that older versions reject.

---

## 2. Where to put the folder

**Pick a normal user folder.** The extension is read from this location on every page load, so it must
stay put and stay readable.

✅ **Recommended (Windows)**

```
C:\Users\<your-name>\PickCatWinUI3
```

Paste this into the address bar of File Explorer to get there quickly:

```
%USERPROFILE%
```

…then create a folder named `PickCatWinUI3`.

✅ **Also fine**

- `D:\Apps\PickCatWinUI3` (any path on any drive that you own)
- `~/Applications/PickCatWinUI3` (macOS)
- `~/PickCatWinUI3` (Linux)

❌ **Do not use**

| Location | Why not |
| --- | --- |
| `C:\Program Files\…` | Protected directory. Chrome's ruleset loader fails on it and reports the misleading error `rules.json: Internal error while parsing rules` |
| `Downloads` | Browsers and cleaners empty this folder; the extension breaks silently when the files disappear |
| `Desktop` | Easy to delete by accident, and often synced |
| OneDrive / Dropbox / iCloud folders | Sync locks files and creates `xxx (1).js` duplicates; Chrome refuses to load a folder that changes under it |
| `%TEMP%` / `C:\Windows\…` | Deleted automatically, or not readable by the browser |

> **Already extracted into `C:\Program Files`?** Move it — cut the folder and paste it into
> `C:\Users\<your-name>\`, then load it from the new path. Do not just copy; remove the old one so you
> cannot re-select it by mistake.

---

## 3. Download

Download the latest build:

**<https://github.com/ttummc/pickcat-winui3/releases/latest>**

Click `PickCat-WinUI3-extension.zip` (about 1.6 MB).

---

## 4. Extract

Right-click the zip → **Extract All…** (Windows) / double-click it (macOS).

You will get a folder named `PickCat-WinUI3-extension` containing:

```
PickCat-WinUI3-extension\
├── manifest.json      ← must be at this level
├── content.js
├── content.css
├── bridge.js
├── rules.json
└── icons\
    └── pickcat.png
```

Move that folder into the location you chose in step 2 and rename it to `PickCatWinUI3` if you like.
The name does not matter; **`manifest.json` being directly inside it does**.

### Check before you continue

Open the folder. You must see `manifest.json` **in that window**, next to `content.js`. If instead you
see a single folder inside, you have a double-nested extraction — open it one level deeper and use
*that* folder.

---

## 5. Load it into Chrome

1. Go to `chrome://extensions` (Edge: `edge://extensions`)
2. Turn on **Developer mode** — top-right toggle on Chrome, left sidebar on Edge
3. Click **Load unpacked** (Chrome: top-left; Edge: top-left of the page)
4. Select the `PickCatWinUI3` folder — the one that contains `manifest.json` — and confirm

The card **PickCat WinUI 3（非官方重制）** appears in the list, with the toggle on.

> On macOS the button is labelled **Load unpacked** as well; select the folder itself, not a file
> inside it.

### If Chrome shows an error

| Message | Cause | Fix |
| --- | --- | --- |
| `rules.json: Internal error while parsing rules` | The folder is in a protected location (`C:\Program Files`, `C:\Windows`) or Chrome cannot read it | Move the folder into your user profile (step 2) and load it again |
| `Manifest file is missing or unreadable` | You selected the zip, or the wrong level of the folder | Select the folder that directly contains `manifest.json` |
| `Could not load background script` / file errors | Files were deleted, renamed, or are still syncing | Re-extract and load from a stable folder |
| Loads, but the card shows **Errors** | Usually an old build | Rebuild/re-download the latest release, then click ↻ on the card |

---

## 6. Verify it works

1. Open <https://pickcat.dao3.fun/> — you should see the Windows 11 style interface with a title bar,
   a left navigation pane, and the feed
2. If you still see the original website, press <kbd>Ctrl</kbd>+<kbd>R</kbd>
3. Still the original site? Confirm the extension card is **enabled**, and that the tab URL really is
   `pickcat.dao3.fun` (not a mirror or a different domain)

The extension only activates on `pickcat.dao3.fun`. On every other site it does nothing.

---

## 7. Optional: verify the download

Every release publishes `SHA256SUMS.txt` next to the zip.

Windows:

```powershell
certutil -hashfile PickCat-WinUI3-extension.zip SHA256
```

macOS / Linux:

```bash
shasum -a 256 PickCat-WinUI3-extension.zip
```

Compare against the value in `SHA256SUMS.txt` on the release page.

---

## 8. Updating

1. Download the new zip and extract it
2. Delete the **old** `PickCatWinUI3` folder, move the new one into the same place
   (or overwrite the files inside it)
3. Go to `chrome://extensions` and click ↻ on the extension card
4. Reload the site

Replacing files without clicking ↻ leaves Chrome running the previous build — that is why a freshly
updated extension can still look old.

---

## 9. Disabling / uninstalling

- **Temporarily off:** toggle the switch on the extension card, or open `chrome://extensions` →
  PickCat WinUI 3 → **Remove**
- **Restore the original site:** disable or remove the extension, then reload `pickcat.dao3.fun`. The
  original site comes back immediately — nothing on the site is modified by us
- **Full clean-up:** disable first, then delete the folder

---

## 10. First-run notes

- Pages that need an account (compose, notifications, file board) redirect you to sign in first. Sign-in
  shows an Aliyun slider CAPTCHA.
- Pages that have not been rebuilt yet (register, password reset, circles, create, entrance exam,
  moderation) show a notice with an **Open on the original site** button.
- The extension stores only two UI preferences, locally. It never reads your cookies or sends your data
  anywhere — see [PRIVACY.md](PRIVACY.md).

---

## Still stuck?

Open an issue with:

1. Your Chrome version (`chrome://version` first line)
2. The exact error text from `chrome://extensions`
3. The full path you loaded the folder from
