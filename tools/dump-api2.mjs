import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const USER = "01a0faca-3c45-7654-bea1-4147d7af5165";
const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

const paths = [
  `/users/${USER}/following?limit=2`,
  `/users/${USER}/topics?limit=2`,
  `/users/${USER}/works?limit=2`,
  `/users/${USER}/posts?limit=2`,
  `/users/${USER}/profile-activities?limit=2`,
  `/users/${USER}/featured-topics?limit=2`,
  `/users/${USER}/featured-works?limit=2`,
  `/topics?sort=latest&limit=1`,
  `/works?sort=random&limit=1`,
];
for (const p of paths) {
  const out = await ev(`(async () => {
    try {
      const r = await fetch('/api/v1${p}', { credentials: 'include' });
      const t = await r.text();
      if (!r.ok) return 'HTTP ' + r.status;
      const d = JSON.parse(t);
      const item = Array.isArray(d?.items) ? d.items[0] : d;
      return JSON.stringify({ itemKeys: item ? Object.keys(item) : null, sample: item }).slice(0, 700);
    } catch (e) { return 'ERR ' + e.message }
  })()`);
  console.log(`\n### ${p}\n${out}`);
}
await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); browser.close();
