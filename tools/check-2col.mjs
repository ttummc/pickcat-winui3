import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const U = "01a0faca-3c45-7654-bea1-4147d7af5165";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(800);
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/profile/${U}` });
await sleep(9500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  bannerImg: (() => { const i = document.querySelector('#pickcat-root .pc-card-banner-img'); return i ? { src: i.currentSrc.split('/').slice(-1)[0], w: i.naturalWidth, h: i.naturalHeight } : null })(),
  stats: [...document.querySelectorAll('#pickcat-root .pc-profile-card .pc-stat')].map(s => s.textContent.replace(/\\s+/g,' ').trim()),
  badges: document.querySelectorAll('#pickcat-root .pc-badge-item').length,
  monthLabels: [...document.querySelectorAll('#pickcat-root .pc-heatmap-months > span')].map(s=>s.textContent.trim()).filter(Boolean),
  legend: document.querySelectorAll('#pickcat-root .pc-heat-legend').length,
  sectionOrder: [...document.querySelectorAll('#pickcat-root .pc-profile-main .pc-section-title')].map(h => h.textContent.trim())
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/profile-2col.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
