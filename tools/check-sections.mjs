import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const URL = "http://127.0.0.1:8123/pickcat-winui3/";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url: URL });
await sleep(5000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

for (const label of ["功能", "界面", "安装", "常见问题"]) {
  const clicked = await ev(`(() => {
    const items = [...document.querySelectorAll('#app [role="option"], #app [class*="navigation-view-item"], #app li')];
    const t = items.find(e => e.textContent.trim() === ${JSON.stringify(label)});
    if (!t) return 'not found';
    t.click();
    return 'ok';
  })()`);
  await sleep(1400);
  const state = await ev(`JSON.stringify({
    h2: document.querySelector('.pc-h2')?.textContent?.trim(),
    features: document.querySelectorAll('.pc-feature').length,
    viewer: !!document.querySelector('.pc-viewer'),
    thumbs: document.querySelectorAll('.pc-thumb').length,
    steps: document.querySelectorAll('.pc-step').length,
    expanders: document.querySelectorAll('.win-expander, [class*="expander"]').length
  })`);
  console.log(label.padEnd(5), clicked, state);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`docs/screenshots/live/site-${label}.png`, Buffer.from(shot.data, "base64"));
}
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
