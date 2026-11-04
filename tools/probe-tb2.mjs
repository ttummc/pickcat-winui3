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
console.log(await ev(`(() => {
  const tb = document.querySelector('.win-titlebar');
  const kids = [...tb.children].map(c => ({ cls: c.className, txt: (c.textContent||'').trim().slice(0,20), box: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)] }));
  return JSON.stringify({ kids, html: tb.outerHTML.replace(/\\s+/g,' ').slice(0, 900) }, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
