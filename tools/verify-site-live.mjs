import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const SITE = "https://ttummc.github.io/pickcat-winui3/";

const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);

const failed = [];
const responses = [];
cdp.on("Network.loadingFailed", (p) => failed.push(`${p.errorText} ${p.type}`));
cdp.on("Network.responseReceived", (p) => responses.push({ url: p.response.url, status: p.response.status }));

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Network.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 2, mobile: false });

await cdp.send("Page.navigate", { url: SITE });
await sleep(6000);

const ev = async (e) =>
  (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

console.log("title   :", await ev("document.title"));
console.log("chips   :", await ev(`JSON.stringify({
  ver: document.getElementById('ver')?.textContent,
  size: document.getElementById('size')?.textContent,
  sha: document.getElementById('sha')?.textContent?.slice(0, 18)
})`));
console.log("hero img:", await ev(`(() => {
  const i = document.querySelector('.shot img');
  return i ? JSON.stringify({ file: i.src.split('/').pop(), ok: i.naturalWidth > 0, w: i.naturalWidth }) : 'none';
})()`));

// scroll through so lazy images load
for (let i = 1; i <= 4; i += 1) {
  await ev(`window.scrollTo(0, document.body.scrollHeight * ${i / 4})`);
  await sleep(900);
}
console.log("showcase:", await ev(`JSON.stringify({
  items: document.querySelectorAll('.showcase-item').length,
  loaded: [...document.querySelectorAll('.showcase-frame img')].filter(i => i.naturalWidth > 0).length
})`));

console.log("\nnon-200 responses:");
for (const r of responses.filter((r) => r.status >= 400)) console.log(" ", r.status, r.url.slice(-70));
console.log("failed requests:", failed.length ? failed.slice(0, 5) : "none");

// screenshot the hero
await ev("window.scrollTo(0, 0)");
await sleep(600);
const hero = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/site-live.png", Buffer.from(hero.data, "base64"));

await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
cdp.close();
browser.close();
