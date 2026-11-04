import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const URL = "http://127.0.0.1:8123/pickcat-winui3/";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => errors.push(String(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).split("\n")[0]));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });
await cdp.send("Page.navigate", { url: URL });
await sleep(6000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  titleBar: !!document.querySelector('.win-titlebar'),
  nav: !!document.querySelector('.win-navigation-view'),
  navItems: [...document.querySelectorAll('.win-navigation-view-item')].map(e => e.textContent.trim()),
  h1: document.querySelector('.pc-h1')?.textContent?.trim(),
  buttons: [...document.querySelectorAll('.pc-row .win-button')].map(b => b.textContent.trim()),
  infobar: !!document.querySelector('.win-infobar'),
  heroImg: (() => { const i = document.querySelector('.pc-hero-shot img'); return i ? { ok: i.naturalWidth > 0, w: i.naturalWidth } : null })(),
  chips: [...document.querySelectorAll('.pc-chip')].map(c => c.textContent.trim())
})`));
console.log("errors:", errors.slice(0, 3));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/site-winui.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
