# Publishing

**English** · [简体中文](PUBLISH.zh-CN.md)

The repository is live at <https://github.com/ttummc/pickcat-winui3>.
CI builds the extension and attaches a zip to every `v*` tag — you never build the release by hand.

---

## Cutting a release

```powershell
# 1. bump the version in the manifest
#    extension/public/manifest.json -> "version": "1.0.1"

# 2. update the release notes (English is what CI attaches)
#    RELEASE_NOTES.md  (+ RELEASE_NOTES.zh-CN.md for the Chinese copy)

git add -A
git commit -m "release: v1.0.1"
git tag -a v1.0.1 -m "v1.0.1"

git push origin main
git push origin v1.0.1
```

Pushing the tag triggers `.github/workflows/build.yml`:

1. `npm ci`
2. `npm run ext:build`
3. zips `extension/dist` into `PickCat-WinUI3-extension.zip`
4. creates a GitHub Release from `v1.0.1`, attaches the zip, body taken from `RELEASE_NOTES.md`

Watch it at <https://github.com/ttummc/pickcat-winui3/actions>;
the result lands at <https://github.com/ttummc/pickcat-winui3/releases>.

### Moving a tag

If you need to re-run a release on a newer commit:

```powershell
git tag -fa v1.0.1 -m "v1.0.1"
git push --force origin v1.0.1
```

---

## What CI needs

| Requirement | Why |
| --- | --- |
| `permissions: contents: write` | New repositories give the workflow token read-only access; creating a Release needs write |
| `vendor/winuionweb-0.2.0.tgz` committed | `package.json` references it as a local file dependency; `npm ci` fails without it |
| `RELEASE_NOTES.md` present | Used as the release body |

---

## Repository settings that help

| Setting | Value |
| --- | --- |
| Description | A Windows 11 style client for PickCat, built with WinUI 3 controls (unofficial) |
| Topics | `winui3` `vue3` `chrome-extension` `pickcat` `fluent-design` |
| Social preview | `docs/store/marquee-1400x560.png` |

---

## Post-release checklist

- [ ] Release page serves the zip; it unpacks to `manifest.json` / `content.js` / `content.css` / `bridge.js` / `rules.json` / `icons/`
- [ ] The build badge in the README is green
- [ ] Download from the Release → load unpacked → <https://pickcat.dao3.fun/> renders the new UI

---

## Chrome Web Store

Not submitted yet. Read [STORE.md](STORE.md) first — it lists the three review blockers
(third-party script loaded at runtime, replacing another site's UI, trademark in the name) and the
changes each one needs.
