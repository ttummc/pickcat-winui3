import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const bar = document.querySelector('#pickcat-root .win-selector-bar') || document.querySelector('#pickcat-root [class*="selector"]');
  if (!bar) return 'no selector bar';
  const walk = (el, depth) => {
    const cs = getComputedStyle(el);
    const scrolls = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    const out = { cls: String(el.className).slice(0,60), of: cs.overflow, ox: cs.overflowX, oy: cs.overflowY, scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight, scrolls };
    if (depth < 2) out.children = [...el.children].map(c => walk(c, depth+1));
    return out;
  };
  return JSON.stringify(walk(bar, 0), null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
