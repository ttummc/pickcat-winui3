import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const p = document.querySelector('#pickcat-root .pc-selector .win-scroll-presenter');
  if (!p) return 'no presenter';
  const cs = getComputedStyle(p);
  const kids = [...p.querySelectorAll('*')].filter(e => e.children.length <= 2).slice(0, 6).map(e => {
    const r = e.getBoundingClientRect();
    return { cls: String(e.className).slice(0,45), h: Math.round(r.height), y: Math.round(r.y) };
  });
  return JSON.stringify({ presenter: { h: p.clientHeight, sh: p.scrollHeight, padding: cs.padding, overflow: cs.overflowY }, kids }, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
