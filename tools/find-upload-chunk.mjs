import { connectWs, sleep } from "./cdp.mjs";
const r = await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" });
const target = await r.json();
const cdp = await connectWs(target.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
for (const path of ["/library", "/forum/editor"]) {
  await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun" + path });
  await sleep(9000);
  const found = await ev(`(async () => {
    const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(u => u.includes('/_nuxt/') && u.endsWith('.js')))];
    const hits = [];
    for (const u of urls) {
      try {
        const t = await (await fetch(u)).text();
        if (/ownership/i.test(t)) hits.push({ file: u.split('/').pop(), ctx: (t.match(/.{160}ownership.{260}/is) || [''])[0].replace(/\\s+/g,' ') });
      } catch {}
    }
    return JSON.stringify({ page: location.pathname, chunks: urls.length, hits }, null, 1);
  })()`);
  console.log(found);
}
cdp.close();

