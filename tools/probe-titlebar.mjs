import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "about:blank" });
await sleep(400);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8123/pickcat-winui3/" });
await sleep(5000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("结构:", await ev(`(() => {
  const tb = document.querySelector('.win-titlebar') || document.querySelector('[class*="titlebar"]') || document.querySelector('[class*="title-bar"]');
  if (!tb) return 'no titlebar';
  const r = tb.getBoundingClientRect();
  const cs = getComputedStyle(tb);
  return JSON.stringify({
    cls: tb.className, box: [Math.round(r.width), Math.round(r.height)],
    padding: cs.padding, display: cs.display, bg: cs.backgroundColor,
    html: tb.outerHTML.slice(0, 420)
  }, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
