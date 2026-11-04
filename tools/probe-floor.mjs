import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const TOPIC = "01a13aa9-f1d1-7698-9cc7-3ef02c726284";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/forum/post/${TOPIC}/2` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const el = document.getElementById('pc-post-2');
  const sc = document.querySelector('#pickcat-root .pc-page-scroll');
  const sc2 = document.querySelector('#pickcat-root .pc-page');
  return JSON.stringify({
    hasEl: !!el, hasScroller: !!sc,
    offsetTop: el?.offsetTop, offsetParent: el?.offsetParent?.className?.toString().slice(0,40),
    rectDelta: Math.round((el?.getBoundingClientRect().top ?? 0) - (sc?.getBoundingClientRect().top ?? 0)),
    scScrollTop: sc?.scrollTop, scScrollHeight: sc?.scrollHeight, scClientHeight: sc?.clientHeight,
    scrollable: sc ? getComputedStyle(sc).overflowY : null
  }, null, 1);
})()`));
// try the rect-based math manually
console.log("手动滚动后:", await ev(`(() => {
  const el = document.getElementById('pc-post-2');
  const sc = document.querySelector('#pickcat-root .pc-page-scroll');
  const top = sc.scrollTop + (el.getBoundingClientRect().top - sc.getBoundingClientRect().top) - 96;
  sc.scrollTo({ top, behavior: 'auto' });
  return JSON.stringify({ computedTop: Math.round(top), nowScrollTop: Math.round(sc.scrollTop), targetY: Math.round(el.getBoundingClientRect().top) });
})()`));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
