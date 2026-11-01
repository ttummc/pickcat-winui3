import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const p = list.find(t => t.id === created.targetId);
const cdp = await connectWs(p.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const btn = [...document.querySelectorAll("#pickcat-root button")].find(b => b.innerText.includes("分享你的想法"));
  const r = btn.getBoundingClientRect();
  return JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height), font: getComputedStyle(btn).fontSize, accent: getComputedStyle(document.documentElement).getPropertyValue("--pc-accent").trim() });
})()`));
const s = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 1170, y: 40, width: 270, height: 110, scale: 3 } });
fs.writeFileSync("docs/screenshots/live/btn.png", Buffer.from(s.data, "base64"));
cdp.close(); b.close();
