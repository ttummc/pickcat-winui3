import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
await ev(`document.querySelectorAll('#pickcat-root .win-titlebar-caption-button')[0]?.click()`);
await sleep(900);
console.log(await ev(`(() => {
  const title = document.querySelector('.pc-toast-stack .win-infobar-title')
    || [...document.querySelectorAll('.pc-toast-stack *')].find(e => e.textContent.trim() === '最小化' && e.children.length === 0);
  if (!title) return 'title not found';
  const chain = [];
  let n = title;
  for (let i = 0; i < 6 && n; i++) {
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    chain.push({ cls: String(n.className || n.tagName).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height),
      ws: cs.whiteSpace, gtc: cs.gridTemplateColumns === 'none' ? '' : cs.gridTemplateColumns.slice(0, 60), flex: cs.flex });
    n = n.parentElement;
  }
  return JSON.stringify(chain, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
