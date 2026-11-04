import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(600);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/profile/01a0faca-3c45-7654-bea1-4147d7af5165" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
// switch to the followers tab
await ev(`(() => {
  const btn = [...document.querySelectorAll('#pickcat-root .win-selector-bar-item, #pickcat-root button')].find(b => b.textContent.trim() === '粉丝');
  if (btn) btn.click();
  return !!btn;
})()`);
await sleep(2500);
console.log(await ev(`JSON.stringify({
  cards: document.querySelectorAll('#pickcat-root .pc-follower-card, #pickcat-root .pc-person-card').length,
  names: [...document.querySelectorAll('#pickcat-root .pc-follower-card, #pickcat-root .pc-person-card')].slice(0,4).map(c => c.innerText.replace(/\\s+/g,' ').trim().slice(0,30)),
  imgs: [...document.querySelectorAll('#pickcat-root img')].slice(0,4).map(i => i.currentSrc || i.src).map(s => s.split('/').slice(-1)[0])
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.mkdirSync("docs/screenshots/live", { recursive: true });
fs.writeFileSync("docs/screenshots/live/profile-followers.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
