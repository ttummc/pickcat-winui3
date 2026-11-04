import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

// fire three toasts through the caption buttons + a bookmark attempt
await ev(`(() => {
  const btns = [...document.querySelectorAll('#pickcat-root .win-titlebar-caption-button')];
  btns[0]?.click(); btns[1]?.click(); btns[2]?.click();
  return btns.length;
})()`);
await sleep(1200);
console.log(await ev(`(() => {
  const toasts = [...document.querySelectorAll('.pc-toast-stack .win-infobar')];
  return JSON.stringify({
    count: toasts.length,
    boxes: toasts.map(t => { const r = t.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
    titles: toasts.map(t => t.querySelector('.win-infobar-title')?.textContent?.trim()),
    titleHeights: toasts.map(t => Math.round(t.querySelector('.win-infobar-title')?.getBoundingClientRect().height ?? 0)),
    detail: toasts[0]?.querySelector('.pc-toast-detail')?.textContent?.trim(),
    radius: toasts[0] ? getComputedStyle(toasts[0]).borderRadius : null
  });
})()`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 560, y: 520, width: 640, height: 380, scale: 2 } });
fs.writeFileSync("docs/screenshots/live/toast-v2.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
