import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const SITE = "https://ttummc.github.io/pickcat-winui3/";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 2, mobile: false });
await cdp.send("Page.navigate", { url: SITE });
await sleep(5000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

// 关掉平滑滚动再回顶部，避免抓到动画中间帧
await ev(`document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0);`);
await sleep(800);

console.log(await ev(`JSON.stringify({
  hero: !!document.querySelector('header.hero'),
  h1: document.querySelector('.hero h1')?.textContent?.trim(),
  buttons: [...document.querySelectorAll('.actions .btn')].map(a => a.textContent.trim()),
  scrollY: Math.round(window.scrollY),
  sections: [...document.querySelectorAll('section')].map(s => s.id)
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/site-live.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
