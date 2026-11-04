import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const nodes = [...document.querySelectorAll('#pickcat-root [class*="scrollbar"], #pickcat-root [class*="scroll-bar"], #pickcat-root [class*="scrollviewer"]')];
  return JSON.stringify(nodes.slice(0, 10).map(n => {
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return { cls: String(n.className).slice(0,70), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, opacity: cs.opacity, visibility: cs.visibility };
  }), null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
