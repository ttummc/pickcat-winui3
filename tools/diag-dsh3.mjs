import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(x => x.url.includes("pickcat.dao3.fun"));
const ws = await connectWs(page.webSocketDebuggerUrl);
await ws.send("Runtime.enable");
// 直接改 hash 并派发 hashchange，看路由是否更新
await ws.send("Runtime.evaluate", { expression: `location.hash = "#/settings"` });
await sleep(1500);
let r = await ws.send("Runtime.evaluate", { expression: `JSON.stringify({hash:location.hash, title:document.querySelector('.pc-page-title')?.textContent})`, returnByValue: true });
console.log("settings 路由:", r.result.value);
await ws.send("Runtime.evaluate", { expression: `location.hash = "#/dsh"; window.dispatchEvent(new HashChangeEvent('hashchange'))` });
await sleep(1500);
r = await ws.send("Runtime.evaluate", { expression: `JSON.stringify({hash:location.hash, title:document.querySelector('.pc-page-title')?.textContent, body:document.querySelector('.pc-page-scroll')?.innerText.slice(0,120)})`, returnByValue: true });
console.log("dsh 路由:", r.result.value);
ws.close(); browser.close();
