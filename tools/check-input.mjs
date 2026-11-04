import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/search" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const ta = document.querySelector('#pickcat-root textarea, #pickcat-root input');
  if (!ta) return 'no input';
  const r = ta.getBoundingClientRect();
  return JSON.stringify({
    tag: ta.tagName,
    box: [Math.round(r.width), Math.round(r.height)],
    scrollW: ta.scrollWidth, clientW: ta.clientWidth,
    scrollH: ta.scrollHeight, clientH: ta.clientHeight,
    overflowScrollbars: (ta.offsetWidth - ta.clientWidth) + '/' + (ta.offsetHeight - ta.clientHeight)
  });
})()`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: (() => ({ x: 300, y: 120, width: 900, height: 160, scale: 2 }))() });
fs.writeFileSync("docs/screenshots/live/search-input.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
