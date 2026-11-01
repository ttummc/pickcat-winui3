import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(600);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(6000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 320, deviceScaleFactor: 2, mobile: false });
const codes = ["E734","E946","E7E8","E790","E793","E8D4","E706","E708","E7F4","E77B","E8F1","E713","E72C","E74D","E8B7","E9D9","E8EC","E8A5","E80F","EA8F"];
await cdp.send("Runtime.evaluate", { expression: `(() => {
  const old = document.getElementById("glyph-test"); old?.remove();
  const box = document.createElement("div");
  box.id = "glyph-test";
  box.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:#1b1b1b;display:flex;flex-wrap:wrap;gap:6px;padding:10px;font-family:'Segoe Fluent Icons','Segoe MDL2 Assets'";
  for (const c of ${JSON.stringify(codes)}) {
    const cell = document.createElement("div");
    cell.style.cssText = "width:96px;text-align:center;color:#fff;font-size:12px";
    const g = document.createElement("div");
    g.textContent = String.fromCharCode(parseInt(c, 16));
    g.style.cssText = "font-size:26px;line-height:34px";
    const l = document.createElement("div"); l.textContent = c; l.style.cssText = "color:#9a9aa2;font-family:Segoe UI";
    cell.append(g, l); box.appendChild(cell);
  }
  document.getElementById("pickcat-root").appendChild(box);
  return true;
})()`, returnByValue: true });
await sleep(500);
const s = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/glyphs.png", Buffer.from(s.data, "base64"));
await cdp.send("Runtime.evaluate", { expression: `document.getElementById("glyph-test")?.remove()` });
cdp.close(); b.close();
