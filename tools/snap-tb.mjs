import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 640, deviceScaleFactor: 2, mobile: false });
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8123/pickcat-winui3/" });
await sleep(5000);
const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 220, scale: 1 } });
fs.writeFileSync("docs/screenshots/live/site-titlebar.png", Buffer.from(shot.data, "base64"));
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  barH: Math.round(document.querySelector('.win-titlebar')?.getBoundingClientRect().height ?? -1),
  icon: (() => { const i = document.querySelector('.pc-titlebar-icon'); return i ? { ok: i.naturalWidth > 0, x: Math.round(i.getBoundingClientRect().left) } : null })(),
  titleX: Math.round(document.querySelector('.win-titlebar-title')?.getBoundingClientRect().left ?? -1)
})`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
