import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const probe = async (path) => {
  const out = await ev(`(async () => {
    const r = await fetch('/api/v1${path}', { credentials: 'include' });
    const t = await r.text();
    let extra = '';
    try { const j = JSON.parse(t); extra = j.details ? JSON.stringify(j.details).slice(0,200) : (j.code || ''); } catch {}
    return r.status + ' ' + extra;
  })()`);
  console.log(out.padEnd(60), path);
};
console.log("=== 探测 work-recommendations 的合法参数 ===");
await probe("/work-recommendations?limit=6");
await probe("/work-recommendations?sort=random&limit=6");
await probe("/work-recommendations?sort=popular&limit=6");
await probe("/work-recommendations?sort=bogus&limit=6");
await probe("/work-recommendations?scope=all&limit=6");
await probe("/work-recommendations?scope=bogus&limit=6");
console.log("\n=== 真实作品 id ===");
const wid = await ev(`fetch('/api/v1/featured-works?limit=1',{credentials:'include'}).then(r=>r.json()).then(d=>d.items?.[0]?.id ?? 'none')`);
console.log("work id:", wid);
await probe(`/works/${wid}`);
await probe(`/works/${wid}/comments?limit=5`);
await probe(`/works/${wid}/stats`);
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
