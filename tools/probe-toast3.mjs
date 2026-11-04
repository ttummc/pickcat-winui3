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
  const root = document.querySelector('.pc-toast-stack .win-infobar-content-root');
  const msg = document.querySelector('.pc-toast-stack .win-infobar-message');
  const layout = document.querySelector('.pc-toast-stack .win-infobar-layout');
  const box = document.querySelector('.pc-toast-stack .win-infobar');
  if (!root) return 'none';
  const g = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: Math.round(r.width), bg: cs.backgroundColor, radius: cs.borderRadius, cols: cs.gridTemplateColumns.slice(0,50) }; };
  return JSON.stringify({
    box: g(box), root: g(root), layout: g(layout),
    message: { w: Math.round(msg.getBoundingClientRect().width), h: Math.round(msg.getBoundingClientRect().height), text: msg.textContent.trim(), fs: getComputedStyle(msg).fontSize },
    cardBgVar: getComputedStyle(document.querySelector('#pickcat-root')).getPropertyValue('--card-bg')
  }, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
