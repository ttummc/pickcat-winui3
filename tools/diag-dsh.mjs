import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(x => x.url.includes("pickcat.dao3.fun"));
if (!page) { console.log("找不到页面"); process.exit(1); }
const ws = await connectWs(page.webSocketDebuggerUrl);
await ws.send("Runtime.enable");

// 侧栏是否出现该项
let r = await ws.send("Runtime.evaluate", {
  expression: `JSON.stringify([...document.querySelectorAll('[class*="nav-item"],[class*="navigation"]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,20))`,
  returnByValue: true,
});
console.log("侧栏项:", r.result.value);

// 跳到 DSH 页面
await ws.send("Runtime.evaluate", { expression: `location.hash = "#/dsh"` });
await sleep(1500);
r = await ws.send("Runtime.evaluate", {
  expression: `JSON.stringify({ title: document.querySelector('.pc-page-title')?.textContent, text: document.querySelector('.pc-page-scroll')?.innerText.slice(0,160) })`,
  returnByValue: true,
});
console.log("页面内容:", r.result.value);
ws.close(); browser.close();
