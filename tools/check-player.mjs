import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const WORK = "01a16c71-7fd6-75ae-9fa2-d0af927a3176";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(800);
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/works/${WORK}` });
await sleep(11000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  player: !!document.querySelector('#pickcat-root .pc-player'),
  src: document.querySelector('#pickcat-root .pc-player-frame')?.src,
  stageBox: (() => { const r = document.querySelector('#pickcat-root .pc-player-stage')?.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null })(),
  badge: document.querySelector('#pickcat-root .pc-player-badge')?.textContent?.trim(),
  buttons: [...document.querySelectorAll('#pickcat-root .pc-player-bar .win-button')].map(b => b.textContent.trim())
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/work-player.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();

