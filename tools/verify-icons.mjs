import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);

async function shot(url, name, clip) {
  const created = await b.send("Target.createTarget", { url });
  await sleep(6200);
  const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
  const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
  const info = await ev(`JSON.stringify({ title: document.querySelector("#pickcat-root .pc-page-title")?.textContent ?? "", headerIcons: document.querySelectorAll("#pickcat-root .win-settings-card .win-font-icon, #pickcat-root .win-settings-card [class*=icon]").length })`);
  console.log(name, info);
  const params = { format: "png" };
  if (clip) params.clip = { ...clip, scale: 2 };
  const s = await cdp.send("Page.captureScreenshot", params);
  fs.writeFileSync(`docs/screenshots/live/${name}.png`, Buffer.from(s.data, "base64"));
  await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
  cdp.close();
}

await shot("https://pickcat.dao3.fun/#/settings", "settings", { x: 240, y: 40, width: 900, height: 640 });
await shot("https://pickcat.dao3.fun/#/notifications", "notifications-empty", { x: 240, y: 40, width: 900, height: 420 });
await shot("https://pickcat.dao3.fun/personal-library", "media-library");
b.close();
