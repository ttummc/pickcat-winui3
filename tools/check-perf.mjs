import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(600);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("after strip:", await ev(`JSON.stringify({
  totalNodes: document.getElementsByTagName('*').length,
  nuxtExists: !!document.getElementById('__nuxt'),
  teleports: !!document.getElementById('teleports'),
  bodyChildren: [...document.body.children].map(e => e.id || e.tagName)
})`));
// toast radius probe
await ev(`(() => { const btn = [...document.querySelectorAll('#pickcat-root button')].find(b => b.title && b.title.includes('最小')); if (btn) btn.click(); return true })()`);
await sleep(900);
console.log("toast:", await ev(`(() => {
  const bar = document.querySelector('.pc-infobar-stack .win-infobar');
  if (!bar) return 'no toast';
  const cs = getComputedStyle(bar);
  const panel = bar.querySelector('.win-infobar-panel');
  return JSON.stringify({ radius: cs.borderRadius, overflow: cs.overflow, panelRadius: panel ? getComputedStyle(panel).borderRadius : null });
})()`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/toast-radius.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
