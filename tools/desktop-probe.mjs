import fs from "node:fs";
import { connectWs, sleep } from "./cdp.mjs";

const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find((t) => t.type === "page");
if (!page) {
  console.log("no page target");
  process.exit(1);
}
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

const state = await ev(`JSON.stringify({
  title: document.title,
  url: location.href,
  hasRoot: !!document.getElementById('pickcat-root'),
  rootChildren: document.getElementById('pickcat-root')?.children.length ?? 0,
  hasStyle: !!document.getElementById('pc-host-style'),
  navItems: document.querySelectorAll('#pickcat-root .win-navigation-view-item').length,
  pageTitle: document.querySelector('#pickcat-root .pc-page-title')?.textContent ?? null,
  bodyChildren: [...document.body.children].map(e => e.tagName + (e.id ? '#' + e.id : '')).slice(0, 6),
  nuxtLoaded: typeof window.$nuxt !== 'undefined' || !!document.getElementById('__nuxt')
})`);
console.log(state);

await sleep(1200);
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.mkdirSync("docs/screenshots/desktop", { recursive: true });
fs.writeFileSync("docs/screenshots/desktop/webview.png", Buffer.from(shot.data, "base64"));
console.log("screenshot saved");
cdp.close();
