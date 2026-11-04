import fs from "node:fs";
import { connectWs, sleep } from "./cdp.mjs";
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page" && t.url.includes("pickcat"));
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
await ev(`(() => { const b = document.querySelector('#pickcat-root .win-titlebar-caption-button'); if (b) b.click(); return !!b })()`);
await sleep(900);
console.log(await ev(`(() => {
  const title = document.querySelector('.pc-infobar-stack .win-infobar-title');
  const bar = document.querySelector('.pc-infobar-stack .win-infobar');
  if (!title || !bar) return 'no toast';
  const r = title.getBoundingClientRect();
  return JSON.stringify({ text: title.textContent.trim(), height: Math.round(r.height), width: Math.round(r.width), wrap: getComputedStyle(title).whiteSpace, radius: getComputedStyle(bar).borderRadius });
})()`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 700, y: 640, width: 720, height: 220, scale: 2 } });
fs.writeFileSync("docs/screenshots/live/toast-fixed.png", Buffer.from(shot.data, "base64"));
cdp.close();
