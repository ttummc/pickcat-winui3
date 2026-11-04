import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7000);

const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Performance.enable");

const ev = async (e) =>
  (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

console.log("dom:", await ev(`JSON.stringify({
  totalNodes: document.getElementsByTagName('*').length,
  ourNodes: document.getElementById('pickcat-root')?.getElementsByTagName('*').length ?? 0,
  hiddenNuxtNodes: document.getElementById('__nuxt')?.getElementsByTagName('*').length ?? 0,
  styleSheets: document.styleSheets.length,
  cssRules: [...document.styleSheets].reduce((n, s) => { try { return n + s.cssRules.length } catch { return n } }, 0)
})`));

// cost of one forced restyle over the whole document
console.log("restyle ms:", await ev(`(() => {
  const t0 = performance.now();
  document.body.style.setProperty('--pc-perf-probe', '1');
  const cls = document.documentElement.className;
  document.documentElement.className = cls + ' perf-probe';
  void document.body.offsetHeight;
  document.documentElement.className = cls;
  void document.body.offsetHeight;
  document.body.style.removeProperty('--pc-perf-probe');
  return Math.round((performance.now() - t0) * 100) / 100;
})()`));

// long tasks over 3s of scrolling
console.log("long tasks:", await ev(`(async () => {
  const tasks = [];
  const obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) tasks.push(Math.round(e.duration)); });
  try { obs.observe({ entryTypes: ['longtask'] }); } catch (e) { return 'unsupported'; }
  const scroller = document.querySelector('#pickcat-root .pc-page-scroll') || document.scrollingElement;
  for (let i = 0; i < 30; i++) { scroller.scrollBy(0, 120); await new Promise(r => setTimeout(r, 30)); }
  await new Promise(r => setTimeout(r, 300));
  obs.disconnect();
  return JSON.stringify({ count: tasks.length, total: tasks.reduce((a, b) => a + b, 0), worst: Math.max(0, ...tasks) });
})()`));

const metrics = (await cdp.send("Performance.getMetrics")).metrics;
const pick = ["RecalcStyleCount", "RecalcStyleDuration", "LayoutCount", "LayoutDuration", "NodeCount", "JSHeapUsedSize"];
for (const m of metrics.filter((x) => pick.includes(x.name))) {
  console.log(`${m.name}: ${Math.round(m.value * 100) / 100}`);
}

await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
cdp.close();
browser.close();
