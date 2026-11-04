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
  const t = document.querySelector('.pc-toast-stack .win-infobar');
  if (!t) return 'no toast';
  const dump = (el, d) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 48),
      box: [Math.round(r.width), Math.round(r.height)],
      disp: cs.display, dir: cs.flexDirection, radius: cs.borderRadius,
      kids: d < 3 ? [...el.children].map(c => dump(c, d + 1)) : []
    };
  };
  return JSON.stringify(dump(t, 0), null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
