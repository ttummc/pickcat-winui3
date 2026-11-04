import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const USER = "01a0faca-3c45-7654-bea1-4147d7af5165";

const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }))
    .result.value;

const endpoints = [
  `/users/${USER}`,
  `/users/${USER}/followers?limit=3`,
  `/users/${USER}/following?limit=3`,
  `/users/${USER}/topics?limit=2`,
  `/users/${USER}/works?limit=2`,
  `/users/${USER}/posts?limit=2`,
  `/users/${USER}/profile-activities?limit=2`,
  `/users/${USER}/featured-topics?limit=2`,
  `/users/${USER}/featured-works?limit=2`,
  `/topics?sort=latest&limit=2`,
  `/works?sort=random&limit=2`,
];

for (const path of endpoints) {
  const out = await ev(`(async () => {
    try {
      const res = await fetch('/api/v1${path}', { credentials: 'include', headers: { accept: 'application/json' } });
      const text = await res.text();
      if (!res.ok) return 'HTTP ' + res.status + ' ' + text.slice(0, 120);
      const data = JSON.parse(text);
      const item = Array.isArray(data?.items) ? data.items[0] : data;
      return JSON.stringify({ topKeys: Object.keys(data), itemKeys: item ? Object.keys(item) : null, sample: item }, null, 1).slice(0, 1100);
    } catch (e) { return 'ERR ' + e.message; }
  })()`);
  console.log(`\n### ${path}\n${out}`);
}

await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
cdp.close();
browser.close();
