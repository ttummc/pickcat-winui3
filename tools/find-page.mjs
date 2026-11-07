import { connectWs, sleep } from "./cdp.mjs";
const r = await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" });
const t = await r.json();
const cdp = await connectWs(t.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun/personal-library" });
await sleep(9000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
console.log(await ev(`(async () => {
  const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(u => u.includes('/_nuxt/') && u.endsWith('.js')))];
  const out = [];
  for (const u of urls) {
    const txt = await (await fetch(u)).text();
    if (!/PTomalQF/.test(txt)) continue;
    const imp = (txt.match(/import\\{[^}]*\\}from"\\.\\/PTomalQF\\.js"/) || [''])[0];
    out.push({ file: u.split('/').pop(), len: txt.length, imp });
    // 找出 list 调用处的 query 形状
    for (const m of txt.matchAll(/.{140}ownership.{220}/gis)) out.push({ ctx: m[0].replace(/\\s+/g,' ') });
  }
  return JSON.stringify(out, null, 1).slice(0, 4000);
})()`));
cdp.close();
