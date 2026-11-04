import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => errors.push(String(p.exceptionDetails.exception?.description ?? "").split("\n")[0]));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8123/pickcat-winui3/" });
await sleep(4500);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  noScroll: document.documentElement.scrollHeight <= window.innerHeight + 1,
  docH: document.documentElement.scrollHeight, winH: window.innerHeight,
  layers: [...document.querySelectorAll('.layer')].map(l => l.dataset.depth),
  heroImg: (document.querySelector('.layer img')?.naturalWidth ?? 0) > 0,
  ver: document.getElementById('ver')?.textContent,
  size: document.getElementById('size')?.textContent,
  install: !!document.querySelector('.install')
})`));
console.log("errors:", errors.slice(0,2));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/site-m3.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
