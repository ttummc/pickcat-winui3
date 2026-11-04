import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

const box = JSON.parse(await ev(`(() => {
  const p = [...document.querySelectorAll('#pickcat-root p')].find(p => /https?:\\/\\//.test(p.textContent));
  const r = document.createRange(); r.selectNodeContents(p);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  const rect = r.getBoundingClientRect();
  return JSON.stringify({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: s.toString().slice(0, 60) });
})()`));
console.log("选中:", box.text);
await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none", buttons: 0 });
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "right", buttons: 2, clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "right", buttons: 0, clickCount: 1 });
await sleep(800);
console.log("菜单 ->", await ev(`JSON.stringify([...document.querySelectorAll('.pc-ctx-label')].map(e=>e.textContent))`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/context-link.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
