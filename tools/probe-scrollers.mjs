import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("可滚动元素:", await ev(`(() => {
  const out = [];
  for (const el of document.querySelectorAll('#pickcat-root *')) {
    if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      out.push({ cls: String(el.className).slice(0,55), ox: cs.overflowX, oy: cs.overflowY, box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], sh: el.scrollHeight, ch: el.clientHeight });
    }
  }
  return JSON.stringify(out.slice(0, 8), null, 1);
})()`));
console.log("\n命中测试 (477,200):", await ev(`(() => {
  const el = document.elementFromPoint(477, 200);
  if (!el) return 'none';
  const chain = [];
  let n = el;
  for (let i = 0; i < 4 && n; i++) { chain.push(String(n.className || n.tagName).slice(0,50)); n = n.parentElement; }
  return JSON.stringify(chain);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
