import { connectWs, sleep } from "./tools/cdp.mjs";
const r = await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" });
const target = await r.json();
const cdp = await connectWs(target.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun/forum/editor" });
await sleep(9000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
console.log(await ev(`(async () => {
  const t = await (await fetch('/_nuxt/PTomalQF.js')).text();
  const ownerships = [...new Set([...t.matchAll(/ownership[:\`'"]{1,2}([A-Z_]+)/g)].map(m => m[1]))];
  const upload = (t.match(/.{500}bodySerializer.{400}/is) || [''])[0].replace(/\\s+/g, ' ');
  const resp = (t.match(/async function [a-z]\\(e,n,r\\)\\{.{0,200}files\\/\\{fileId\\}/is) || [''])[0].replace(/\\s+/g,' ');
  return JSON.stringify({ ownerships, upload }, null, 1);
})()`));
cdp.close();
