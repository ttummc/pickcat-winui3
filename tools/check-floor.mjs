import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const TOPIC = "01a19e50-9d97-7816-9e0a-498ef0ce8be9";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/forum/post/${TOPIC}/2` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  hash: location.hash,
  title: document.querySelector('#pickcat-root .pc-topic-title')?.textContent?.trim().slice(0, 30),
  anchors: [...document.querySelectorAll('#pickcat-root .pc-post')].map(e => e.id).filter(Boolean),
  flashed: document.querySelectorAll('#pickcat-root .pc-post--flash').length,
  scrolled: Math.round(document.querySelector('#pickcat-root .pc-page-scroll')?.scrollTop ?? -1)
})`));
await sleep(600);
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/floor-jump.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
