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

console.log("等级 chip:", await ev(`document.querySelector('#pickcat-root .pc-level-chip')?.textContent?.trim()`));

// 点 Pivot 的「作品」
const clicked = await ev(`(() => {
  const headers = [...document.querySelectorAll('#pickcat-root .win-pivot-item-header, #pickcat-root [class*="pivot-header"]')];
  const target = headers.find(h => h.textContent.trim() === '作品');
  if (!target) return 'not found';
  target.click();
  return 'clicked';
})()`);
console.log("点击作品标签:", clicked);
await sleep(2500);
console.log("切换后:", await ev(`JSON.stringify({
  activeHeader: [...document.querySelectorAll('#pickcat-root .win-pivot-item-header')].find(h => /is-selected|selected/i.test(h.className))?.textContent?.trim() ?? null,
  workCards: document.querySelectorAll('#pickcat-root .pc-work-card').length,
  topicCards: document.querySelectorAll('#pickcat-root .pc-topic-card').length
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/profile-tab.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
