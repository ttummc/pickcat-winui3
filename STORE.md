# Store listing

**English** · [简体中文](STORE.zh-CN.md)

## ⚠️ Read this before submitting to the Chrome Web Store

The extension as it stands **cannot pass review**. Three hard blockers:

| Blocker | Detail | Fix |
| --- | --- | --- |
| **Remote code** | Sign-in loads and executes `AliyunCaptcha.js` from `o.alicdn.com` at runtime. MV3's *Remote code* policy forbids exactly this. | Stop loading third-party scripts at runtime: delegate sign-in to the original site (see below), or drop in-extension sign-in entirely. |
| **Replacing another site's UI** | `declarativeNetRequest` blocks `pickcat.dao3.fun/_nuxt/` so the original app cannot render. Reviewers may read this as *Deceptive behaviour* or impersonation. | State clearly that this is unofficial, and be ready to explain what it does and why it intercepts. Rejection is still possible. |
| **Trademark** | The name contains `PickCat`. | Get the site owner's permission, or use a neutral name and explain the target site in the description. |

**Recommendation: do not submit yet.**

- Ship through GitHub Releases plus "Load unpacked" instructions
- Or distribute internally via Windows Group Policy `ExtensionInstallForcelist` (needs a signed CRX)
- No review queue, no account risk — and GPL-3.0 requires publishing the source anyway

---

## Listing copy (ready to paste)

**Name (≤45 chars)**

```
PickCat WinUI 3 (unofficial)
```

**Short description (≤132 chars)**

```
Rebuilds pickcat.dao3.fun's interface from scratch with WinUI 3 controls: window, navigation, context menus, Markdown editor. Unofficial.
```

**Detailed description**

```
PickCat, rebuilt as a Windows 11 style application.

· Real WinUI 3 controls: TitleBar, NavigationView, SelectorBar, SettingsCard, ContentDialog,
  MenuFlyout, PipsPager, Expander, InfoBadge, ProgressRing…
· Page transitions: drill in from the right, back from the left, list items rise in staggered
· Context menu everywhere: card actions, copy selected text, page actions
· Light / dark / follow system, four accent colours
· 14 pages: home, forum, category, topic, compose, works, work detail, profile, notifications,
  search, personal file board, personal library, settings, sign-in

Only active on pickcat.dao3.fun. No data collection, no ads, no third-party sharing.
This is an unofficial fan project, not affiliated with PickCat.

Source (GPL-3.0): <repository URL>
```

**Category**: Social & Communication

**Permission justifications** (reviewers ask for each one)

- `host_permissions: https://pickcat.dao3.fun/*`
  > Used solely to inject the replacement UI into that one site and call its public API. No other
  > domains are requested.
- `declarativeNetRequest`
  > Blocks that site's own `/_nuxt/` frontend bundle so the original interface and the rewritten one
  > do not render on top of each other. `rules.json` contains a single rule scoped to
  > `pickcat.dao3.fun/_nuxt/`; nothing is reported or sent anywhere.

**Single purpose statement**

> Replace the web interface of pickcat.dao3.fun with a WinUI 3 style interface.

---

## Assets

| Use | Size | File |
| --- | --- | --- |
| Extension icon | 128×128 | `extension/public/icons/pickcat.png` |
| Store tile | 440×280 | `docs/store/tile-440x280.png` |
| Store marquee | 1400×560 | `docs/store/marquee-1400x560.png` |
| Screenshots | 1280×800 ×5 | `docs/store/screenshot-1..5.png` |
| Promo image | 1920×1080 | `docs/promo/pickcat-promo.png` |
| Promo video | 1440×900 MP4 | `docs/promo/pickcat-promo.mp4` |

---

## Pre-submission checklist

- [ ] `LICENSE` (GPL-3.0) and `THIRD_PARTY_NOTICES.md` published with the source
- [ ] Runtime third-party script removed (remote-code risk)
- [ ] `manifest.json` description ≤132 chars, `version` set to a release value
- [ ] Privacy policy URL publicly reachable (`PRIVACY.md` on GitHub Pages)
- [ ] Developer account verified ($5 registration fee)
- [ ] Test account supplied to reviewers (notifications and compose require sign-in)
