import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const TOPIC = "01a13aa9-f1d1-7698-9cc7-3ef02c726284";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(800);
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/forum/post/${TOPIC}/2` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  debug: window.__pcFloorDebug ?? null,
  scrollTop: Math.round(document.querySelector('#pickcat-root .pc-page-scroll')?.scrollTop ?? -1),
  targetY: Math.round(document.getElementById('pc-post-2')?.getBoundingClientRect().top ?? -1),
  flashed: document.querySelectorAll('#pickcat-root .pc-post--flash').length
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/floor-jump.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
