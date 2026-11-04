import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const U = "01a0faca-3c45-7654-bea1-4147d7af5165";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/profile/${U}` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const out = [];
  let n = document.querySelector('#pickcat-root .pc-profile-tabs .win-selector-bar');
  const tabsWrap = document.querySelector('#pickcat-root .pc-profile-tabs');
  const dump = (el, label) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { label, cls: String(el.className).slice(0, 44), bg: cs.backgroundColor, box: [Math.round(r.width), Math.round(r.height)] };
  };
  out.push(dump(tabsWrap, 'tabs wrapper'));
  out.push(dump(document.querySelector('#pickcat-root .pc-profile-tabs .win-selector-bar'), 'selector bar'));
  out.push(dump(document.querySelector('#pickcat-root .pc-profile-tabs .win-items-view'), 'items view'));
  out.push(dump(document.querySelector('#pickcat-root .pc-profile-tabs .win-scroll-presenter'), 'presenter'));
  return JSON.stringify(out, null, 1);
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
