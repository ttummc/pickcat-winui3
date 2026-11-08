import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const t = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(4000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const ws = await connectWs(list.find(x => x.id === t.targetId).webSocketDebuggerUrl);
await ws.send("Runtime.enable");
const expr = `JSON.stringify({
  shell: !!document.querySelector('.pc-shell'),
  closed: !!document.querySelector('.pc-closed'),
  rootHTML: document.getElementById('pickcat-root')?.innerHTML.slice(0,120),
  ls: Object.keys(localStorage).reduce((o,k)=>{o[k]=String(localStorage[k]).slice(0,60);return o;},{}),
  ss: Object.keys(sessionStorage)
}, null, 1)`;
const r = await ws.send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(r.result.value);
ws.close(); browser.close();
