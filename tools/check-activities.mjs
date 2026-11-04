import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/profile/01a0faca-3c45-7654-bea1-4147d7af5165" });
await sleep(8500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  rows: document.querySelectorAll('#pickcat-root .pc-activity').length,
  icons: [...document.querySelectorAll('#pickcat-root .pc-activity-icon')].slice(0,6).map(i => ({ text: i.textContent.trim(), title: i.title })),
  leftoverEnum: [...document.querySelectorAll('#pickcat-root .pc-activity')].some(r => /\\b(POSTED|REPLIED|LIKED)\\b/.test(r.textContent))
})`));
// scroll to the activity section and capture
await ev(`document.querySelector('#pickcat-root .pc-activity')?.scrollIntoView({block:'center'})`);
await sleep(700);
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/profile-activities.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
