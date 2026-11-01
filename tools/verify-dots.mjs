import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

const pos = JSON.parse(await ev(`(() => {
  const btn = document.querySelector("#pickcat-root .pc-menu-btn");
  const r = btn.getBoundingClientRect();
  return JSON.stringify({ x: r.left + r.width/2, y: r.top + r.height/2 });
})()`));
console.log("⋯ 按钮位置:", JSON.stringify(pos));

await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y, button: "none", buttons: 0 });
await sleep(200);
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", buttons: 1, clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", buttons: 0, clickCount: 1 });
await sleep(800);
console.log("点击 ⋯ 后:", await ev(`(() => {
  const m = document.querySelector(".pc-ctx");
  if (!m) return "无菜单";
  const r = m.getBoundingClientRect();
  return JSON.stringify({ at: [Math.round(r.x), Math.round(r.y)], items: [...m.querySelectorAll(".pc-ctx-label")].map(e=>e.textContent) });
})()`));
const s = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: pos.x - 260, y: pos.y - 40, width: 520, height: 360, scale: 2 } });
fs.writeFileSync("docs/screenshots/live/ctx-dots.png", Buffer.from(s.data, "base64"));
cdp.close(); b.close();
