# v1.0.1

A round of fixes after living with v1.0.0 for a few days, plus a rebuilt profile page.

## What's new

- **Profile pages rebuilt**: a sticky identity card on the left (banner, avatar, level, badges,
  inline stats, follow/edit action) with tabs and sections on the right, matching the original
  site's information architecture. The contribution heatmap now has month labels and a
  less/more legend, and the badge wall loads real artwork.
- **Message toasts rebuilt** on the library `InfoBar`: opaque surface, single-line text, proper
  rounding, and enter/exit/move transitions.
- **Floor deep links**: clicking a notification now jumps straight to the reply and highlights it
  instead of landing at the top of the thread.

## Fixes

- Notifications showed "系统" (system) for every row — the API nests actor/topic/post under `details`.
- Clicking a notification bounced to the forum list before showing the topic (the sidebar reacted
  to its own selection change).
- Context menu gained link actions: open link, open in new tab, copy link address, and open or copy
  a URL contained in the selected text.
- Removed a global scrollbar style that forced classic scrollbars (with arrows) onto text inputs.
- Long notification text no longer wraps inside the toast.

## Install

Unchanged: download the zip, extract it somewhere permanent (never `C:\Program Files`), enable
Developer mode on `chrome://extensions`, then **Load unpacked** and pick that folder.

Full guide: <https://ttummc.github.io/pickcat-winui3/>

> Only active on `pickcat.dao3.fun`. Disable the extension and the original site returns.
