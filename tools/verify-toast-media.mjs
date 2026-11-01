import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);

async function open(url) {
  const created = await b.send("Target.createTarget", { url });
  await sleep(6200);
  const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
  const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
  return { cdp, created, ev };
}

// 1) /personal-library must be the media board now
{
  const { cdp, created, ev } = await open("https://pickcat.dao3.fun/personal-library");
  console.log("personal-library:", await ev(`JSON.stringify({ hash: location.hash, title: document.querySelector("#pickcat-root .pc-page-title")?.textContent })`));
  const s = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("docs/screenshots/live/media-library.png", Buffer.from(s.data, "base64"));
  await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
  cdp.close();
}

// 2) toast stack: spam the minimise button and count toasts
{
  const { cdp, created, ev } = await open("https://pickcat.dao3.fun/#/");
  const pos = JSON.parse(await ev(`(() => {
    const btn = document.querySelector('#pickcat-root .win-titlebar button[aria-label*="最小"]') || [...document.querySelectorAll("#pickcat-root .win-titlebar button")].pop();
    const r = btn.getBoundingClientRect();
    return JSON.stringify({ x: r.left + r.width/2, y: r.top + r.height/2 });
  })()`));
  for (let i = 0; i < 6; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(150);
  }
  await sleep(600);
  console.log("点击 6 次后 toast:", await ev(`(() => {
    const stack = document.querySelector(".pc-infobar-stack");
    const bars = stack ? [...stack.querySelectorAll(".win-infobar")] : [];
    const r = stack ? stack.getBoundingClientRect() : null;
    const first = bars[0] ? getComputedStyle(bars[0]).backgroundColor : null;
    return JSON.stringify({ count: bars.length, top: r ? Math.round(r.top) : null, inView: r ? r.top >= 0 : null, bg: first });
  })()`));
  const s = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("docs/screenshots/live/toasts.png", Buffer.from(s.data, "base64"));
  await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
  cdp.close();
}
b.close();
