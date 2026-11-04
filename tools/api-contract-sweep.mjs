import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const USER = "01a0faca-3c45-7654-bea1-4147d7af5165";
const TOPIC = "01a19e50-9d97-7816-9e0a-498ef0ce8be9";
const WORK = "01a0faca-0000-0000-0000-000000000000";

/** Every GET the extension actually issues, with the params it uses. */
const CALLS = [
  ["/session", ""],
  ["/notification-summary", ""],
  ["/topics", "?sort=latest&limit=20"],
  ["/topic-recommendations", "?limit=20"],
  ["/tags", ""],
  ["/tags", "?assignable=true"],
  ["/featured-works", "?limit=7"],
  ["/work-recommendations", "?sort=popular&scope=all&limit=12"],
  [`/works/${WORK}`, ""],
  [`/topics/${TOPIC}`, ""],
  [`/topics/${TOPIC}/posts`, "?limit=50&sort=earliest"],
  [`/users/${USER}`, ""],
  [`/users/${USER}/level-contributions/2026`, ""],
  [`/users/${USER}/featured-topics`, ""],
  [`/users/${USER}/featured-works`, ""],
  [`/users/${USER}/topics`, "?limit=20"],
  [`/users/${USER}/works`, "?limit=20"],
  [`/users/${USER}/posts`, "?role=reply&limit=20"],
  [`/users/${USER}/following`, "?limit=50"],
  [`/users/${USER}/followers`, "?limit=50"],
  [`/users/${USER}/profile-activities`, "?year=2026&limit=20"],
  ["/search/users", "?q=a&limit=20"],
  ["/search/works", "?q=a&limit=20"],
  ["/notifications", "?limit=20"],
  ["/like-notification-groups", "?limit=20"],
  ["/files", "?limit=40"],
  ["/file-storage-quotas", ""],
  ["/level-progress", ""],
  ["/avatar-presets", ""],
];

const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) =>
  (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

const bad = [];
for (const [path, query] of CALLS) {
  const out = await ev(`(async () => {
    const r = await fetch('/api/v1${path}${query}', { credentials: 'include' });
    const t = await r.text();
    let detail = '';
    try { const j = JSON.parse(t); detail = j.code || (j.details ? JSON.stringify(j.details).slice(0, 90) : ''); } catch {}
    return r.status + ' ' + detail;
  })()`);
  const status = parseInt(out, 10);
  const okish = status === 200 || status === 401 || status === 403;
  if (!okish) bad.push([path + query, out]);
  console.log(`${okish ? "  " : "!!"} ${out.padEnd(34)} ${path}${query}`);
}

console.log("\n=== 非 2xx/401/403 的调用 ===");
if (!bad.length) console.log("  （没有）");
for (const [call, out] of bad) console.log(`  ${out}  ${call}`);

await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
cdp.close();
browser.close();
