import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const U = "01a0faca-3c45-7654-bea1-4147d7af5165";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(800);
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/profile/${U}` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  hero: !!document.querySelector('#pickcat-root .pc-hero'),
  personPicture: document.querySelectorAll('#pickcat-root .win-person-picture, #pickcat-root [class*="person-picture"]').length,
  stats: document.querySelectorAll('#pickcat-root .pc-stat').length,
  pivot: !!document.querySelector('#pickcat-root .win-pivot'),
  pivotHeaders: [...document.querySelectorAll('#pickcat-root .win-pivot-item-header, #pickcat-root [class*="pivot-header"]')].map(h => h.textContent.trim()).slice(0, 8),
  badges: document.querySelectorAll('#pickcat-root .win-infobadge').length,
  bodyText: document.querySelector('#pickcat-root .pc-hero-name')?.textContent?.trim()
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/profile-new.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
