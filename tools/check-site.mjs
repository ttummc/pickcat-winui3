import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 2, mobile: false });
await cdp.send("Page.navigate", { url: "file:///C:/Users/tjh54/Desktop/PickCatButWinUI3OnWeb/docs/index.html" });
await sleep(4000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  version: document.getElementById('ver')?.textContent,
  size: document.getElementById('size')?.textContent,
  sha: document.getElementById('sha')?.textContent?.slice(0, 20),
  images: [...document.images].map(i => ({ f: i.src.split('/').pop(), ok: i.naturalWidth > 0 })),
  sections: document.querySelectorAll('section').length
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/site-home.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
