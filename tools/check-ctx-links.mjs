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

// 场景 1：右键一个链接
const linkBox = JSON.parse(await ev(`(() => {
  const a = [...document.querySelectorAll('#pickcat-root a[href^="http"]')].find(a => a.textContent.trim().length > 4);
  if (!a) return "null";
  const r = a.getBoundingClientRect();
  return JSON.stringify({ x: r.left + 10, y: r.top + r.height / 2, href: a.href.slice(0, 60) });
})()`));
console.log("链接:", linkBox.href);
await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: linkBox.x, y: linkBox.y, button: "none", buttons: 0 });
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: linkBox.x, y: linkBox.y, button: "right", buttons: 2, clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: linkBox.x, y: linkBox.y, button: "right", buttons: 0, clickCount: 1 });
await sleep(800);
console.log("右键链接 ->", await ev(`JSON.stringify([...document.querySelectorAll('.pc-ctx-label')].map(e=>e.textContent))`));

// 场景 2：选中一段网址再右键
await ev(`(() => {
  const p = [...document.querySelectorAll('#pickcat-root p')].find(p => /https?:\\/\\//.test(p.textContent));
  if (!p) return false;
  const r = document.createRange(); r.selectNodeContents(p);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  return true;
})()`);
const anyPoint = JSON.parse(await ev(`(() => { const r = document.querySelector('#pickcat-root .pc-page-scroll').getBoundingClientRect(); return JSON.stringify({x: r.left + 120, y: r.top + 300}) })()`));
await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: anyPoint.x, y: anyPoint.y, button: "none", buttons: 0 });
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: anyPoint.x, y: anyPoint.y, button: "right", buttons: 2, clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: anyPoint.x, y: anyPoint.y, button: "right", buttons: 0, clickCount: 1 });
await sleep(800);
console.log("选中网址后 ->", await ev(`JSON.stringify([...document.querySelectorAll('.pc-ctx-label')].map(e=>e.textContent))`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/context-link.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
