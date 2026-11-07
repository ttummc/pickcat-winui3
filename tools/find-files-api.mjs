import { connectWs, sleep } from "./cdp.mjs";
const r = await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" });
const t = await r.json().catch(() => null);
if (!t) { console.log("no debug chrome on 9334"); process.exit(0); }
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
    if (/deletion/.test(txt) || /file-storage/.test(txt)) {
      out.push({ file: u.split('/').pop(), len: txt.length,
        hits: [...txt.matchAll(/.{80}(deletion|file-storage).{200}/gis)].map(m => m[0].replace(/\\s+/g,' ')).slice(0, 3) });
    }
  }
  return JSON.stringify({ chunks: urls.length, out }, null, 1);
})()`));
cdp.close();
